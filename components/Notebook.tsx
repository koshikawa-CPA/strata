'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Notebook as NotebookType, Section, Page, Block } from '@/lib/types'
import { loadNotebook as loadFromLocalStorage, saveNotebook as saveToLocalStorage, createSection, createPage, createSheet } from '@/lib/store'
import { loadNotebookFromDB, saveNotebookToDB } from '@/lib/db'
import Logo from './Logo'
import SectionTabs from './SectionTabs'
import PageTabs from './PageTabs'
import SheetTabs from './SheetTabs'
import BlockContainer from './BlockContainer'
import { supabase } from '@/lib/supabase'

// Supabase が設定済みかどうか
const isSupabaseConfigured = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  return url.length > 0 && !url.includes('xxxxxxxxxxxxxxxxxxxx')
})()

export default function NotebookApp() {
  const router = useRouter()
  const [notebook, setNotebook] = useState<NotebookType | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'local'>('saved')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── 初期ロード
  useEffect(() => {
    const init = async () => {
      if (isSupabaseConfigured) {
        const { data: { session } } = await supabase.auth.getSession()
        const uid = session?.user?.id ?? null
        const email = session?.user?.email ?? null
        setUserEmail(email)
        setUserId(uid)

        if (uid) {
          console.log('[Notebook] Supabase からロード中...')
          try {
            const nb = await loadNotebookFromDB(uid)
            console.log('[Notebook] ロード完了:', nb.sections.length, 'sections')
            setNotebook(nb)
          } catch (e) {
            console.error('[Notebook] DBロード失敗、localStorage にフォールバック:', e)
            setNotebook(loadFromLocalStorage())
          }
        } else {
          // 未ログイン（middleware がリダイレクトするはずだが念のため）
          setNotebook(loadFromLocalStorage())
        }
      } else {
        // Supabase 未設定 → localStorage
        setSaveStatus('local')
        setNotebook(loadFromLocalStorage())
      }
    }
    init()
  }, [])

  // ── 自動保存
  const scheduleAutoSave = useCallback((nb: NotebookType, uid: string | null) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      if (isSupabaseConfigured && uid) {
        setSaveStatus('saving')
        try {
          await saveNotebookToDB(nb, uid)
          setSaveStatus('saved')
          console.log('[Notebook] DB 保存完了')
        } catch (e) {
          console.error('[Notebook] DB 保存失敗:', e)
          setSaveStatus('saved') // エラーでも UI は戻す
        }
      } else {
        saveToLocalStorage(nb)
        // local モードはステータス変えない
      }
    }, 3000)
  }, [])

  const update = useCallback((nb: NotebookType) => {
    setNotebook(nb)
    setSaveStatus(isSupabaseConfigured ? 'saving' : 'local')
    scheduleAutoSave(nb, userId)
  }, [scheduleAutoSave, userId])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (!notebook) return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-gray-400 text-sm">読み込み中...</div>
    </div>
  )

  const activeSection = notebook.sections.find(s => s.id === notebook.activeSectionId) ?? notebook.sections[0]
  const activePage = activeSection.pages.find(p => p.id === activeSection.activePageId) ?? activeSection.pages[0]
  const activeSheet = activePage.sheets.find(s => s.id === activePage.activeSheetId) ?? activePage.sheets[0]

  // ── Section 操作
  const addSection = () => {
    if (notebook.sections.length >= 32) return
    const section = createSection(`Section ${notebook.sections.length + 1}`)
    update({ ...notebook, sections: [...notebook.sections, section], activeSectionId: section.id })
  }
  const selectSection = (id: string) => update({ ...notebook, activeSectionId: id })
  const renameSection = (id: string, name: string) =>
    update({ ...notebook, sections: notebook.sections.map(s => s.id === id ? { ...s, name } : s) })
  const deleteSection = (id: string) => {
    if (notebook.sections.length <= 1) return
    const sections = notebook.sections.filter(s => s.id !== id)
    update({ ...notebook, sections, activeSectionId: notebook.activeSectionId === id ? sections[0].id : notebook.activeSectionId })
  }
  const changeSectionColor = (id: string, color: string) =>
    update({ ...notebook, sections: notebook.sections.map(s => s.id === id ? { ...s, color } : s) })

  // ── Page 操作
  const updateSection = (section: Section) =>
    update({ ...notebook, sections: notebook.sections.map(s => s.id === section.id ? section : s) })

  const addPage = () => {
    if (activeSection.pages.length >= 32) return
    const page = createPage(`Page ${activeSection.pages.length + 1}`)
    updateSection({ ...activeSection, pages: [...activeSection.pages, page], activePageId: page.id })
  }
  const selectPage = (id: string) => updateSection({ ...activeSection, activePageId: id })
  const renamePage = (id: string, name: string) =>
    updateSection({ ...activeSection, pages: activeSection.pages.map(p => p.id === id ? { ...p, name } : p) })
  const deletePage = (id: string) => {
    if (activeSection.pages.length <= 1) return
    const pages = activeSection.pages.filter(p => p.id !== id)
    updateSection({ ...activeSection, pages, activePageId: activeSection.activePageId === id ? pages[0].id : activeSection.activePageId })
  }

  // ── Sheet 操作
  const updatePage = (page: Page) =>
    updateSection({ ...activeSection, pages: activeSection.pages.map(p => p.id === page.id ? page : p) })

  const addSheet = () => {
    if (activePage.sheets.length >= 32) return
    const sheet = createSheet(String(activePage.sheets.length + 1))
    updatePage({ ...activePage, sheets: [...activePage.sheets, sheet], activeSheetId: sheet.id })
  }
  const selectSheet = (id: string) => updatePage({ ...activePage, activeSheetId: id })
  const renameSheet = (id: string, name: string) =>
    updatePage({ ...activePage, sheets: activePage.sheets.map(s => s.id === id ? { ...s, name } : s) })
  const deleteSheet = (id: string) => {
    if (activePage.sheets.length <= 1) return
    const sheets = activePage.sheets.filter(s => s.id !== id)
    updatePage({ ...activePage, sheets, activeSheetId: activePage.activeSheetId === id ? sheets[0].id : activePage.activeSheetId })
  }

  // ── Block 操作
  const updateBlocks = (blocks: Block[]) =>
    updatePage({ ...activePage, sheets: activePage.sheets.map(s => s.id === activeSheet.id ? { ...s, blocks } : s) })

  // ── 保存ステータス表示
  const statusLabel =
    saveStatus === 'saving' ? '保存中...' :
    saveStatus === 'local' ? 'ローカル保存' :
    '自動保存'

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white">
      {/* ヘッダー */}
      <div
        className="flex items-center px-4 py-2 border-b border-gray-200"
        style={{ background: 'linear-gradient(135deg, #f4f6ef 0%, #edf1e5 100%)', minHeight: '48px' }}
      >
        <Logo />
        <div className="ml-auto flex items-center gap-3">
          <span className={`text-xs ${saveStatus === 'saving' ? 'text-[#6b8a3a] animate-pulse' : 'text-gray-400'}`}>
            {statusLabel}
          </span>
          {userEmail && (
            <>
              <span className="text-xs text-gray-500 hidden sm:inline">{userEmail}</span>
              <button
                onClick={handleLogout}
                className="text-xs text-[#556B2F] hover:text-[#435626] border border-[#6b8a3a] hover:border-[#435626] rounded px-2 py-1 transition-colors"
              >
                ログアウト
              </button>
            </>
          )}
        </div>
      </div>

      {/* 第1層：セクションタブ */}
      <div style={{ background: '#f9fafb' }}>
        <SectionTabs
          sections={notebook.sections}
          activeSectionId={notebook.activeSectionId}
          onSelect={selectSection}
          onAdd={addSection}
          onRename={renameSection}
          onDelete={deleteSection}
          onColorChange={changeSectionColor}
        />
      </div>

      {/* メインエリア */}
      <div className="flex flex-1 overflow-hidden">
        {/* 第2層：ページタブ */}
        <PageTabs
          pages={activeSection.pages}
          activePageId={activeSection.activePageId}
          onSelect={selectPage}
          onAdd={addPage}
          onRename={renamePage}
          onDelete={deletePage}
        />

        {/* エディタエリア */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <div className="py-8 pr-8" style={{ paddingLeft: '52px' }}>
              {activeSheet && (
                <BlockContainer
                  blocks={activeSheet.blocks}
                  onChange={updateBlocks}
                />
              )}
            </div>
          </div>

          {/* 第3層：シートタブ */}
          {activePage && (
            <SheetTabs
              sheets={activePage.sheets}
              activeSheetId={activePage.activeSheetId}
              onSelect={selectSheet}
              onAdd={addSheet}
              onRename={renameSheet}
              onDelete={deleteSheet}
            />
          )}

          {/* フッター */}
          <div
            className="text-center text-xs text-gray-400 py-1 select-none"
            style={{ borderTop: '1px solid #6b8a3a' }}
          >
            Strata Note Ver.1 　©2026 ABC LLC. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  )
}
