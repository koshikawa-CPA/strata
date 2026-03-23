/**
 * lib/db.ts
 * Supabase を使ったノートブックの読み書き。
 *
 * ロード戦略：5クエリで全レコードを一括取得しメモリ上でツリーを構築
 * セーブ戦略：バッチ upsert → 孤立レコードを削除（CASCADE で子孫も消える）
 * activeXxxId はUIステートのため DB には保存しない（ロード時は先頭要素を設定）
 */

import { supabase } from './supabase'
import { Notebook, Section, Page, Sheet, Block } from './types'
import { createNotebook } from './store'
import { v4 as uuidv4 } from 'uuid'

// ─── ブロックのシリアライズ / デシリアライズ ─────────────────────────────

function serializeBlock(
  block: Block,
  sheetId: string,
  userId: string,
  position: number,
) {
  const base = {
    id: block.id,
    sheet_id: sheetId,
    user_id: userId,
    type: block.type,
    position,
  }
  switch (block.type) {
    case 'title':
      return { ...base, content: { text: block.content } }
    case 'text': {
      let tiptap: object | null = null
      try { tiptap = block.content ? JSON.parse(block.content) : null } catch { /* ignore */ }
      return { ...base, content: { tiptap } }
    }
    case 'grid':
      return {
        ...base,
        content: {
          rows: block.rows,
          cols: block.cols,
          cells: block.cells,
          colWidths: block.colWidths,
          rowHeights: block.rowHeights,
        },
      }
    case 'divider':
      return { ...base, content: {} }
  }
}

function deserializeBlock(row: {
  id: string
  type: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: Record<string, any> | null
}): Block {
  const c = row.content ?? {}
  switch (row.type) {
    case 'title':
      return { id: row.id, type: 'title', content: c.text ?? '' }
    case 'text':
      return {
        id: row.id,
        type: 'text',
        content: c.tiptap ? JSON.stringify(c.tiptap) : '',
      }
    case 'grid':
      return {
        id: row.id,
        type: 'grid',
        rows: c.rows ?? 3,
        cols: c.cols ?? 4,
        cells: c.cells ?? [],
        colWidths: c.colWidths ?? [],
        rowHeights: c.rowHeights ?? [],
      }
    case 'divider':
    default:
      return { id: row.id, type: 'divider' }
  }
}

// ─── デフォルトデータ生成 ─────────────────────────────────────────────────

function makeDefaultBlocks(): Block[] {
  return [
    { id: uuidv4(), type: 'title', content: '' },
    { id: uuidv4(), type: 'text', content: '' },
  ]
}

function makeDefaultSheet(name = '1'): Sheet {
  return { id: uuidv4(), name, blocks: makeDefaultBlocks() }
}

function makeDefaultPage(name = 'Page 1'): Page {
  const sheet = makeDefaultSheet()
  return { id: uuidv4(), name, sheets: [sheet], activeSheetId: sheet.id }
}

function makeDefaultSection(name = 'Section 1'): Section {
  const page = makeDefaultPage()
  return {
    id: uuidv4(),
    name,
    color: '#556B2F',
    pages: [page],
    activePageId: page.id,
  }
}

// ─── ロード ───────────────────────────────────────────────────────────────

export async function loadNotebookFromDB(userId: string): Promise<Notebook> {
  // 1. ノートブック取得（なければ作成）
  const { data: nbRow } = await supabase
    .from('notebooks')
    .select('id')
    .eq('user_id', userId)
    .order('created_at')
    .limit(1)
    .maybeSingle()

  let notebookId: string
  if (nbRow) {
    notebookId = nbRow.id
  } else {
    const { data: newNb, error } = await supabase
      .from('notebooks')
      .insert({ user_id: userId, name: 'My Notebook' })
      .select('id')
      .single()
    if (error || !newNb) {
      console.error('[DB] ノートブック作成失敗:', error)
      return createNotebook()
    }
    notebookId = newNb.id
  }

  // 2. セクション一括取得
  const { data: sectionRows } = await supabase
    .from('sections')
    .select('id, name, color, position')
    .eq('notebook_id', notebookId)
    .order('position')

  if (!sectionRows?.length) {
    // DB が空 → デフォルト構造を返す（次の自動保存でDBへ書き込まれる）
    const sec = makeDefaultSection()
    return { id: notebookId, sections: [sec], activeSectionId: sec.id }
  }

  const sectionIds = sectionRows.map((s) => s.id)

  // 3. ページ一括取得
  const { data: pageRows } = await supabase
    .from('pages')
    .select('id, section_id, name, position')
    .in('section_id', sectionIds)
    .order('position')

  const pageIds = (pageRows ?? []).map((p) => p.id)

  // 4. シート一括取得
  const { data: sheetRows } = pageIds.length
    ? await supabase
        .from('sheets')
        .select('id, page_id, name, position')
        .in('page_id', pageIds)
        .order('position')
    : { data: [] as { id: string; page_id: string; name: string; position: number }[] }

  const sheetIds = (sheetRows ?? []).map((s) => s.id)

  // 5. ブロック一括取得
  const { data: blockRows } = sheetIds.length
    ? await supabase
        .from('blocks')
        .select('id, sheet_id, type, content, position')
        .in('sheet_id', sheetIds)
        .order('position')
    : { data: [] as { id: string; sheet_id: string; type: string; content: Record<string, unknown> | null; position: number }[] }

  // 6. メモリ上でツリーを構築
  const blocksBySheet = new Map<string, Block[]>()
  for (const b of blockRows ?? []) {
    if (!blocksBySheet.has(b.sheet_id)) blocksBySheet.set(b.sheet_id, [])
    blocksBySheet.get(b.sheet_id)!.push(deserializeBlock(b))
  }

  const sheetsByPage = new Map<string, Sheet[]>()
  for (const s of sheetRows ?? []) {
    if (!sheetsByPage.has(s.page_id)) sheetsByPage.set(s.page_id, [])
    const blocks = blocksBySheet.get(s.id) ?? makeDefaultBlocks()
    sheetsByPage.get(s.page_id)!.push({ id: s.id, name: s.name, blocks })
  }

  const pagesBySection = new Map<string, Page[]>()
  for (const p of pageRows ?? []) {
    if (!pagesBySection.has(p.section_id)) pagesBySection.set(p.section_id, [])
    const sheets = sheetsByPage.get(p.id) ?? [makeDefaultSheet()]
    pagesBySection.get(p.section_id)!.push({
      id: p.id,
      name: p.name,
      sheets,
      activeSheetId: sheets[0].id,
    })
  }

  const sections: Section[] = sectionRows.map((s) => {
    const pages = pagesBySection.get(s.id) ?? [makeDefaultPage()]
    return {
      id: s.id,
      name: s.name,
      color: s.color ?? '#556B2F',
      pages,
      activePageId: pages[0].id,
    }
  })

  return {
    id: notebookId,
    sections,
    activeSectionId: sections[0].id,
  }
}

