'use client'
import { useState, useCallback, useRef } from 'react'
import { GridBlock as GridBlockType, GridCell, CellContent } from '@/lib/types'
import ContextMenu from './ContextMenu'
import { v4 as uuidv4 } from 'uuid'

interface Props {
  block: GridBlockType
  onChange: (block: GridBlockType) => void
}

const MIN_COL_WIDTH = 60
const MIN_ROW_HEIGHT = 32
const DEFAULT_COL_WIDTH = 120
const DEFAULT_ROW_HEIGHT = 40

// ────────────────────────────────────────
// ファイルアップロードヘルパー
// ────────────────────────────────────────
async function uploadFile(file: File): Promise<{ url: string; storagePath?: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const isConfigured =
    supabaseUrl.length > 0 && !supabaseUrl.includes('xxxxxxxxxxxxxxxxxxxx')

  if (isConfigured) {
    try {
      const { supabase } = await import('@/lib/supabase')
      const { data: { user } } = await supabase.auth.getUser()
      const uid = user?.id ?? 'anon'
      const storagePath = `${uid}/${Date.now()}_${file.name}`
      const { error } = await supabase.storage.from('attachments').upload(storagePath, file)
      if (!error) {
        const { data } = await supabase.storage
          .from('attachments')
          .createSignedUrl(storagePath, 60 * 60)
        if (data?.signedUrl) return { url: data.signedUrl, storagePath }
      }
    } catch {
      // fallthrough
    }
  }

  if (file.type.startsWith('image/')) {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve({ url: reader.result as string })
      reader.readAsDataURL(file)
    })
  }
  return { url: URL.createObjectURL(file) }
}

async function deleteFromStorage(storagePath: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const isConfigured =
    supabaseUrl.length > 0 && !supabaseUrl.includes('xxxxxxxxxxxxxxxxxxxx')
  if (!isConfigured) return
  try {
    const { supabase } = await import('@/lib/supabase')
    await supabase.storage.from('attachments').remove([storagePath])
  } catch { /* ignore */ }
}

// ────────────────────────────────────────
// ファイル種別アイコン
// ────────────────────────────────────────
function getFileIcon(fileType: string): string {
  if (fileType.includes('pdf')) return '📄'
  if (fileType.includes('word') || fileType.includes('doc')) return '📝'
  if (fileType.includes('excel') || fileType.includes('sheet') || fileType.includes('xlsx')) return '📊'
  return '📎'
}

