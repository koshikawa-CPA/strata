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

  const handleContextMenu = useCallback((e: React.MouseEvent, sheetId: string) => {
    e.preventDefault()
    setMenu({ x: e.clientX, y: e.clientY, sheetId })
  }, [])

  return (
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
      {sheets.map((sheet) => (
        <div key={sheet.id}>
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
              className={`sheet-tab ${activeSheetId === sheet.id ? 'active' : ''}`}
              style={{ height: '28px' }}
            >
              {sheet.name}
            </button>
          )}
        </div>
      ))}

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
            { label: '削除', onClick: () => { onDelete(menu.sheetId); setMenu(null) }, danger: true },
          ]}
        />
      )}
    </div>
  )
}
