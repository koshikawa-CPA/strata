'use client'
import { useRef, useEffect } from 'react'

interface Props {
  content: string
  onChange: (content: string) => void
  onEnter?: () => void
}

export default function TitleBlock({ content, onChange, onEnter }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto'
      ref.current.style.height = ref.current.scrollHeight + 'px'
    }
  }, [content])

  return (
    <textarea
      ref={ref}
      value={content}
      onChange={(e) => {
        onChange(e.target.value)
        if (ref.current) {
          ref.current.style.height = 'auto'
          ref.current.style.height = ref.current.scrollHeight + 'px'
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          onEnter?.()
        }
      }}
      placeholder="タイトルを入力..."
      className="w-full resize-none outline-none font-bold text-4xl text-gray-900 placeholder-gray-300 bg-transparent border-none overflow-hidden leading-tight"
      rows={1}
      style={{ minHeight: '56px' }}
    />
  )
}
