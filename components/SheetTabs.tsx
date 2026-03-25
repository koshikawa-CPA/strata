'use client'
import { useState, useCallback } from 'react'
import { Sheet } from '@/lib/types'
import ContextMenu from './ContextMenu'

interface Props {
  sheets: Sheet[]
  activeSheetId: string
  onSelect: (id: string) => void
  onAdd: () => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
}

export default function SheetTabs({ sheets, activeSheetId, onSelect, onAdd, onRename, onDelete }: Props) {
  const [menu, setMenu] = useState<{ x: number; y: number; sheetId: string } | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const handleContextMenu = useCallback((e: React.MouseEvent, sheetId: string) => {
    e.preventDefault()
    setMenu({ x: e.clientX, y: e.clientY, sheetId })
  }, [])

  const handleDeleteRequest = useCallback((sheetId: string) => {
    setMenu(null)
    setConfirmDeleteId(sheetId)
  }, [])

  const handleConfirmDelete = useCallback(() => {
    if (confirmDeleteId) {
      onDelete(confirmDeleteId)
      setConfirmDeleteId(null)
    }
  }, [confirmDeleteId, onDelete])

  const confirmTarget = sheets.find(s => s.id === confirmDeleteId)

  return (
    <>
      <div
        className="flex items-end gap-0.5 px-3 overflow-x-auto"
        style={{
          background: '#f9fafb',
          borderTop: '1px solid #e5e7eb',
          height: '34px',
          minHeight: '34px',
          flexShrink: 0,
        }}
      >
        {sheets.map((sheet) => {
          const isActive = activeSheetId === sheet.id
          return (
            <div key={sheet.id} className="relative flex items-end">
              {renaming === sheet.id ? (
                <input
                  autoFocus
                  defaultValue={sheet.name}
                  className="sheet-tab outline-none w-16 text-center text-xs border border-purple-400"
                  style={{ padding: '3px 6px', borderRadius: '3px 3px 0 0', height: '28px' }}
                  onBlur={(e) => { onRename(sheet.id, e.target.value || sheet.name); setRenaming(null) }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { onRename(sheet.id, (e.target as HTMLInputElement).value || sheet.name); setRenaming(null) }
                    if (e.key === 'Escape') setRenaming(null)
                  }}
                />
              ) : (
                <button
                  onClick={() => onSelect(sheet.id)}
                  onContextMenu={(e) => handleContextMenu(e, sheet.id)}
                  className={`sheet-tab ${isActive ? 'active' : ''}`}
                  style={{ height: '28px', paddingRight: isActive && sheets.length > 1 ? '20px' : undefined }}
                >
                  {sheet.name}
                </button>
              )}
              {isActive && sheets.length > 1 && renaming !== sheet.id && (
                <button
                  onClick={() => handleDeleteRequest(sheet.id)}
                  className="absolute right-0.5 bottom-1 flex items-center justify-center w-4 h-4 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-sm"
                  title="このシートを削除"
                  style={{ fontSize: '10px', lineHeight: 1 }}
                >
                  ×
                </button>
              )}
            </div>
          )
        })}

        {sheets.length < 32 && (
          <button
            onClick={onAdd}
            className="flex items-center justify-center w-7 h-7 text-purple-600 hover:bg-purple-50 rounded-sm mb-0.5 text-lg font-light"
            title="シートを追加"
          >
            +
          </button>
        )}

        {menu && (
          <ContextMenu
            x={menu.x}
            y={menu.y}
            onClose={() => setMenu(null)}
            items={[
              { label: '名前を変更', onClick: () => { setRenaming(menu.sheetId); setMenu(null) } },
              { label: '削除', onClick: () => handleDeleteRequest(menu.sheetId), danger: true },
            ]}
          />
        )}
      </div>

      {confirmDeleteId && confirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg shadow-xl p-6 w-80">
            <h3 className="text-sm font-semibold text-gray-800 mb-2">シートの削除</h3>
            <p className="text-sm text-gray-600 mb-4">
              「<span className="font-medium text-gray-800">{confirmTarget.name}</span>」を削除しますか？<br />
              <span className="text-xs text-red-500">この操作は元に戻せません。</span>
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-3 py-1.5 text-sm text-white bg-red-500 rounded hover:bg-red-600"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
