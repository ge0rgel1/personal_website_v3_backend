import { useCallback, RefObject } from 'react'

interface ModalOpenersParams {
  // Refs and state
  textareaRef: RefObject<HTMLTextAreaElement | null>
  markdownContent: string
  
  // Link modal state
  setLinkText: (text: string) => void
  setLinkUrl: (url: string) => void
  setShowLinkModal: (show: boolean) => void
  
  // Formula modal state
  setLatexInput: (input: string) => void
  setShowFormulaModal: (show: boolean) => void
  
  // Table modal state
  setShowTableModal: (show: boolean) => void
  
  // Footnote modal state
  setFootnoteText: (text: string) => void
  setShowFootnoteModal: (show: boolean) => void
  
  // Image modal state
  setSelectedImage: (image: File | null) => void
  setImagePreview: (preview: string | null) => void
  setIsDragOver: (dragOver: boolean) => void
  setShowImageModal: (show: boolean) => void
}

export const useModalOpeners = (params: ModalOpenersParams) => {
  const {
    textareaRef,
    markdownContent,
    setLinkText,
    setLinkUrl,
    setShowLinkModal,
    setLatexInput,
    setShowFormulaModal,
    setShowTableModal,
    setFootnoteText,
    setShowFootnoteModal,
    setSelectedImage,
    setImagePreview,
    setIsDragOver,
    setShowImageModal
  } = params

  // Link functionality - opens modal for user input
  const openLinkModal = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    
    // If there's selected text, use it as the link text
    if (start !== end) {
      const selectedText = markdownContent.substring(start, end)
      setLinkText(selectedText)
    } else {
      setLinkText('')
    }
    
    setLinkUrl('')
    setShowLinkModal(true)
  }, [textareaRef, markdownContent, setLinkText, setLinkUrl, setShowLinkModal])

  // Formula functionality - opens modal for LaTeX input
  const openFormulaModal = useCallback(() => {
    setLatexInput('')
    setShowFormulaModal(true)
  }, [setLatexInput, setShowFormulaModal])

  // Table functionality - opens modal for table configuration
  const openTableModal = useCallback(() => {
    setShowTableModal(true)
  }, [setShowTableModal])

  // Footnote functionality - opens modal for footnote input
  const openFootnoteModal = useCallback(() => {
    setFootnoteText('')
    setShowFootnoteModal(true)
  }, [setFootnoteText, setShowFootnoteModal])

  // Image functionality - opens modal for image upload
  const openImageModal = useCallback(() => {
    setSelectedImage(null)
    setImagePreview(null)
    setIsDragOver(false)
    setShowImageModal(true)
  }, [setSelectedImage, setImagePreview, setIsDragOver, setShowImageModal])

  return {
    openLinkModal,
    openFormulaModal,
    openTableModal,
    openFootnoteModal,
    openImageModal
  }
}
