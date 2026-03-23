export type CellContent =
  | { type: 'text'; value: string }
  | { type: 'image'; url: string; alt?: string; storagePath?: string }
  | { type: 'file'; url: string; name: string; fileType: string; storagePath?: string }

export interface GridCell {
  id: string
  rowIndex: number
  colIndex: number
  rowSpan: number
  colSpan: number
  content: CellContent
  merged?: boolean // hidden because merged into another
}

export interface GridBlock {
  id: string
  type: 'grid'
  rows: number
  cols: number
  cells: GridCell[]
  colWidths: number[]
  rowHeights: number[]
}

export interface TextBlock {
  id: string
  type: 'text'
  content: string // TipTap JSON string
}

export interface TitleBlock {
  id: string
  type: 'title'
  content: string
}

export interface DividerBlock {
  id: string
  type: 'divider'
}

export type Block = TitleBlock | TextBlock | GridBlock | DividerBlock

export interface Sheet {
  id: string
  name: string
  blocks: Block[]
}

export interface Page {
  id: string
  name: string
  sheets: Sheet[]
  activeSheetId: string
}

export interface Section {
  id: string
  name: string
  color: string
  pages: Page[]
  activePageId: string
}

export interface Notebook {
  id: string
  sections: Section[]
  activeSectionId: string
}
