'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Notebook as NotebookType, Section, Page, Block } from '@/lib/types'
import { loadNotebook, saveNotebook, createSection, createPage, createSheet } from '@/lib/store'
import Logo from './Logo'
import SectionTabs from './SectionTabs'
import PageTabs from './PageTabs'
import SheetTabs from './SheetTabs'
import BlockContainer from './BlockContainer'
import { supabase } from '@/lib/supabase'

export default function NotebookApp() {
  const router = useRouter()
  const [notebook, setNotebook] = useState<NotebookType | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserEmail(session?.user?.email ?? null)
    })
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  useEffect(() => {
    setNotebook(loadNotebook())
  }, [])

  const scheduleAutoSave = useCallback((nb: NotebookType) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      saveNotebook(nb)
    }, 3000)
  }, [])

  const update = useCallback((nb: NotebookType) => {
    setNotebook(nb)
    scheduleAutoSave(nb)
  }, [scheduleAutoSave])

  if (!notebook) return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-gray-400">読み込み中...</div>
    </div>
  )

  const activeSection = notebook.sections.find(s => s.id === notebook.activeSectionId) ?? notebook.sections[0]
  const activePage = activeSection.pages.find(p => p.id === activeSection.activePageId) ?? activeSection.pages[0]
  const activeSheet = activePage.sheets.find(s => s.id === activePage.activeSheetId) ?? activePage.sheets[0]

  // Section operations
  const addSection = () => {
    if (notebook.sections.length >= 32) return
    const num = notebook.sections.length + 1
    const section = createSection(`Section ${num}`)
    const newNotebook = {
      ...notebook,
      sections: [...notebook.sections, section],
      activeSectionId: section.id,
    }
    update(newNotebook)
  }

  const selectSection = (id: string) => update({ ...notebook, activeSectionId: id })

  const renameSection = (id: string, name: string) => {
    const sections = notebook.sections.map(s => s.id === id ? { ...s, name } : s)
    update({ ...notebook, sections })
  }

  const deleteSection = (id: string) => {
    if (notebook.sections.length <= 1) return
    const sections = notebook.sections.filter(s => s.id !== id)
    const activeSectionId = notebook.activeSectionId === id ? sections[0].id : notebook.activeSectionId
    update({ ...notebook, sections, activeSectionId })
  }

  const changeSectionColor = (id: string, color: string) => {
    const sections = notebook.sections.map(s => s.id === id ? { ...s, color } : s)
    update({ ...notebook, sections })
  }

  // Page operations
  const updateSection = (section: Section) => {
    const sections = notebook.sections.map(s => s.id === section.id ? section : s)
    update({ ...notebook, sections })
  }

  const addPage = () => {
    if (activeSection.pages.length >= 32) return
    const num = activeSection.pages.length + 1
    const page = createPage(`Page ${num}`)
    updateSection({ ...activeSection, pages: [...activeSection.pages, page], activePageId: page.id })
  }

  const selectPage = (id: string) => updateSection({ ...activeSection, activePageId: id })

  const renamePage = (id: string, name: string) => {
    const pages = activeSection.pages.map(p => p.id === id ? { ...p, name } : p)
    updateSection({ ...activeSection, pages })
  }

  const deletePage = (id: string) => {
    if (activeSection.pages.length <= 1) return
    const pages = activeSection.pages.filter(p => p.id !== id)
    const activePageId = activeSection.activePageId === id ? pages[0].id : activeSection.activePageId
    updateSection({ ...activeSection, pages, activePageId })
  }

  // Sheet operations
  const updatePage = (page: Page) => {
    const pages = activeSection.pages.map(p => p.id === page.id ? page : p)
    updateSection({ ...activeSection, pages })
  }

  const addSheet = () => {
    if (activePage.sheets.length >= 32) return
    const num = activePage.sheets.length + 1
    const sheet = createSheet(String(num))
    updatePage({ ...activePage, sheets: [...activePage.sheets, sheet], activeSheetId: sheet.id })
  }

  const selectSheet = (id: string) => updatePage({ ...activePage, activeSheetId: id })

  const renameSheet = (id: string, name: string) => {
    const sheets = activePage.sheets.map(s => s.id === id ? { ...s, name } : s)
    updatePage({ ...activePage, sheets })
  }

  const deleteSheet = (id: string) => {
    if (activePage.sheets.length <= 1) return
    const sheets = activePage.sheets.filter(s => s.id !== id)
    const activeSheetId = activePage.activeSheetId === id ? sheets[0].id : activePage.activeSheetId
    updatePage({ ...activePage, sheets, activeSheetId })
  }

  // Block operations
  const updateBlocks = (blocks: Block[]) => {
    const sheets = activePage.sheets.map(s => s.id === activeSheet.id ? { ...s, blocks } : s)
    updatePage({ ...activePage, sheets })
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white">
      {/* Top header with logo */}
      <div
        className="flex items-center px-4 py-2 border-b border-gray-200"
        style={{ background: 'linear-gradient(135deg, #f4f6ef 0%, #edf1e5 100%)', minHeight: '48px' }}
      >
        <Logo />
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-gray-400">自動保存</span>
          {userEmail && (
            <>
              <span className="text-xs text-gray-500 hidden sm:inline">{userEmail}</span>
              <button
                onClick={handleLogout}
                className="text-xs text-[#556B2F] hover:text-[#435626] border border-[#6b8a3a] hover:border-[#435626] rounded px-2 py-1 transition-colors"
              >
                ログアウト
              </button>
            </>
          )}
        </div>
      </div>

      {/* Section tabs (layer 1) */}
      <div style={{ background: '#f9fafb' }}>
        <SectionTabs
          sections={notebook.sections}
          activeSectionId={notebook.activeSectionId}
          onSelect={selectSection}
          onAdd={addSection}
          onRename={renameSection}
          onDelete={deleteSection}
          onColorChange={changeSectionColor}
        />
      </div>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Page tabs (layer 2) */}
        <PageTabs
          pages={activeSection?.pages || []}
          activePageId={activeSection?.activePageId || ''}
          onSelect={selectPage}
          onAdd={addPage}
          onRename={renamePage}
          onDelete={deletePage}
        />

        {/* Editor area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <div className="py-8 pr-8" style={{ paddingLeft: '52px' }}>
              {activeSheet && (
                <BlockContainer
                  blocks={activeSheet.blocks}
                  onChange={updateBlocks}
                />
              )}
            </div>
          </div>

          {/* Sheet tabs (layer 3) - Excel style at bottom */}
          {activePage && (
            <SheetTabs
              sheets={activePage.sheets}
              activeSheetId={activePage.activeSheetId}
              onSelect={selectSheet}
              onAdd={addSheet}
              onRename={renameSheet}
              onDelete={deleteSheet}
            />
          )}

          {/* Footer */}
          <div
            className="text-center text-xs text-gray-400 py-1 select-none"
            style={{ borderTop: '1px solid #6b8a3a' }}
          >
            Strata Ver.1 　©2026 ABC LLC. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  )
}
