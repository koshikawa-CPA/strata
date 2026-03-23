import { v4 as uuidv4 } from 'uuid'
import { Section, Page, Sheet, Notebook } from './types'

export function createSheet(name: string): Sheet {
  return {
    id: uuidv4(),
    name,
    blocks: [
      { id: uuidv4(), type: 'title', content: '' },
      { id: uuidv4(), type: 'text', content: '' },
    ],
  }
}

export function createPage(name: string): Page {
  const sheet = createSheet('1')
  return {
    id: uuidv4(),
    name,
    sheets: [sheet],
    activeSheetId: sheet.id,
  }
}

export function createSection(name: string, color: string = '#556B2F'): Section {
  const page = createPage('Page 1')
  return {
    id: uuidv4(),
    name,
    color,
    pages: [page],
    activePageId: page.id,
  }
}

export function createNotebook(): Notebook {
  const section = createSection('Section 1')
  return {
    id: uuidv4(),
    sections: [section],
    activeSectionId: section.id,
  }
}

const STORAGE_KEY = 'strata-notebook'

export function loadNotebook(): Notebook {
  if (typeof window === 'undefined') return createNotebook()
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    try {
      return JSON.parse(saved)
    } catch {
      return createNotebook()
    }
  }
  return createNotebook()
}

export function saveNotebook(notebook: Notebook) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notebook))
}
