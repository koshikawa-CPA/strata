'use client'

const COLORS = [
  '#556B2F', '#6b8a3a', '#2563eb', '#0891b2',
  '#059669', '#65a30d', '#d97706', '#ea580c',
  '#dc2626', '#db2777', '#64748b', '#1d4ed8',
]

interface Props {
  value: string
  onChange: (color: string) => void
  onClose: () => void
}

export default function ColorPicker({ value, onChange, onClose }: Props) {
  return (
    <div className="p-3">
      <p className="text-xs text-gray-500 mb-2">タブの色を選択</p>
      <div className="grid grid-cols-4 gap-2">
        {COLORS.map((color) => (
          <button
            key={color}
            onClick={() => { onChange(color); onClose() }}
            className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
            style={{
              background: color,
              borderColor: value === color ? '#1f2937' : 'transparent',
            }}
          />
        ))}
      </div>
    </div>
  )
}
