'use client'
import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect } from 'react'

interface Props {
  content: string
  onChange: (content: string) => void
}

const MenuBar = ({ editor }: { editor: Editor | null }) => {
  if (!editor) return null

  const btn = (label: string, action: () => boolean, active: boolean, title: string) => (
    <button
      onClick={action}
      className={`px-2 py-1 text-xs rounded transition-colors ${active ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100 text-gray-600'}`}
      title={title}
    >
      {label}
    </button>
  )

  return (
    <div className="flex flex-wrap gap-1 p-2 border-b border-gray-100 bg-gray-50 rounded-t">
      {btn('H1', () => editor.chain().focus().toggleHeading({ level: 1 }).run(), editor.isActive('heading', { level: 1 }), '見出し1')}
      {btn('H2', () => editor.chain().focus().toggleHeading({ level: 2 }).run(), editor.isActive('heading', { level: 2 }), '見出し2')}
      {btn('H3', () => editor.chain().focus().toggleHeading({ level: 3 }).run(), editor.isActive('heading', { level: 3 }), '見出し3')}
      <div className="w-px h-5 bg-gray-200 mx-1 self-center" />
      {btn('B', () => editor.chain().focus().toggleBold().run(), editor.isActive('bold'), '太字')}
      {btn('I', () => editor.chain().focus().toggleItalic().run(), editor.isActive('italic'), '斜体')}
      <div className="w-px h-5 bg-gray-200 mx-1 self-center" />
      {btn('• リスト', () => editor.chain().focus().toggleBulletList().run(), editor.isActive('bulletList'), '箇条書き')}
      {btn('1. リスト', () => editor.chain().focus().toggleOrderedList().run(), editor.isActive('orderedList'), '番号付きリスト')}
      <div className="w-px h-5 bg-gray-200 mx-1 self-center" />
      {btn('コード', () => editor.chain().focus().toggleCodeBlock().run(), editor.isActive('codeBlock'), 'コードブロック')}
    </div>
  )
}

export default function TextEditor({ content, onChange }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'テキストを入力...' }),
    ],
    immediatelyRender: false,
    content: content ? JSON.parse(content) : '',
    onUpdate: ({ editor }) => {
      onChange(JSON.stringify(editor.getJSON()))
    },
  })

  useEffect(() => {
    if (editor && content) {
      const currentJson = JSON.stringify(editor.getJSON())
      if (currentJson !== content) {
        try {
          editor.commands.setContent(JSON.parse(content))
        } catch {
          editor.commands.setContent('')
        }
      }
    }
  }, [content, editor])

  return (
    <div className="border border-gray-200 rounded bg-white">
      <MenuBar editor={editor} />
      <div className="p-3 min-h-[80px]">
        <EditorContent editor={editor} className="tiptap" />
      </div>
    </div>
  )
}
