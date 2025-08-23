import { useCallback, RefObject } from 'react'

interface InsertionFunctionsParams {
  // Refs and state
  textareaRef: RefObject<HTMLTextAreaElement | null>
  markdownContent: string
  
  // Handlers
  handleFormattingChange: (content: string) => void
  
  // Link modal state
  linkText: string
  linkUrl: string
  setLinkText: (text: string) => void
  setLinkUrl: (url: string) => void
  setShowLinkModal: (show: boolean) => void
  
  // Formula modal state
  latexInput: string
  setLatexInput: (input: string) => void
  setShowFormulaModal: (show: boolean) => void
  
  // Table modal state
  tableRows: number
  tableCols: number
  setTableRows: (rows: number) => void
  setTableCols: (cols: number) => void
  setShowTableModal: (show: boolean) => void
  
  // Footnote modal state
  footnoteText: string
  setFootnoteText: (text: string) => void
  setShowFootnoteModal: (show: boolean) => void
  
  // Image modal state
  selectedImage: File | null
  imagePreview: string | null
  setSelectedImage: (image: File | null) => void
  setImagePreview: (preview: string | null) => void
  setShowImageModal: (show: boolean) => void
}

export const useInsertionFunctions = (params: InsertionFunctionsParams) => {
  const {
    textareaRef,
    markdownContent,
    handleFormattingChange,
    linkText,
    linkUrl,
    setLinkText,
    setLinkUrl,
    setShowLinkModal,
    latexInput,
    setLatexInput,
    setShowFormulaModal,
    tableRows,
    tableCols,
    setTableRows,
    setTableCols,
    setShowTableModal,
    footnoteText,
    setFootnoteText,
    setShowFootnoteModal,
    selectedImage,
    imagePreview,
    setSelectedImage,
    setImagePreview,
    setShowImageModal
  } = params

  // Insert link with user-provided text and URL
  const insertLink = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea || !linkText.trim() || !linkUrl.trim()) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const content = markdownContent
    
    // Create markdown link format
    const linkMarkdown = `[${linkText.trim()}](${linkUrl.trim()})`
    
    // Replace selected text (if any) with the link
    const newContent = 
      content.substring(0, start) + 
      linkMarkdown + 
      content.substring(end)
    
    // Update content using formatting change
    handleFormattingChange(newContent)
    
    // Calculate new cursor position (after the link)
    const newCursorPos = start + linkMarkdown.length
    
    // Close modal and reset inputs
    setShowLinkModal(false)
    setLinkText('')
    setLinkUrl('')
    
    // Restore focus and cursor position
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }, [textareaRef, linkText, linkUrl, markdownContent, handleFormattingChange, setShowLinkModal, setLinkText, setLinkUrl])

  // Cancel link insertion
  const cancelLink = useCallback(() => {
    setShowLinkModal(false)
    setLinkText('')
    setLinkUrl('')
    
    // Restore focus to textarea
    setTimeout(() => {
      textareaRef.current?.focus()
    }, 0)
  }, [setShowLinkModal, setLinkText, setLinkUrl, textareaRef])

  // Insert formula with user-provided LaTeX
  const insertFormula = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea || !latexInput.trim()) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const content = markdownContent
    
    // Create LaTeX formula format (using $$...$$)
    const formulaMarkdown = `$$${latexInput.trim()}$$`
    
    // Replace selected text (if any) with the formula
    const newContent = 
      content.substring(0, start) + 
      formulaMarkdown + 
      content.substring(end)
    
    // Update content using formatting change
    handleFormattingChange(newContent)
    
    // Calculate new cursor position (after the formula)
    const newCursorPos = start + formulaMarkdown.length
    
    // Close modal and reset input
    setShowFormulaModal(false)
    setLatexInput('')
    
    // Restore focus and cursor position
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }, [textareaRef, latexInput, markdownContent, handleFormattingChange, setShowFormulaModal, setLatexInput])

  // Cancel formula insertion
  const cancelFormula = useCallback(() => {
    setShowFormulaModal(false)
    setLatexInput('')
    
    // Restore focus to textarea
    setTimeout(() => {
      textareaRef.current?.focus()
    }, 0)
  }, [setShowFormulaModal, setLatexInput, textareaRef])

  // Generate table markdown
  const generateTable = useCallback((rows: number, cols: number) => {
    const headerRow = '| ' + Array(cols).fill('Header').map((_, i) => `Header ${i + 1}`).join(' | ') + ' |'
    const separatorRow = '| ' + Array(cols).fill('---').join(' | ') + ' |'
    const dataRows = Array(rows - 1).fill(null).map((_, rowIdx) => 
      '| ' + Array(cols).fill('Data').map((_, colIdx) => `Data ${rowIdx + 1}.${colIdx + 1}`).join(' | ') + ' |'
    )
    
    return [headerRow, separatorRow, ...dataRows].join('\n') + '\n\n'
  }, [])

  // Insert table
  const insertTable = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    const tableMarkdown = generateTable(tableRows, tableCols)
    const start = textarea.selectionStart
    const content = markdownContent
    
    // If inserting in the middle of a line, move to the next line
    let insertPosition = start
    if (start > 0 && content[start - 1] !== '\n') {
      // Find the end of the current line
      let lineEnd = start
      while (lineEnd < content.length && content[lineEnd] !== '\n') {
        lineEnd++
      }
      insertPosition = lineEnd
      if (lineEnd < content.length) insertPosition++ // Move past the newline
    }

    // Ensure we have a newline before the table if needed
    let prefix = ''
    if (insertPosition > 0 && content[insertPosition - 1] !== '\n') {
      prefix = '\n'
    }

    const newContent = 
      content.substring(0, insertPosition) + 
      prefix + 
      tableMarkdown + 
      content.substring(insertPosition)

    handleFormattingChange(newContent)

    // Position cursor after the inserted table
    const newCursorPos = insertPosition + prefix.length + tableMarkdown.length
    
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)

    // Close modal
    setShowTableModal(false)
  }, [textareaRef, generateTable, tableRows, tableCols, markdownContent, handleFormattingChange, setShowTableModal])

  // Cancel table insertion
  const cancelTable = useCallback(() => {
    setShowTableModal(false)
    setTableRows(3)
    setTableCols(3)
    
    // Restore focus to textarea
    setTimeout(() => {
      textareaRef.current?.focus()
    }, 0)
  }, [setShowTableModal, setTableRows, setTableCols, textareaRef])

  // Insert footnote
  const insertFootnote = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea || !footnoteText.trim()) return

    const content = markdownContent
    const start = textarea.selectionStart
    const end = textarea.selectionEnd

    // Find the next footnote number by counting existing footnotes
    const footnotePattern = /\[\^(\d+)\]/g
    const existingFootnotes = []
    let match
    while ((match = footnotePattern.exec(content)) !== null) {
      existingFootnotes.push(parseInt(match[1]))
    }
    
    // Get next footnote number
    const nextNumber = existingFootnotes.length > 0 ? Math.max(...existingFootnotes) + 1 : 1

    // Create footnote reference and definition
    const footnoteRef = `[^${nextNumber}]`
    const footnoteDefinition = `\n\n[^${nextNumber}]: ${footnoteText.trim()}`

    // Insert footnote reference at cursor position
    const contentWithRef = 
      content.substring(0, end) + 
      footnoteRef + 
      content.substring(end)

    // Add footnote definition at the end of the document
    const finalContent = contentWithRef + footnoteDefinition

    handleFormattingChange(finalContent)

    // Position cursor after the footnote reference
    const newCursorPos = end + footnoteRef.length
    
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)

    // Close modal
    setShowFootnoteModal(false)
    setFootnoteText('')
  }, [textareaRef, footnoteText, markdownContent, handleFormattingChange, setShowFootnoteModal, setFootnoteText])

  // Cancel footnote insertion
  const cancelFootnote = useCallback(() => {
    setShowFootnoteModal(false)
    setFootnoteText('')
    
    // Restore focus to textarea
    setTimeout(() => {
      textareaRef.current?.focus()
    }, 0)
  }, [setShowFootnoteModal, setFootnoteText, textareaRef])

  // Insert image into markdown
  const insertImage = useCallback(async () => {
    if (!selectedImage) return

    const textarea = textareaRef.current
    if (!textarea) return

    try {
      // Create FormData for file upload
      const formData = new FormData()
      formData.append('file', selectedImage)

      // Upload to API
      const response = await fetch('/api/images/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to upload image')
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error('Upload failed')
      }

      // Get cursor position
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const content = markdownContent
      
      // Create markdown with uploaded image URL
      const imageMarkdown = `![${result.image.alt}](${result.image.url})`
      
      // Replace selected text (if any) with the image
      const newContent = 
        content.substring(0, start) + 
        imageMarkdown + 
        content.substring(end)
      
      // Update content using formatting change
      handleFormattingChange(newContent)
      
      // Calculate new cursor position (after the image)
      const newCursorPos = start + imageMarkdown.length
      
      // Close modal and reset state
      setShowImageModal(false)
      setSelectedImage(null)
      setImagePreview(null)
      
      // Clean up preview URL
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview)
      }
      
      // Restore focus and cursor position
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(newCursorPos, newCursorPos)
      }, 0)

    } catch (error) {
      console.error('Error uploading image:', error)
      alert(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }, [selectedImage, textareaRef, markdownContent, handleFormattingChange, setShowImageModal, setSelectedImage, setImagePreview, imagePreview])

  // Cancel image insertion
  const cancelImage = useCallback(() => {
    setShowImageModal(false)
    setSelectedImage(null)
    
    // Clean up preview URL
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview)
      setImagePreview(null)
    }
    
    // Restore focus to textarea
    setTimeout(() => {
      textareaRef.current?.focus()
    }, 0)
  }, [setShowImageModal, setSelectedImage, imagePreview, setImagePreview, textareaRef])

  return {
    insertLink,
    cancelLink,
    insertFormula,
    cancelFormula,
    insertTable,
    cancelTable,
    insertFootnote,
    cancelFootnote,
    insertImage,
    cancelImage
  }
}