// ─── セーブ ───────────────────────────────────────────────────────────────

export async function saveNotebookToDB(
  notebook: Notebook,
  userId: string,
): Promise<void> {
  const notebookId = notebook.id

  // ── ノートブック
  await supabase
    .from('notebooks')
    .upsert({ id: notebookId, user_id: userId, name: 'My Notebook' })

  // ── セクション
  const sectionRows = notebook.sections.map((s, i) => ({
    id: s.id,
    notebook_id: notebookId,
    user_id: userId,
    name: s.name,
    color: s.color,
    position: i,
  }))
  if (sectionRows.length) {
    const { error } = await supabase.from('sections').upsert(sectionRows)
    if (error) console.error('[DB] sections upsert:', error.message)
  }

  // ── ページ・シート・ブロック（一括で収集してから送信）
  const allPageRows: object[] = []
  const allSheetRows: object[] = []
  const allBlockRows: object[] = []

  for (const section of notebook.sections) {
    section.pages.forEach((page, pi) => {
      allPageRows.push({
        id: page.id,
        section_id: section.id,
        user_id: userId,
        name: page.name,
        position: pi,
      })
      page.sheets.forEach((sheet, si) => {
        allSheetRows.push({
          id: sheet.id,
          page_id: page.id,
          user_id: userId,
          name: sheet.name,
          position: si,
        })
        sheet.blocks.forEach((block, bi) => {
          allBlockRows.push(serializeBlock(block, sheet.id, userId, bi))
        })
      })
    })
  }

  if (allPageRows.length) {
    const { error } = await supabase.from('pages').upsert(allPageRows)
    if (error) console.error('[DB] pages upsert:', error.message)
  }
  if (allSheetRows.length) {
    const { error } = await supabase.from('sheets').upsert(allSheetRows)
    if (error) console.error('[DB] sheets upsert:', error.message)
  }
  if (allBlockRows.length) {
    const { error } = await supabase.from('blocks').upsert(allBlockRows)
    if (error) console.error('[DB] blocks upsert:', error.message)
  }

  // ── 孤立レコードの削除（CASCADE で子孫も自動削除）
  const currentSectionIds = notebook.sections.map((s) => s.id)
  const currentPageIds = notebook.sections.flatMap((s) => s.pages.map((p) => p.id))
  const currentSheetIds = notebook.sections.flatMap((s) =>
    s.pages.flatMap((p) => p.sheets.map((sh) => sh.id)),
  )
  const currentBlockIds = notebook.sections.flatMap((s) =>
    s.pages.flatMap((p) =>
      p.sheets.flatMap((sh) => sh.blocks.map((b) => b.id)),
    ),
  )

  await deleteOrphans('sections', 'notebook_id', notebookId, currentSectionIds)
  await deleteOrphans('pages', 'section_id', currentSectionIds, currentPageIds)
  await deleteOrphans('sheets', 'page_id', currentPageIds, currentSheetIds)
  await deleteOrphans('blocks', 'sheet_id', currentSheetIds, currentBlockIds)
}

/**
 * 親IDに紐づくレコードのうち、currentIds に含まれないものを削除する。
 * parentIds が配列の場合は `.in()` で絞り込む。
 */
async function deleteOrphans(
  table: string,
  parentCol: string,
  parentIds: string | string[],
  currentIds: string[],
) {
  // 現在の子IDを DB から取得して差分を計算
  const query = supabase.from(table).select('id')
  if (Array.isArray(parentIds)) {
    if (!parentIds.length) return
    query.in(parentCol, parentIds)
  } else {
    query.eq(parentCol, parentIds)
  }

  const { data } = await query
  if (!data?.length) return

  const staleIds = data.map((r: { id: string }) => r.id).filter((id) => !currentIds.includes(id))
  if (staleIds.length) {
    const { error } = await supabase.from(table).delete().in('id', staleIds)
    if (error) console.error(`[DB] ${table} delete orphans:`, error.message)
  }
}