// ────────────────────────────────────────
// セル内ファイル表示コンポーネント
// ────────────────────────────────────────
function CellFileView({
  content, rowHeight, onAttach, onDelete,
}: {
  content: CellContent
  rowHeight: number
  onAttach: () => void
  onDelete: () => void
}) {
  const height = Math.max(rowHeight, MIN_ROW_HEIGHT)

  if (content.type === 'image') {
    return (
      <div className="relative w-full group/img" style={{ height }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={content.url}
          alt={content.alt ?? ''}
          className="w-full h-full object-contain cursor-pointer"
          onClick={() => window.open(content.url, '_blank')}
          title="クリックで拡大表示"
        />
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="absolute top-1 left-1 opacity-0 group-hover/img:opacity-100 transition-opacity w-5 h-5 flex items-center justify-center bg-white/90 text-red-500 hover:text-red-700 rounded border border-red-200 text-xs font-bold"
          title="削除"
        >×</button>
        <button
          onClick={(e) => { e.stopPropagation(); onAttach() }}
          className="absolute bottom-1 right-1 opacity-0 group-hover/img:opacity-100 transition-opacity bg-white/80 text-gray-600 hover:text-gray-900 text-xs rounded px-1 py-0.5 border border-gray-300"
          title="画像を差し替え"
        >差替</button>
      </div>
    )
  }

  if (content.type === 'file') {
    return (
      <div className="relative group/file w-full" style={{ height }}>
        <a
          href={content.url}
          download={content.name}
          target="_blank"
          rel="noreferrer"
          className="flex flex-col items-center justify-center gap-1 p-2 w-full h-full hover:bg-green-50 transition-colors"
          title={`${content.name} をダウンロード`}
        >
          <span className="text-2xl">{getFileIcon(content.fileType)}</span>
          <span className="text-xs text-center text-gray-600 break-all leading-tight">{content.name}</span>
        </a>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="absolute top-1 right-1 opacity-0 group-hover/file:opacity-100 transition-opacity w-5 h-5 flex items-center justify-center bg-white text-red-500 hover:text-red-700 rounded border border-red-200 text-xs font-bold"
          title="削除"
        >×</button>
      </div>
    )
  }

  return null
}

// ────────────────────────────────────────
// メインコンポーネント
// ────────────────────────────────────────
export default function GridBlockComponent({ block, onChange }: Props) {
  const [selectedRow, setSelectedRow] = useState<number | null>(null)
  const [selectedCol, setSelectedCol] = useState<number | null>(null)
  const [contextMenu, setContextMenu] = useState<{
    x: number; y: number; type: 'row' | 'col'; index: number
  } | null>(null)
  const [cellSelected, setCellSelected] = useState<{ r: number; c: number } | null>(null)
  const [uploading, setUploading] = useState<{ r: number; c: number } | null>(null)
  const [dragOver, setDragOver] = useState<{ r: number; c: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingCell = useRef<{ r: number; c: number } | null>(null)
  const dragCol = useRef<{ index: number; startX: number; startWidth: number } | null>(null)
  const dragRow = useRef<{ index: number; startY: number; startHeight: number } | null>(null)

  const getCell = (r: number, c: number) =>
    block.cells.find((cell) => cell.rowIndex === r && cell.colIndex === c && !cell.merged)

  const updateCell = useCallback((r: number, c: number, content: CellContent) => {
    const cells = block.cells.map((cell) =>
      cell.rowIndex === r && cell.colIndex === c ? { ...cell, content } : cell
    )
    onChange({ ...block, cells })
  }, [block, onChange])

  const deleteAttachment = useCallback((r: number, c: number) => {
    const cell = block.cells.find((cell) => cell.rowIndex === r && cell.colIndex === c)
    if (cell && cell.content.type !== 'text' && cell.content.storagePath) {
      deleteFromStorage(cell.content.storagePath)
    }
    updateCell(r, c, { type: 'text', value: '' })
  }, [block, updateCell])

  // ────────────── ファイル操作 ──────────────
  const processFile = useCallback(async (file: File, r: number, c: number) => {
    setUploading({ r, c })
    try {
      const { url, storagePath } = await uploadFile(file)
      if (file.type.startsWith('image/')) {
        updateCell(r, c, { type: 'image', url, alt: file.name, storagePath })
      } else {
        updateCell(r, c, { type: 'file', url, name: file.name, fileType: file.type, storagePath })
      }
    } finally {
      setUploading(null)
    }
  }, [updateCell])

  const openFilePicker = (r: number, c: number) => {
    pendingCell.current = { r, c }
    fileInputRef.current?.click()
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !pendingCell.current) return
    processFile(file, pendingCell.current.r, pendingCell.current.c)
    e.target.value = ''
  }

  const handleDragOver = (r: number, c: number, e: React.DragEvent) => {
    e.preventDefault(); setDragOver({ r, c })
  }
  const handleDragLeave = () => setDragOver(null)
  const handleDrop = (r: number, c: number, e: React.DragEvent) => {
    e.preventDefault(); setDragOver(null)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file, r, c)
  }

  // ────────────── 行・列の追加削除・挿入 ──────────────
  const addRow = () => {
    if (block.rows >= 32) return
    const newCells: GridCell[] = Array.from({ length: block.cols }, (_, c) => ({
      id: uuidv4(), rowIndex: block.rows, colIndex: c,
      rowSpan: 1, colSpan: 1, content: { type: 'text', value: '' },
    }))
    onChange({
      ...block, rows: block.rows + 1,
      cells: [...block.cells, ...newCells],
      rowHeights: [...block.rowHeights, DEFAULT_ROW_HEIGHT],
    })
  }

  const addCol = () => {
    if (block.cols >= 16) return
    const newCells: GridCell[] = Array.from({ length: block.rows }, (_, r) => ({
      id: uuidv4(), rowIndex: r, colIndex: block.cols,
      rowSpan: 1, colSpan: 1, content: { type: 'text', value: '' },
    }))
    onChange({
      ...block, cols: block.cols + 1,
      cells: [...block.cells, ...newCells],
      colWidths: [...block.colWidths, DEFAULT_COL_WIDTH],
    })
  }

  // position の位置に行を挿入（それ以降の行インデックスを +1）
  const insertRow = (position: number) => {
    if (block.rows >= 32) return
    const newCells: GridCell[] = Array.from({ length: block.cols }, (_, c) => ({
      id: uuidv4(), rowIndex: position, colIndex: c,
      rowSpan: 1, colSpan: 1, content: { type: 'text', value: '' },
    }))
    const shifted = block.cells.map((cell) =>
      cell.rowIndex >= position ? { ...cell, rowIndex: cell.rowIndex + 1 } : cell
    )
    const rowHeights = [...block.rowHeights]
    rowHeights.splice(position, 0, DEFAULT_ROW_HEIGHT)
    onChange({ ...block, rows: block.rows + 1, cells: [...shifted, ...newCells], rowHeights })
    setSelectedRow(null)
  }

  // position の位置に列を挿入（それ以降の列インデックスを +1）
  const insertCol = (position: number) => {
    if (block.cols >= 16) return
    const newCells: GridCell[] = Array.from({ length: block.rows }, (_, r) => ({
      id: uuidv4(), rowIndex: r, colIndex: position,
      rowSpan: 1, colSpan: 1, content: { type: 'text', value: '' },
    }))
    const shifted = block.cells.map((cell) =>
      cell.colIndex >= position ? { ...cell, colIndex: cell.colIndex + 1 } : cell
    )
    const colWidths = [...block.colWidths]
    colWidths.splice(position, 0, DEFAULT_COL_WIDTH)
    onChange({ ...block, cols: block.cols + 1, cells: [...shifted, ...newCells], colWidths })
    setSelectedCol(null)
  }

  const deleteRow = (rowIdx: number) => {
    if (block.rows <= 1) return
    const cells = block.cells
      .filter((c) => c.rowIndex !== rowIdx)
      .map((c) => c.rowIndex > rowIdx ? { ...c, rowIndex: c.rowIndex - 1 } : c)
    onChange({ ...block, rows: block.rows - 1, cells, rowHeights: block.rowHeights.filter((_, i) => i !== rowIdx) })
    setSelectedRow(null)
  }

  const deleteCol = (colIdx: number) => {
    if (block.cols <= 1) return
    const cells = block.cells
      .filter((c) => c.colIndex !== colIdx)
      .map((c) => c.colIndex > colIdx ? { ...c, colIndex: c.colIndex - 1 } : c)
    onChange({ ...block, cols: block.cols - 1, cells, colWidths: block.colWidths.filter((_, i) => i !== colIdx) })
    setSelectedCol(null)
  }

  // ────────────── リサイズ ──────────────
  const handleColResize = (colIdx: number, e: React.MouseEvent) => {
    e.preventDefault()
    dragCol.current = { index: colIdx, startX: e.clientX, startWidth: block.colWidths[colIdx] }
    const onMove = (me: MouseEvent) => {
      if (!dragCol.current) return
      const colWidths = [...block.colWidths]
      colWidths[dragCol.current.index] = Math.max(
        MIN_COL_WIDTH, dragCol.current.startWidth + me.clientX - dragCol.current.startX
      )
      onChange({ ...block, colWidths })
    }
    const onUp = () => {
      dragCol.current = null
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  const handleRowResize = (rowIdx: number, e: React.MouseEvent) => {
    e.preventDefault()
    dragRow.current = { index: rowIdx, startY: e.clientY, startHeight: block.rowHeights[rowIdx] }
    const onMove = (me: MouseEvent) => {
      if (!dragRow.current) return
      const rowHeights = [...block.rowHeights]
      rowHeights[dragRow.current.index] = Math.max(
        MIN_ROW_HEIGHT, dragRow.current.startHeight + me.clientY - dragRow.current.startY
      )
      onChange({ ...block, rowHeights })
    }
    const onUp = () => {
      dragRow.current = null
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  // ────────────── コンテキストメニュー項目 ──────────────
  const contextMenuItems = contextMenu
    ? contextMenu.type === 'row'
      ? [
          { label: '上に行を挿入', onClick: () => insertRow(contextMenu.index) },
          { label: '下に行を挿入', onClick: () => insertRow(contextMenu.index + 1) },
          { label: '行を削除', onClick: () => deleteRow(contextMenu.index), danger: true },
        ]
      : [
          { label: '左に列を挿入', onClick: () => insertCol(contextMenu.index) },
          { label: '右に列を挿入', onClick: () => insertCol(contextMenu.index + 1) },
          { label: '列を削除', onClick: () => deleteCol(contextMenu.index), danger: true },
        ]
    : []

  return (
    <div
      className="overflow-auto border border-gray-200 rounded bg-white"
      onClick={() => { setSelectedRow(null); setSelectedCol(null) }}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
        onChange={handleFileInputChange}
      />

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onClose={() => setContextMenu(null)}
        />
      )}

      <table className="border-collapse" style={{ tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '32px' }} />
          {block.colWidths.map((w, i) => <col key={i} style={{ width: w + 'px' }} />)}
          <col style={{ width: '28px' }} />
        </colgroup>

        <thead>
          <tr>
            {/* 左上の空セル */}
            <th className="border border-gray-200 bg-gray-100 w-8" />

            {/* 列ヘッダー */}
            {block.colWidths.map((_, c) => {
              const isColSelected = selectedCol === c
              return (
                <th
                  key={c}
                  className={`border text-xs font-normal relative select-none cursor-pointer transition-colors ${
                    isColSelected
                      ? 'bg-[#c9d9b4] text-[#283417] border-[#6b8a3a]'
                      : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
                  }`}
                  style={{ height: '24px', padding: '0 4px', minWidth: MIN_COL_WIDTH }}
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedCol(isColSelected ? null : c)
                    setSelectedRow(null)
                    setCellSelected(null)
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setSelectedCol(c)
                    setSelectedRow(null)
                    setContextMenu({ x: e.clientX, y: e.clientY, type: 'col', index: c })
                  }}
                >
                  {String.fromCharCode(65 + c)}
                  {/* 列幅リサイズハンドル */}
                  <div
                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#6b8a3a] z-10"
                    onMouseDown={(e) => { e.stopPropagation(); handleColResize(c, e) }}
                  />
                </th>
              )
            })}

            {/* 列追加ボタン */}
            <th className="border border-gray-200 bg-gray-100">
              {block.cols < 16 && (
                <button
                  onClick={(e) => { e.stopPropagation(); addCol() }}
                  className="w-full h-full text-gray-400 hover:text-[#556B2F] hover:bg-gray-200 text-base leading-none transition-colors"
                  title="列を追加"
                >+</button>
              )}
            </th>
          </tr>
        </thead>

        <tbody>
          {Array.from({ length: block.rows }, (_, r) => {
            const isRowSelected = selectedRow === r
            return (
              <tr key={r} style={{ height: block.rowHeights[r] + 'px' }}>
                {/* 行番号 */}
                <td
                  className={`border text-xs text-center relative select-none cursor-pointer transition-colors ${
                    isRowSelected
                      ? 'bg-[#c9d9b4] text-[#283417] border-[#6b8a3a] font-semibold'
                      : 'bg-gray-100 text-gray-400 border-gray-200 hover:bg-gray-200'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedRow(isRowSelected ? null : r)
                    setSelectedCol(null)
                    setCellSelected(null)
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setSelectedRow(r)
                    setSelectedCol(null)
                    setContextMenu({ x: e.clientX, y: e.clientY, type: 'row', index: r })
                  }}
                >
                  {r + 1}
                  {/* 行高さリサイズハンドル */}
                  <div
                    className="absolute bottom-0 left-0 right-0 h-1 cursor-row-resize hover:bg-[#6b8a3a] z-10"
                    onMouseDown={(e) => { e.stopPropagation(); handleRowResize(r, e) }}
                  />
                </td>

                {/* データセル */}
                {Array.from({ length: block.cols }, (_, c) => {
                  const cell = getCell(r, c)
                  if (!cell || cell.merged) return null
                  const isCellSelected = cellSelected?.r === r && cellSelected?.c === c
                  const isDragTarget = dragOver?.r === r && dragOver?.c === c
                  const isUploading = uploading?.r === r && uploading?.c === c
                  const isHighlighted = selectedRow === r || selectedCol === c

                  return (
                    <td
                      key={c}
                      rowSpan={cell.rowSpan}
                      colSpan={cell.colSpan}
                      className={`border relative align-top p-0 grid-cell transition-colors ${
                        isDragTarget
                          ? 'border-[#6b8a3a] bg-[#e5ecda]'
                          : isCellSelected
                          ? 'border-gray-200 ring-2 ring-[#556B2F] ring-inset'
                          : isHighlighted
                          ? 'bg-[#f4f6ef] border-gray-200'
                          : 'border-gray-200'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        setCellSelected({ r, c })
                        setSelectedRow(null)
                        setSelectedCol(null)
                      }}
                      onDragOver={(e) => handleDragOver(r, c, e)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(r, c, e)}
                    >
                      {isUploading && (
                        <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
                          <span className="text-xs text-[#556B2F] animate-pulse">アップロード中...</span>
                        </div>
                      )}
                      {isDragTarget && (
                        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                          <span className="text-xs text-[#556B2F] font-medium bg-white/90 rounded px-2 py-1">
                            ここにドロップ
                          </span>
                        </div>
                      )}

                      {cell.content.type === 'text' && (
                        <div className="relative w-full h-full group/cell">
                          <textarea
                            value={cell.content.value}
                            onChange={(e) => updateCell(r, c, { type: 'text', value: e.target.value })}
                            className="w-full h-full resize-none outline-none text-sm p-1 bg-transparent"
                            style={{ minHeight: (block.rowHeights[r] || DEFAULT_ROW_HEIGHT) + 'px' }}
                          />
                          {isCellSelected && (
                            <button
                              onClick={(e) => { e.stopPropagation(); openFilePicker(r, c) }}
                              className="absolute bottom-1 right-1 text-gray-400 hover:text-[#556B2F] transition-colors bg-white rounded border border-gray-200 px-1 py-0.5"
                              style={{ fontSize: '11px', lineHeight: 1.2 }}
                              title="ファイルを添付（PDF・Excel・Word・画像）"
                            >📎</button>
                          )}
                        </div>
                      )}

                      {cell.content.type !== 'text' && (
                        <CellFileView
                          content={cell.content}
                          rowHeight={block.rowHeights[r] || DEFAULT_ROW_HEIGHT}
                          onAttach={() => openFilePicker(r, c)}
                          onDelete={() => deleteAttachment(r, c)}
                        />
                      )}
                    </td>
                  )
                })}

                <td className="border border-gray-200 bg-gray-100 w-7" />
              </tr>
            )
          })}

          {/* 行追加ボタン行 */}
          <tr>
            <td className="border border-gray-200 bg-gray-100 text-center">
              {block.rows < 32 && (
                <button
                  onClick={(e) => { e.stopPropagation(); addRow() }}
                  className="w-full text-gray-400 hover:text-[#556B2F] hover:bg-gray-200 text-base leading-none transition-colors"
                  title="行を追加"
                >+</button>
              )}
            </td>
            {Array.from({ length: block.cols + 1 }, (_, i) => (
              <td key={i} className="border border-gray-200 bg-gray-100" />
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}
