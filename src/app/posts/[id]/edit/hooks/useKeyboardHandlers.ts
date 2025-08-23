import { useCallback } from 'react'

interface KeyboardHandlersParams {
  // Image modal handlers
  selectedImage: File | null
  insertImage: () => void
  cancelImage: () => void
  
  // Formula modal handlers  
  latexInput: string
  insertFormula: () => void
  cancelFormula: () => void
  
  // Table modal handlers
  insertTable: () => void
  cancelTable: () => void
  
  // Link modal handlers
  linkText: string
  linkUrl: string
  insertLink: () => void
  cancelLink: () => void
  
  // Footnote modal handlers
  footnoteText: string
  insertFootnote: () => void
  cancelFootnote: () => void
  
  // Optional color modal handlers
  selectedColor?: string
  applyColor?: (color: string) => void
  cancelColor?: () => void
  
  // Optional main editor handlers
  applyBold?: () => void
  applyItalics?: () => void
  handleUndo?: () => void
  handleRedo?: () => void
  handleSave?: () => void
}

export const useKeyboardHandlers = (params: KeyboardHandlersParams) => {
  const {
    selectedImage, insertImage, cancelImage,
    latexInput, insertFormula, cancelFormula,
    insertTable, cancelTable,
    linkText, linkUrl, insertLink, cancelLink,
    footnoteText, insertFootnote, cancelFootnote,
    selectedColor, applyColor, cancelColor,
    applyBold, applyItalics, handleUndo, handleRedo, handleSave
  } = params

  // Handle keyboard shortcuts in image modal
  const handleImageModalKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && selectedImage) {
      e.preventDefault()
      insertImage()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelImage()
    }
  }, [selectedImage, insertImage, cancelImage])

  // Handle keyboard shortcuts in formula modal
  const handleFormulaModalKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey && latexInput.trim()) {
      e.preventDefault()
      insertFormula()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelFormula()
    }
  }, [latexInput, insertFormula, cancelFormula])

  // Handle keyboard shortcuts in table modal
  const handleTableModalKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      insertTable()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelTable()
    }
  }, [insertTable, cancelTable])

  // Handle keyboard shortcuts in link modal
  const handleLinkModalKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && linkText.trim() && linkUrl.trim()) {
      e.preventDefault()
      insertLink()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelLink()
    }
  }, [linkText, linkUrl, insertLink, cancelLink])

  // Handle keyboard shortcuts in footnote modal
  const handleFootnoteModalKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && footnoteText.trim()) {
      e.preventDefault()
      insertFootnote()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelFootnote()
    }
  }, [footnoteText, insertFootnote, cancelFootnote])

  // Handle keyboard shortcuts in color modal
  const handleColorModalKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && selectedColor && applyColor) {
      e.preventDefault()
      applyColor(selectedColor)
    } else if (e.key === 'Escape' && cancelColor) {
      e.preventDefault()
      cancelColor()
    }
  }, [selectedColor, applyColor, cancelColor])

  // Handle global keyboard shortcuts for main editor
  const handleMainEditorKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Only handle shortcuts when Ctrl/Cmd is pressed
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          if (applyBold) {
            e.preventDefault()
            applyBold()
          }
          break
        case 'i':
          if (applyItalics) {
            e.preventDefault()
            applyItalics()
          }
          break
        case 'z':
          if (e.shiftKey) {
            // Ctrl+Shift+Z = Redo
            if (handleRedo) {
              e.preventDefault()
              handleRedo()
            }
          } else {
            // Ctrl+Z = Undo
            if (handleUndo) {
              e.preventDefault()
              handleUndo()
            }
          }
          break
        case 'y':
          // Ctrl+Y = Redo (alternative)
          if (handleRedo) {
            e.preventDefault()
            handleRedo()
          }
          break
        case 's':
          // Ctrl+S = Save
          if (handleSave) {
            e.preventDefault()
            handleSave()
          }
          break
        default:
          // Don't prevent default for other shortcuts
          break
      }
    }
  }, [applyBold, applyItalics, handleUndo, handleRedo, handleSave])

  return {
    handleImageModalKeyDown,
    handleFormulaModalKeyDown,
    handleTableModalKeyDown,
    handleLinkModalKeyDown,
    handleFootnoteModalKeyDown,
    handleColorModalKeyDown,
    handleMainEditorKeyDown
  }
}
