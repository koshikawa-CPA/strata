'use client'
import { useState, useCallback } from 'react'
import { Section } from '@/lib/types'
import ContextMenu from './ContextMenu'
import ColorPicker from './ColorPicker'

interface Props {
  sections: Section[]
  activeSectionId: string
  onSelect: (id: string) => void
  onAdd: () => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
  onColorChange: (id: string, color: string) => void
}

export default function SectionTabs({
  sections, activeSectionId, onSelect, onAdd, onRename, onDelete, onColorChange
}: Props) {
  const [menu, setMenu] = useState<{ x: number; y: number; sectionId: string } | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null)

  const handleContextMenu = useCallback((e: React.MouseEvent, sectionId: string) => {
    e.preventDefault()
    setMenu({ x: e.clientX, y: e.clientY, sectionId })
  }, [])

  const handleRename = useCallback((id: string) => {
    setRenaming(id)
    setMenu(null)
  }, [])

  return (
    <div className="flex items-end gap-1 px-4 overflow-x-auto" style={{ borderBottom: '1px solid #e5e7eb' }}>
      {sections.map((section) => (
        <div key={section.id} className="relative">
          {renaming === section.id ? (
            <input
              autoFocus
              defaultValue={section.name}
              className="section-tab border border-purple-400 outline-none text-sm px-2 py-1 rounded"
              onBlur={(e) => { onRename(section.id, e.target.value || section.name); setRenaming(null) }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { onRename(section.id, (e.target as HTMLInputElement).value || section.name); setRenaming(null) }
                if (e.key === 'Escape') setRenaming(null)
              }}
            />
          ) : (
            <button
              className={`section-tab ${activeSectionId === section.id ? 'active' : 'hover:bg-gray-100'}`}
              style={activeSectionId === section.id ? { borderTopColor: section.color, borderTopWidth: '3px' } : {}}
              onClick={() => onSelect(section.id)}
              onContextMenu={(e) => handleContextMenu(e, section.id)}
            >
              <span
                className="inline-block w-2 h-2 rounded-full mr-2"
                style={{ background: section.color }}
              />
              {section.name}
            </button>
          )}
        </div>
      ))}

      {sections.length < 32 && (
        <button
          onClick={onAdd}
          className="px-3 py-1 text-purple-600 hover:bg-purple-50 rounded text-lg font-light mb-0.5"
          title="セクションを追加"
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
            { label: '名前を変更', onClick: () => handleRename(menu.sectionId) },
            { label: '色を変更', onClick: () => { setShowColorPicker(menu.sectionId); setMenu(null) } },
            { label: '削除', onClick: () => { onDelete(menu.sectionId); setMenu(null) }, danger: true },
          ]}
        />
      )}

      {showColorPicker && (
        <div className="fixed z-50 bg-white border border-gray-200 rounded shadow-lg" style={{ left: 200, top: 60 }}>
          <ColorPicker
            value={sections.find(s => s.id === showColorPicker)?.color || '#556B2F'}
            onChange={(color) => onColorChange(showColorPicker!, color)}
            onClose={() => setShowColorPicker(null)}
          />
        </div>
      )}
    </div>
  )
}
