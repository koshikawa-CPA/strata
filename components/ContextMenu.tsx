'use client'
import { useEffect, useRef } from 'react'

interface MenuItem {
  label: string
  onClick: () => void
  danger?: boolean
}

interface Props {
  x: number
  y: number
  items: MenuItem[]
  onClose: () => void
}

export default function ContextMenu({ x, y, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-white border border-gray-200 rounded shadow-lg py-1 min-w-[150px]"
      style={{ left: x, top: y }}
    >
      {items.map((item, i) => (
        <button
          key={i}
          onClick={() => { item.onClick(); onClose() }}
          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${item.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700'}`}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
