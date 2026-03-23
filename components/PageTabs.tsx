'use client'
import { useState, useCallback } from 'react'
import { Page } from '@/lib/types'
import ContextMenu from './ContextMenu'

interface Props {
  pages: Page[]
  activePageId: string
  onSelect: (id: string) => void
  onAdd: () => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
}

export default function PageTabs({ pages, activePageId, onSelect, onAdd, onRename, onDelete }: Props) {
  const [menu, setMenu] = useState<{ x: number; y: number; pageId: string } | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)

  const handleContextMenu = useCallback((e: React.MouseEvent, pageId: string) => {
    e.preventDefault()
    setMenu({ x: e.clientX, y: e.clientY, pageId })
  }, [])

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ borderRight: '1px solid #e5e7eb', background: '#fafafa', minWidth: '160px', width: '160px' }}>
      <div className="flex-1 overflow-y-auto">
        {pages.map((page) => (
          <div key={page.id}>
            {renaming === page.id ? (
              <input
                autoFocus
                defaultValue={page.name}
                className="w-full px-3 py-2 text-sm border border-purple-400 outline-none bg-white"
                onBlur={(e) => { onRename(page.id, e.target.value || page.name); setRenaming(null) }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { onRename(page.id, (e.target as HTMLInputElement).value || page.name); setRenaming(null) }
                  if (e.key === 'Escape') setRenaming(null)
                }}
              />
            ) : (
              <button
                onClick={() => onSelect(page.id)}
                onContextMenu={(e) => handleContextMenu(e, page.id)}
                className={`w-full text-left px-3 py-2.5 text-sm transition-colors border-l-4 ${
                  activePageId === page.id
                    ? 'bg-white border-l-purple-500 font-medium text-purple-900'
                    : 'border-l-transparent text-gray-600 hover:bg-gray-100'
                }`}
              >
                {page.name}
              </button>
            )}
          </div>
        ))}
      </div>

      {pages.length < 32 && (
        <button
          onClick={onAdd}
          className="flex items-center gap-1 px-3 py-2 text-xs text-purple-600 hover:bg-purple-50 border-t border-gray-200"
        >
          <span className="text-base font-light">+</span> ページを追加
        </button>
      )}

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          items={[
            { label: '名前を変更', onClick: () => { setRenaming(menu.pageId); setMenu(null) } },
            { label: '削除', onClick: () => { onDelete(menu.pageId); setMenu(null) }, danger: true },
          ]}
        />
      )}
    </div>
  )
}
