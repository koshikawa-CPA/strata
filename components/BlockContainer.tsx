'use client'
import { useRef } from 'react'
import { Block, GridBlock as GridBlockType } from '@/lib/types'
import TitleBlock from './TitleBlock'
import TextEditor from './TextEditor'
import GridBlockComponent from './GridBlock'
import { v4 as uuidv4 } from 'uuid'

interface Props {
  blocks: Block[]
  onChange: (blocks: Block[]) => void
}

const DEFAULT_COL_WIDTH = 120
const DEFAULT_ROW_HEIGHT = 40

function createGridBlock(): GridBlockType {
  const rows = 3
  const cols = 4
  const cells = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({ id: uuidv4(), rowIndex: r, colIndex: c, rowSpan: 1, colSpan: 1, content: { type: 'text' as const, value: '' } })
    }
  }
  return {
    id: uuidv4(),
    type: 'grid',
    rows,
    cols,
    cells,
    colWidths: Array(cols).fill(DEFAULT_COL_WIDTH),
    rowHeights: Array(rows).fill(DEFAULT_ROW_HEIGHT),
  }
}

export default function BlockContainer({ blocks, onChange }: Props) {
  const dragIdx = useRef<number | null>(null)
  const dragOverIdx = useRef<number | null>(null)

  const updateBlock = (idx: number, block: Block) => {
    const newBlocks = [...blocks]
    newBlocks[idx] = block
    onChange(newBlocks)
  }

  const deleteBlock = (idx: number) => {
    onChange(blocks.filter((_, i) => i !== idx))
  }

  const addBlock = (afterIdx: number, type: 'text' | 'grid' | 'divider') => {
    const newBlocks = [...blocks]
    let newBlock: Block
    if (type === 'text') newBlock = { id: uuidv4(), type: 'text', content: '' }
    else if (type === 'grid') newBlock = createGridBlock()
    else newBlock = { id: uuidv4(), type: 'divider' }
    newBlocks.splice(afterIdx + 1, 0, newBlock)
    onChange(newBlocks)
  }

  const onDragStart = (idx: number) => { dragIdx.current = idx }
  const onDragOver = (idx: number, e: React.DragEvent) => {
    e.preventDefault()
    dragOverIdx.current = idx
  }
  const onDrop = () => {
    if (dragIdx.current === null || dragOverIdx.current === null) return
    if (dragIdx.current === dragOverIdx.current) return
    const newBlocks = [...blocks]
    const [removed] = newBlocks.splice(dragIdx.current, 1)
    newBlocks.splice(dragOverIdx.current, 0, removed)
    onChange(newBlocks)
    dragIdx.current = null
    dragOverIdx.current = null
  }

  return (
    <div className="space-y-4">
      {blocks.map((block, idx) => (
        <div
          key={block.id}
          className="group relative"
          draggable={block.type !== 'title'}
          onDragStart={() => onDragStart(idx)}
          onDragOver={(e) => onDragOver(idx, e)}
          onDrop={onDrop}
        >
          {/* drag handle */}
          {block.type !== 'title' && (
            <div className="absolute left-[-28px] top-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-gray-400 select-none text-lg leading-none">
              ⋮⋮
            </div>
          )}

          {/* delete button */}
          {block.type !== 'title' && (
            <button
              onClick={() => deleteBlock(idx)}
              className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 text-sm w-6 h-6 flex items-center justify-center rounded"
              title="ブロックを削除"
            >
              ×
            </button>
          )}

          {/* block content */}
          {block.type === 'title' && (
            <TitleBlock
              content={block.content}
              onChange={(content) => updateBlock(idx, { ...block, content })}
              onEnter={() => {
                // find next text block or add one
                const nextTextIdx = blocks.findIndex((b, i) => i > idx && b.type === 'text')
                if (nextTextIdx === -1) addBlock(idx, 'text')
              }}
            />
          )}
          {block.type === 'text' && (
            <TextEditor
              content={block.content}
              onChange={(content) => updateBlock(idx, { ...block, content })}
            />
          )}
          {block.type === 'grid' && (
            <GridBlockComponent
              block={block}
              onChange={(b) => updateBlock(idx, b)}
            />
          )}
          {block.type === 'divider' && (
            <div className="my-3" style={{ borderTop: '2.5px solid #6b8a3a' }} />
          )}

          {/* add block button */}
          {block.type !== 'title' && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-center mt-2">
              <div className="flex gap-2 bg-white border border-gray-200 rounded-full shadow-sm px-3 py-1">
                <button
                  onClick={() => addBlock(idx, 'text')}
                  className="text-xs text-gray-500 hover:text-purple-600 px-2 py-0.5"
                >
                  + テキスト
                </button>
                <button
                  onClick={() => addBlock(idx, 'grid')}
                  className="text-xs text-gray-500 hover:text-purple-600 px-2 py-0.5"
                >
                  + グリッド
                </button>
                <button
                  onClick={() => addBlock(idx, 'divider')}
                  className="text-xs text-gray-500 hover:text-purple-600 px-2 py-0.5"
                >
                  + 区切り線
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
