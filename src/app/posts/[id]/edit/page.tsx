'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeHighlight from 'rehype-highlight'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import 'highlight.js/styles/github.css'

// Import our type definitions
import type {
  Post,
  Tag,
  PostMetadata,
  HistoryState,
  SaveStatus,
  EditorState,
  LinkModalState,
  FormulaModalState,
  TableModalState,
  FootnoteModalState,
  ImageModalState,
  ConfigureModalState,
  ColorModalState,
  TagState
} from './types'

// Import constants
import { 
  customStyles, 
  EDITOR_CONFIG, 
  DEFAULT_POST_METADATA, 
  DEFAULT_TABLE_CONFIG 
} from './constants'

// Import markdown utilities
import { 
  markdownComponents, 
  preprocessMathContent,
  applyHeadingUtility,
  applyBold as applyBoldUtility,
  applyItalics as applyItalicsUtility,
  applyListUtility,
  applyQuotation as applyQuotationUtility,
  applyCode as applyCodeUtility,
  applyStrikethrough as applyStrikethroughUtility,
  type FormattingContext
} from './utils'

// Import modal components
import {
  LinkModal,
  FormulaModal,
  TableModal,
  FootnoteModal,
  ImageModal,
  ColorModal
} from './components/modals'

// Import hooks
import {
  useKeyboardHandlers,
  useInsertionFunctions,
  useModalOpeners,
  useFileHandling,
  useUtilityFunctions
} from './hooks'

export default function EditPostPage() {
  const params = useParams()
  const router = useRouter()
  const postId = params.id as string
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [markdownContent, setMarkdownContent] = useState('')
  const [showHeadingDropdown, setShowHeadingDropdown] = useState(false)
  const [showListDropdown, setShowListDropdown] = useState(false)
  
  // Link modal state
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [linkText, setLinkText] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  
  // Formula modal state
  const [showFormulaModal, setShowFormulaModal] = useState(false)
  const [latexInput, setLatexInput] = useState('')
  
  // Table modal state
  const [showTableModal, setShowTableModal] = useState(false)
  const [tableRows, setTableRows] = useState<number>(DEFAULT_TABLE_CONFIG.rows)
  const [tableCols, setTableCols] = useState<number>(DEFAULT_TABLE_CONFIG.cols)
  
  // Footnote modal state
  const [showFootnoteModal, setShowFootnoteModal] = useState(false)
  const [footnoteText, setFootnoteText] = useState('')
  
  // Color modal state
  const [showColorModal, setShowColorModal] = useState(false)
  const [selectedColor, setSelectedColor] = useState('#000000')
  const [customColor, setCustomColor] = useState('#000000')
  
  // Save state
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  
  // Image modal state
  const [showImageModal, setShowImageModal] = useState(false)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  
  // Configure modal state
  const [showConfigureModal, setShowConfigureModal] = useState(false)
  const [postMetadata, setPostMetadata] = useState<PostMetadata>(DEFAULT_POST_METADATA)
  const [configCoverImage, setConfigCoverImage] = useState<File | null>(null)
  const [configCoverPreview, setConfigCoverPreview] = useState<string | null>(null)
  const [configIsDragOver, setConfigIsDragOver] = useState(false)
  
  // Help modal state
  const [showHelpModal, setShowHelpModal] = useState(false)
  
  // Tag management state
  const [postTags, setPostTags] = useState<Tag[]>([])
  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  const [tagSearchQuery, setTagSearchQuery] = useState('')
  const [filteredTags, setFilteredTags] = useState<Tag[]>([])
  const [showTagDropdown, setShowTagDropdown] = useState(false)
  const [isCreatingTag, setIsCreatingTag] = useState(false)
  
  // History model (simple & correct)
  const [hist, setHist] = useState<HistoryState>({ stack: [''], index: 0 });

  // Textarea ref for cursor position
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const configureModalRef = useRef<HTMLDivElement>(null)
  const helpModalRef = useRef<HTMLDivElement>(null)
  const configFileInputRef = useRef<HTMLInputElement>(null)
  
  // Timer type (works in browser TS)
  const historyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Helpers
  const pushHistory = useCallback((content: string) => {
    setHist(prev => {
      // no-op if identical to current entry
      if (prev.stack[prev.index] === content) return prev;

      // drop any redo branch
      const base = prev.stack.slice(0, prev.index + 1);
      base.push(content);

      // cap at EDITOR_CONFIG.MAX_HISTORY_SIZE, keep the most recent
      const overflow = Math.max(0, base.length - EDITOR_CONFIG.MAX_HISTORY_SIZE);
      const stack = overflow ? base.slice(overflow) : base;

      // move pointer to the last entry
      const index = stack.length - 1;
      return { stack, index };
    });
  }, []);

  const undoOnce = useCallback(() => {
    setHist(prev => (prev.index > 0 ? { ...prev, index: prev.index - 1 } : prev));
  }, []);

  const redoOnce = useCallback(() => {
    setHist(prev =>
      prev.index < prev.stack.length - 1 ? { ...prev, index: prev.index + 1 } : prev
    );
  }, []);

  const fetchPost = useCallback(async () => {
    try {
      setError(null)
      const response = await fetch(`/api/posts/${postId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch post')
      }
      const data: { post: Post } = await response.json()
      const post = data.post
      const initialContent = post.content_md || ''
      
      // Set markdown content
      setMarkdownContent(initialContent)
      
      // Set post metadata
      setPostMetadata({
        title: post.title || '',
        slug: post.slug || '',
        excerpt: post.excerpt || '',
        author: post.author || 'me',
        status: post.status || 'draft',
        read_time_minutes: post.read_time_minutes || 0,
        cover_image_url: post.cover_image_url || ''
      })
      
      // Set post tags if available
      if (post.tags) {
        setPostTags(post.tags)
      }
      
      // Initialize history with the initial content
      setHist({ stack: [initialContent], index: 0 })
    } catch (error) {
      console.error('Error fetching post:', error)
      setError('Failed to load post')
    } finally {
      setLoading(false)
    }
  }, [postId])

  useEffect(() => {
    if (postId) {
      fetchPost()
    }
  }, [postId, fetchPost])

  // Whenever the history pointer or stack changes, reflect into the textarea
  useEffect(() => {
    const newContent = hist.stack[hist.index] ?? '';
    
    // Store current cursor position and scroll position
    const textarea = textareaRef.current;
    const currentCursorStart = textarea?.selectionStart ?? 0;
    const currentCursorEnd = textarea?.selectionEnd ?? 0;
    const currentScrollTop = textarea?.scrollTop ?? 0;
    
    setMarkdownContent(newContent);
    
    // Restore cursor and scroll position after content update
    if (textarea) {
      setTimeout(() => {
        // Clamp cursor position to the new content length
        const maxPosition = newContent.length;
        const newStart = Math.min(currentCursorStart, maxPosition);
        const newEnd = Math.min(currentCursorEnd, maxPosition);
        
        textarea.setSelectionRange(newStart, newEnd);
        textarea.scrollTop = currentScrollTop;
      }, 0);
    }
  }, [hist.index, hist.stack]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (historyTimerRef.current) {
        clearTimeout(historyTimerRef.current)
      }
    }
  }, [])

  // Typing: debounce "push to history"
  const handleContentChange = (newContent: string) => {
    setMarkdownContent(newContent);

    if (historyTimerRef.current) clearTimeout(historyTimerRef.current);
    historyTimerRef.current = setTimeout(() => {
      pushHistory(newContent);
    }, 500); // group bursts of typing
  };

  // Formatting ops: push immediately (no debounce)
  const handleFormattingChange = (newContent: string) => {
    if (historyTimerRef.current) {
      clearTimeout(historyTimerRef.current);
      historyTimerRef.current = null;
    }
    setMarkdownContent(newContent);
    pushHistory(newContent);
  };

  // Undo / Redo: do NOT push; just move the pointer
  const handleUndo = () => undoOnce();
  const handleRedo = () => redoOnce();

  // Buttons' availability
  const canUndo = hist.index > 0;
  const canRedo = hist.index < hist.stack.length - 1;

  // Clean up timer
  useEffect(() => {
    return () => {
      if (historyTimerRef.current) {
        clearTimeout(historyTimerRef.current);
      }
    };
  }, []);

  // Initialize hooks
  const { renderLatex: renderLatexHook } = useUtilityFunctions()
  
  const { 
    processImageFile: processImageFileHook, 
    handleFileSelect: handleFileSelectHook, 
    handleDragOver: handleDragOverHook, 
    handleDragLeave: handleDragLeaveHook, 
    handleDrop: handleDropHook, 
    handlePaste: handlePasteHook 
  } = useFileHandling({
    setSelectedImage,
    setImagePreview,
    setIsDragOver
  })

  const { 
    openLinkModal: openLinkModalHook, 
    openFormulaModal: openFormulaModalHook, 
    openTableModal: openTableModalHook, 
    openFootnoteModal: openFootnoteModalHook, 
    openImageModal: openImageModalHook 
  } = useModalOpeners({
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
  })

  const {
    insertLink: insertLinkHook,
    cancelLink: cancelLinkHook,
    insertFormula: insertFormulaHook,
    cancelFormula: cancelFormulaHook,
    insertTable: insertTableHook,
    cancelTable: cancelTableHook,
    insertFootnote: insertFootnoteHook,
    cancelFootnote: cancelFootnoteHook,
    insertImage: insertImageHook,
    cancelImage: cancelImageHook
  } = useInsertionFunctions({
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
  })

  const {
    handleImageModalKeyDown: handleImageModalKeyDownHook,
    handleFormulaModalKeyDown: handleFormulaModalKeyDownHook,
    handleTableModalKeyDown: handleTableModalKeyDownHook,
    handleLinkModalKeyDown: handleLinkModalKeyDownHook,
    handleFootnoteModalKeyDown: handleFootnoteModalKeyDownHook
  } = useKeyboardHandlers({
    selectedImage,
    insertImage: insertImageHook,
    cancelImage: cancelImageHook,
    latexInput,
    insertFormula: insertFormulaHook,
    cancelFormula: cancelFormulaHook,
    insertTable: insertTableHook,
    cancelTable: cancelTableHook,
    linkText,
    linkUrl,
    insertLink: insertLinkHook,
    cancelLink: cancelLinkHook,
    footnoteText,
    insertFootnote: insertFootnoteHook,
    cancelFootnote: cancelFootnoteHook
  })

  // Text formatting functions using utilities
  const applyHeading = (level: number) => {
    const context: FormattingContext = {
      content: markdownContent,
      textarea: textareaRef.current!,
      onContentChange: handleFormattingChange,
      onComplete: () => setShowHeadingDropdown(false)
    };
    applyHeadingUtility(level, context);
  };

  const applyBold = () => {
    const context: FormattingContext = {
      content: markdownContent,
      textarea: textareaRef.current!,
      onContentChange: handleFormattingChange
    };
    applyBoldUtility(context);
  };

  const applyItalics = () => {
    const context: FormattingContext = {
      content: markdownContent,
      textarea: textareaRef.current!,
      onContentChange: handleFormattingChange
    };
    applyItalicsUtility(context);
  };

  const applyList = (listType: 'ordered' | 'unordered') => {
    const context: FormattingContext = {
      content: markdownContent,
      textarea: textareaRef.current!,
      onContentChange: handleFormattingChange,
      onComplete: () => setShowListDropdown(false)
    };
    applyListUtility(listType, context);
  };

  const applyQuotation = () => {
    const context: FormattingContext = {
      content: markdownContent,
      textarea: textareaRef.current!,
      onContentChange: handleFormattingChange
    };
    applyQuotationUtility(context);
  };

  const applyCode = () => {
    const context: FormattingContext = {
      content: markdownContent,
      textarea: textareaRef.current!,
      onContentChange: handleFormattingChange
    };
    applyCodeUtility(context);
  };

  // Link functionality - opens modal for user input
  const openLinkModal = () => {
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
  }

  // Handle keyboard shortcuts in link modal
  const handleLinkModalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && linkText.trim() && linkUrl.trim()) {
      e.preventDefault()
      insertLink()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelLink()
    }
  }

  // Insert link with user-provided text and URL
  const insertLink = () => {
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
  }

  // Cancel link insertion
  const cancelLink = () => {
    setShowLinkModal(false)
    setLinkText('')
    setLinkUrl('')
    
    // Restore focus to textarea
    setTimeout(() => {
      textareaRef.current?.focus()
    }, 0)
  }

  // Formula functionality - opens modal for LaTeX input
  const openFormulaModal = () => {
    setLatexInput('')
    setShowFormulaModal(true)
  }

  // Insert formula with user-provided LaTeX
  const insertFormula = () => {
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
  }

  // Cancel formula insertion
  const cancelFormula = () => {
    setShowFormulaModal(false)
    setLatexInput('')
    
    // Restore focus to textarea
    setTimeout(() => {
      textareaRef.current?.focus()
    }, 0)
  }

  // Table functionality
  const insertTable = () => {
    const textarea = textareaRef.current
    if (!textarea) return

    // Generate table markdown
    const generateTable = (rows: number, cols: number) => {
      const headerRow = '| ' + Array(cols).fill('Header').map((_, i) => `Header ${i + 1}`).join(' | ') + ' |'
      const separatorRow = '| ' + Array(cols).fill('---').join(' | ') + ' |'
      const dataRows = Array(rows - 1).fill(null).map((_, rowIdx) => 
        '| ' + Array(cols).fill('Data').map((_, colIdx) => `Data ${rowIdx + 1}.${colIdx + 1}`).join(' | ') + ' |'
      )
      
      return [headerRow, separatorRow, ...dataRows].join('\n') + '\n\n'
    }

    const tableMarkdown = generateTable(tableRows, tableCols)
    const start = textarea.selectionStart
    const end = textarea.selectionEnd

    // If cursor is at the beginning of content or there's no content, insert at start
    // If cursor is at the end or no selection, insert at cursor position
    // Otherwise, insert at cursor position
    let insertPosition = start
    
    // If inserting in the middle of a line, move to the next line
    const content = markdownContent
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
  }

  const cancelTable = () => {
    setShowTableModal(false)
    setTableRows(3)
    setTableCols(3)
    
    // Restore focus to textarea
    setTimeout(() => {
      textareaRef.current?.focus()
    }, 0)
  }

  // Footnote functionality
  const openFootnoteModal = () => {
    setFootnoteText('')
    setShowFootnoteModal(true)
  }

  const insertFootnote = () => {
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
  }

  const cancelFootnote = () => {
    setShowFootnoteModal(false)
    setFootnoteText('')
    
    // Restore focus to textarea
    setTimeout(() => {
      textareaRef.current?.focus()
    }, 0)
  }

  // Handle keyboard shortcuts in footnote modal
  const handleFootnoteModalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && footnoteText.trim()) {
      e.preventDefault()
      insertFootnote()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelFootnote()
    }
  }

  // Color functionality - opens modal for color picker
  const openColorModal = () => {
    setSelectedColor('#000000')
    setCustomColor('#000000')
    setShowColorModal(true)
  }

  // Apply color to selected text
  const applyColor = (color: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const content = markdownContent
    const selectedText = content.substring(start, end)

    // If no text is selected, don't apply color
    if (!selectedText.trim()) {
      setShowColorModal(false)
      setTimeout(() => {
        textareaRef.current?.focus()
      }, 0)
      return
    }

    // Wrap selected text with span tag and inline style
    const coloredText = `<span style="color: ${color}">${selectedText}</span>`
    
    // Replace selected text with colored span
    const newContent = 
      content.substring(0, start) + 
      coloredText + 
      content.substring(end)
    
    // Update content using formatting change
    handleFormattingChange(newContent)
    
    // Calculate new cursor position (after the colored text)
    const newCursorPos = start + coloredText.length
    
    // Close modal
    setShowColorModal(false)
    
    // Restore focus and cursor position
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

  // Apply current selected color to selected text
  const applyCurrentColor = () => {
    applyColor(selectedColor)
  }

  // Cancel color selection
  const cancelColor = () => {
    setShowColorModal(false)
    
    // Restore focus to textarea
    setTimeout(() => {
      textareaRef.current?.focus()
    }, 0)
  }

  // Handle color change in modal
  const handleColorChange = (color: string) => {
    setSelectedColor(color)
    setCustomColor(color)
  }

  // Image functionality - opens modal for image upload
  const openImageModal = () => {
    setSelectedImage(null)
    setImagePreview(null)
    setIsDragOver(false)
    setShowImageModal(true)
  }

  // Handle file selection from file input
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      processImageFile(file)
    }
  }

  // Process image file (from file input, drag & drop, or clipboard)
  const processImageFile = (file: File) => {
    setSelectedImage(file)
    
    // Create preview URL
    const previewUrl = URL.createObjectURL(file)
    setImagePreview(previewUrl)
  }

  // Handle drag and drop events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      if (file.type.startsWith('image/')) {
        processImageFile(file)
      }
    }
  }

  // Handle clipboard paste
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) {
          processImageFile(file)
        }
        break
      }
    }
  }

  // Insert image into markdown
  const insertImage = async () => {
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
  }

  // Cancel image insertion
  const cancelImage = () => {
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
  }

  // Handle keyboard shortcuts in image modal
  const handleImageModalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && selectedImage) {
      e.preventDefault()
      insertImage()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelImage()
    }
  }

  // Handle keyboard shortcuts in formula modal
  const handleFormulaModalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey && latexInput.trim()) {
      e.preventDefault()
      insertFormula()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelFormula()
    }
  }

  // Handle keyboard shortcuts in table modal
  const handleTableModalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      insertTable()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelTable()
    }
  }

  // LaTeX renderer for formula modal preview
  const renderLatex = (latex: string) => {
    if (!latex.trim()) return '<div class="text-gray-400 italic text-center p-8">Formula preview will appear here...</div>'
    
    try {
      const rendered = katex.renderToString(latex, {
        displayMode: true,
        throwOnError: false,
        errorColor: '#cc0000',
        strict: false
      });
      return `<div class="p-4 text-center">${rendered}</div>`;
    } catch (error) {
      // Show error if LaTeX is invalid
      return `<div class="bg-red-50 border border-red-200 rounded p-4 m-4">
        <div class="text-xs text-red-600 mb-2">LaTeX Error:</div>
        <div class="font-mono text-sm text-red-800">${latex}</div>
        <div class="text-xs text-red-500 mt-2">Please check your LaTeX syntax</div>
      </div>`;
    }
  }

  // Configuration modal handlers
  const handleConfigFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      processConfigImageFile(file)
    }
  }

  // Helper function to create formatting context
  const getFormattingContext = (): FormattingContext | null => {
    const textarea = textareaRef.current
    if (!textarea) return null

    return {
      content: markdownContent,
      textarea,
      onContentChange: handleFormattingChange
    }
  }

  const applyStrikethrough = () => {
    const context = getFormattingContext()
    if (context) {
      applyStrikethroughUtility(context)
    }
  }

  const processConfigImageFile = (file: File) => {
    setConfigCoverImage(file)
    
    // Create preview URL
    const previewUrl = URL.createObjectURL(file)
    setConfigCoverPreview(previewUrl)
  }

  const handleConfigDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setConfigIsDragOver(true)
  }

  const handleConfigDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setConfigIsDragOver(false)
  }

  const handleConfigDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setConfigIsDragOver(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      if (file.type.startsWith('image/')) {
        processConfigImageFile(file)
      }
    }
  }

  const handleConfigApply = async () => {
    try {
      let updatedMetadata = { ...postMetadata }

      // If there's a new cover image, upload it first
      if (configCoverImage) {
        const formData = new FormData()
        formData.append('file', configCoverImage)

        const response = await fetch('/api/images/upload', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to upload cover image')
        }

        const data = await response.json()
        updatedMetadata = { ...updatedMetadata, cover_image_url: data.image.url }
      }

      // Update post metadata via API
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedMetadata),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update post')
      }

      // Update post tags
      await updatePostTags(postTags)

      // Update local state
      setPostMetadata(updatedMetadata)
      
      // Close modal and cleanup
      setShowConfigureModal(false)
      setConfigCoverImage(null)
      setConfigCoverPreview(null)
      setTagSearchQuery('')
      setShowTagDropdown(false)

    } catch (error) {
      console.error('Error updating post configuration:', error)
      alert(`Failed to update post: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Save post content
  const handleSave = async () => {
    try {
      setIsSaving(true)
      
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content_md: markdownContent
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save post')
      }

      // Show success feedback
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000) // Reset after 2 seconds
      
    } catch (error) {
      console.error('Error saving post:', error)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000) // Reset after 3 seconds
    } finally {
      setIsSaving(false)
    }
  }

  // Initialize additional keyboard handlers for color modal and main editor
  const {
    handleColorModalKeyDown: handleColorModalKeyDownHook,
    handleMainEditorKeyDown: handleMainEditorKeyDownHook
  } = useKeyboardHandlers({
    selectedImage,
    insertImage: insertImageHook,
    cancelImage: cancelImageHook,
    latexInput,
    insertFormula: insertFormulaHook,
    cancelFormula: cancelFormulaHook,
    insertTable: insertTableHook,
    cancelTable: cancelTableHook,
    linkText,
    linkUrl,
    insertLink: insertLinkHook,
    cancelLink: cancelLinkHook,
    footnoteText,
    insertFootnote: insertFootnoteHook,
    cancelFootnote: cancelFootnoteHook,
    selectedColor,
    applyColor,
    cancelColor,
    applyBold,
    applyItalics,
    handleUndo,
    handleRedo,
    handleSave
  })

  // Tag management functions
  const fetchAvailableTags = useCallback(async () => {
    try {
      const response = await fetch('/api/tags')
      if (!response.ok) {
        throw new Error('Failed to fetch tags')
      }
      const data = await response.json()
      setAvailableTags(data.tags || [])
    } catch (error) {
      console.error('Error fetching tags:', error)
    }
  }, [])

  // Fetch available tags when configure modal opens
  useEffect(() => {
    if (showConfigureModal) {
      fetchAvailableTags()
    }
  }, [showConfigureModal, fetchAvailableTags])

  // Filter tags based on search query
  useEffect(() => {
    if (!tagSearchQuery.trim()) {
      setFilteredTags([])
    } else {
      const query = tagSearchQuery.toLowerCase()
      const filtered = availableTags.filter(tag => 
        tag.name.toLowerCase().includes(query) &&
        !postTags.some(postTag => postTag.id === tag.id)
      )
      setFilteredTags(filtered)
    }
  }, [tagSearchQuery, availableTags, postTags])

  const handleTagSearch = (query: string) => {
    setTagSearchQuery(query)
    setShowTagDropdown(query.trim().length > 0)
  }

  const addTagToPost = (tag: Tag) => {
    if (!postTags.some(postTag => postTag.id === tag.id)) {
      setPostTags(prev => [...prev, tag])
    }
    setTagSearchQuery('')
    setShowTagDropdown(false)
  }

  const removeTagFromPost = (tagId: number) => {
    setPostTags(prev => prev.filter(tag => tag.id !== tagId))
  }

  const createAndAddTag = async () => {
    if (!tagSearchQuery.trim()) return

    try {
      setIsCreatingTag(true)
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: tagSearchQuery.trim(),
          description: null // Default description, can be customized later
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create tag')
      }

      const data = await response.json()
      const newTag = data.tag

      // Add to available tags and post tags
      setAvailableTags(prev => [...prev, newTag])
      addTagToPost(newTag)

    } catch (error) {
      console.error('Error creating tag:', error)
      alert(`Failed to create tag: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsCreatingTag(false)
    }
  }

  const updatePostTags = async (tags: Tag[]) => {
    try {
      const response = await fetch(`/api/posts/${postId}/tags`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tagIds: tags.map(tag => tag.id)
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update post tags')
      }

    } catch (error) {
      console.error('Error updating post tags:', error)
      throw error
    }
  }

  // Focus configure modal when opened
  useEffect(() => {
    if (showConfigureModal && configureModalRef.current) {
      configureModalRef.current.focus()
    }
  }, [showConfigureModal])

  // Focus help modal when opened
  useEffect(() => {
    if (showHelpModal && helpModalRef.current) {
      helpModalRef.current.focus()
    }
  }, [showHelpModal])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="animate-pulse text-gray-500">Loading post...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-red-500">{error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <style dangerouslySetInnerHTML={{ __html: customStyles }} />
      {/* Floating Toolbar */}
      <div className="sticky top-0 z-40 bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-12">
            {/* Back Button */}
            <button 
              onClick={() => router.back()}
              className="flex items-center space-x-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            >
              <svg 
                className="w-4 h-4" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M15 19l-7-7 7-7" 
                />
              </svg>
              <span className="text-sm font-medium">Back</span>
            </button>
            
            {/* Center toolbar controls */}
            <div className="flex items-center space-x-1">
            {/* File Operations */}
            <button 
              onClick={handleUndo}
              disabled={!canUndo}
              className={`toolbar-button rounded ${
                canUndo 
                  ? 'text-gray-700 hover:bg-gray-100' 
                  : 'text-gray-400 cursor-not-allowed'
              }`}
            >
              Undo
            </button>
            <button 
              onClick={handleRedo}
              disabled={!canRedo}
              className={`toolbar-button rounded ${
                canRedo 
                  ? 'text-gray-700 hover:bg-gray-100' 
                  : 'text-gray-400 cursor-not-allowed'
              }`}
            >
              Redo
            </button>
            <div className="w-px h-6 bg-gray-300 mx-2"></div>
            
            {/* Text Formatting */}
            <div className="relative">
              <button 
                onClick={() => setShowHeadingDropdown(!showHeadingDropdown)}
                className="toolbar-button text-gray-700 hover:bg-gray-100 rounded flex items-center"
              >
                <span className="toolbar-text">Heading</span>
                <svg className="toolbar-dropdown-icon ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showHeadingDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-50 min-w-[120px]">
                  <button 
                    onClick={() => applyHeading(1)}
                    className="dropdown-item block w-full text-left text-gray-700 hover:bg-gray-100"
                  >
                    Heading 1
                  </button>
                  <button 
                    onClick={() => applyHeading(2)}
                    className="dropdown-item block w-full text-left text-gray-700 hover:bg-gray-100"
                  >
                    Heading 2
                  </button>
                  <button 
                    onClick={() => applyHeading(3)}
                    className="dropdown-item block w-full text-left text-gray-700 hover:bg-gray-100"
                  >
                    Heading 3
                  </button>
                  <button 
                    onClick={() => applyHeading(4)}
                    className="dropdown-item block w-full text-left text-gray-700 hover:bg-gray-100"
                  >
                    Heading 4
                  </button>
                  <button 
                    onClick={() => applyHeading(5)}
                    className="dropdown-item block w-full text-left text-gray-700 hover:bg-gray-100"
                  >
                    Heading 5
                  </button>
                  <button 
                    onClick={() => applyHeading(6)}
                    className="dropdown-item block w-full text-left text-gray-700 hover:bg-gray-100"
                  >
                    Heading 6
                  </button>
                </div>
              )}
            </div>
            <button 
              onClick={applyBold}
              className="toolbar-button text-gray-700 hover:bg-gray-100 rounded font-bold"
              title="Bold"
            >
              <span className="toolbar-text">B</span>
            </button>
            <button 
              onClick={applyItalics}
              className="toolbar-button text-gray-700 hover:bg-gray-100 rounded italic"
              title="Italics"
            >
              <span className="toolbar-text">I</span>
            </button>
            <button 
              className="toolbar-button text-gray-700 hover:bg-gray-100 rounded line-through"
              title="Strikethrough"
            >
              <span className="toolbar-text">S</span>
            </button>
            <div 
              className="relative"
              onMouseEnter={() => setShowListDropdown(true)}
              onMouseLeave={() => setShowListDropdown(false)}
            >
              <button 
                className="toolbar-button text-gray-700 hover:bg-gray-100 rounded flex items-center"
                title="Lists"
              >
                <svg className="toolbar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
                </svg>
                <svg className="toolbar-dropdown-icon ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showListDropdown && (
                <div 
                  className="absolute top-full left-0 bg-white border border-gray-300 rounded shadow-lg z-50 min-w-[140px]"
                  onMouseEnter={() => setShowListDropdown(true)}
                  onMouseLeave={() => setShowListDropdown(false)}
                >
                  <button 
                    onClick={() => applyList('ordered')}
                    className="dropdown-item flex items-center w-full text-left text-gray-700 hover:bg-gray-100"
                  >
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <text x="3" y="8" fontSize="8" fill="#3B82F6" fontWeight="bold">1.</text>
                      <rect x="10" y="5" width="8" height="2" fill="currentColor"/>
                      <text x="3" y="14" fontSize="8" fill="#3B82F6" fontWeight="bold">2.</text>
                      <rect x="10" y="11" width="8" height="2" fill="currentColor"/>
                      <text x="3" y="20" fontSize="8" fill="#3B82F6" fontWeight="bold">3.</text>
                      <rect x="10" y="17" width="8" height="2" fill="currentColor"/>
                    </svg>
                    Numbered List
                  </button>
                  <button 
                    onClick={() => applyList('unordered')}
                    className="dropdown-item flex items-center w-full text-left text-gray-700 hover:bg-gray-100"
                  >
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <circle cx="5" cy="6" r="1.5" fill="#3B82F6"/>
                      <rect x="10" y="5" width="8" height="2" fill="currentColor"/>
                      <circle cx="5" cy="12" r="1.5" fill="#3B82F6"/>
                      <rect x="10" y="11" width="8" height="2" fill="currentColor"/>
                      <circle cx="5" cy="18" r="1.5" fill="#3B82F6"/>
                      <rect x="10" y="17" width="8" height="2" fill="currentColor"/>
                    </svg>
                    Unordered List
                  </button>
                </div>
              )}
            </div>
            <button 
              onClick={applyQuotation}
              className="toolbar-button text-gray-700 hover:bg-gray-100 rounded"
              title="Quotation"
            >
              <svg className="toolbar-icon" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/>
              </svg>
            </button>
            <button 
              onClick={applyCode}
              className="toolbar-button text-gray-700 hover:bg-gray-100 rounded"
              title="Code"
            >
              <svg className="toolbar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </button>
            <div className="w-px h-6 bg-gray-300 mx-2"></div>
            
            {/* Media & Links */}
            <button 
              onClick={openImageModal}
              className="toolbar-button text-gray-700 hover:bg-gray-100 rounded"
              title="Insert Image"
            >
              <svg className="toolbar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
            <button 
              onClick={openLinkModal}
              className="toolbar-button text-gray-700 hover:bg-gray-100 rounded"
              title="Insert Link"
            >
              <svg className="toolbar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </button>
            <button 
              onClick={openFormulaModal}
              className="toolbar-button text-gray-700 hover:bg-gray-100 rounded"
              title="Insert Formula"
            >
              <span className="toolbar-text text-lg font-bold">Σ</span>
            </button>
            <button 
              onClick={() => setShowTableModal(true)}
              className="toolbar-button text-gray-700 hover:bg-gray-100 rounded"
              title="Insert Table"
            >
              <svg className="toolbar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7-8h14a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2z" />
              </svg>
            </button>
            <div className="relative flex">
              {/* Main color apply button */}
              <button 
                onClick={applyCurrentColor}
                className="toolbar-button text-gray-700 hover:bg-gray-100 rounded-l"
                title="Apply Text Color"
              >
                <div className="flex flex-col items-center">
                  <span className="toolbar-text font-bold">A</span>
                  <div className="w-3 h-1 rounded" style={{ backgroundColor: selectedColor }}></div>
                </div>
              </button>
              {/* Thin dropdown arrow */}
              <button 
                onClick={() => {
                  openColorModal()
                }}
                className="w-3 bg-gray-100 hover:bg-gray-200 border-l border-gray-300 rounded-r flex items-center justify-center"
                title="Choose Text Color"
              >
                <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <button 
              onClick={openFootnoteModal}
              className="toolbar-button text-gray-700 hover:bg-gray-100 rounded"
              title="Add Footnote"
            >
              <span className="toolbar-text">A<sub>[1]</sub></span>
            </button>
            <div className="w-px h-6 bg-gray-300 mx-2"></div>
            
            {/* Editing Tools */}
            <button 
              className="toolbar-button text-gray-700 hover:bg-gray-100 rounded"
              title="Find & Replace"
            >
              <svg className="toolbar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <div className="w-px h-6 bg-gray-300 mx-2"></div>
            
            {/* Actions */}
            <button 
              onClick={() => setShowHelpModal(true)}
              className="toolbar-button text-white bg-gray-600 hover:bg-gray-700 rounded"
            >
              <span className="toolbar-text">Help</span>
            </button>
            <button 
              onClick={() => setShowConfigureModal(true)}
              className="toolbar-button text-white bg-purple-600 hover:bg-purple-700 rounded"
            >
              <span className="toolbar-text">Configure</span>
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className={`toolbar-button text-white rounded ${
                isSaving 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : saveStatus === 'saved'
                  ? 'bg-green-600 hover:bg-green-700'
                  : saveStatus === 'error'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <span className="toolbar-text">
                {isSaving ? 'Saving...' : 
                 saveStatus === 'saved' ? 'Saved!' :
                 saveStatus === 'error' ? 'Error' :
                 'Save'}
              </span>
            </button>
            </div>
            
            {/* Right spacer to balance the layout */}
            <div className="w-20"></div>
          </div>
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex h-[calc(100vh-8rem)]">
        {/* Left Panel - Markdown Editor */}
        <div className="w-1/2 border-r border-gray-300">
          <div className="h-full p-4">
            <div className="mb-2 flex justify-between items-center">
              <div className="text-sm text-gray-600 font-medium">Source Markdown Editor</div>
              <div className="text-sm text-gray-500">
                Word Count: {markdownContent.trim() ? markdownContent.trim().split(/\s+/).length : 0}
              </div>
            </div>
            <textarea
              ref={textareaRef}
              value={markdownContent}
              onChange={(e) => handleContentChange(e.target.value)}
              onKeyDown={handleMainEditorKeyDownHook}
              className="w-full h-full p-4 border border-gray-300 rounded-lg font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your markdown content here..."
              style={{ minHeight: 'calc(100% - 2rem)' }}
            />
          </div>
        </div>

        {/* Right Panel - Preview */}
        <div className="w-1/2">
          <div className="h-full p-4">
            <div className="mb-2 text-sm text-gray-600 font-medium">Rendered Markdown</div>
            <div className="w-full h-full p-4 border border-gray-300 rounded-lg bg-white overflow-auto">
              <div className="prose prose-sm max-w-none">
                {markdownContent ? (
                  <ReactMarkdown
                    remarkPlugins={[
                      remarkGfm, 
                      [remarkMath, { 
                        singleDollarTextMath: true,
                        inlineMathDouble: false,
                        blockMathDouble: true
                      }]
                    ]}
                    rehypePlugins={[
                      rehypeRaw,
                      rehypeHighlight,
                      [rehypeKatex, { 
                        output: 'html',
                        strict: false,
                        trust: false,
                        throwOnError: false,
                        fleqn: false,
                        macros: {
                          "\\RR": "\\mathbb{R}",
                          "\\NN": "\\mathbb{N}",
                          "\\ZZ": "\\mathbb{Z}",
                          "\\QQ": "\\mathbb{Q}",
                          "\\CC": "\\mathbb{C}"
                        }
                      }]
                    ]}
                    components={markdownComponents}
                    unwrapDisallowed={true}
                  >
                    {preprocessMathContent(markdownContent)}
                  </ReactMarkdown>
                ) : (
                  <div className="text-gray-400 italic">Preview will appear here...</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div 
            className="bg-white rounded-lg p-6 w-96 max-w-[90vw] shadow-xl"
            onKeyDown={handleLinkModalKeyDown}
          >
            <h3 className="text-lg font-semibold mb-4">Insert Link</h3>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="linkText" className="block text-sm font-medium text-gray-700 mb-1">
                  Link Text
                </label>
                <input
                  id="linkText"
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="Enter link text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>
              
              <div>
                <label htmlFor="linkUrl" className="block text-sm font-medium text-gray-700 mb-1">
                  Link Url
                </label>
                <input
                  id="linkUrl"
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={cancelLink}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={insertLink}
                disabled={!linkText.trim() || !linkUrl.trim()}
                className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-md transition-colors"
              >
                Insert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Formula Modal */}
      {showFormulaModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div 
            className="bg-white rounded-lg p-6 shadow-xl"
            style={{ width: '80vw', height: '80vh' }}
            onKeyDown={handleFormulaModalKeyDown}
          >
            <h3 className="text-lg font-semibold mb-4">Insert Formula</h3>
            
            {/* Main content area with left and right panels */}
            <div className="flex" style={{ height: 'calc(100% - 8rem)' }}>
              {/* Left panel - LaTeX input */}
              <div className="w-1/2 pr-3 flex flex-col">
                <label htmlFor="latexInput" className="block text-sm font-medium text-gray-700 mb-2">
                  LaTeX Input
                </label>
                <textarea
                  id="latexInput"
                  value={latexInput}
                  onChange={(e) => setLatexInput(e.target.value)}
                  placeholder="Enter LaTeX formula (e.g., E = mc^2, \frac{a}{b}, \sum_{i=1}^{n} x_i)"
                  className="flex-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm"
                  autoFocus
                />
              </div>
              
              {/* Right panel - Preview */}
              <div className="w-1/2 pl-3 flex flex-col">
                <div className="text-sm font-medium text-gray-700 mb-2">Preview</div>
                <div className="flex-1 w-full border border-gray-300 rounded-md bg-white overflow-auto">
                  <div 
                    className="p-4 h-full"
                    dangerouslySetInnerHTML={{ 
                      __html: renderLatex(latexInput) 
                    }}
                  />
                </div>
              </div>
            </div>
            
            {/* Buttons */}
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={cancelFormula}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={insertFormula}
                disabled={!latexInput.trim()}
                className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-md transition-colors"
              >
                Insert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table Modal */}
      {showTableModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div 
            className="bg-white rounded-lg p-6 shadow-xl max-w-md w-full mx-4"
            onKeyDown={handleTableModalKeyDown}
            tabIndex={-1}
          >
            <h3 className="text-lg font-semibold mb-4">Insert Table</h3>
            
            <div className="space-y-4">
              {/* Number of Rows */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Input Number of Rows (Maximum 100)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={tableRows}
                  onChange={(e) => setTableRows(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="3"
                  autoFocus
                />
              </div>

              {/* Number of Columns */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Input Number of Columns (Maximum 8)
                </label>
                <input
                  type="number"
                  min="1"
                  max="8"
                  value={tableCols}
                  onChange={(e) => setTableCols(Math.min(8, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="3"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={cancelTable}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={insertTable}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Insert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footnote Modal */}
      {showFootnoteModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div 
            className="bg-white rounded-lg p-6 shadow-xl max-w-md w-full mx-4"
            onKeyDown={handleFootnoteModalKeyDown}
            tabIndex={-1}
          >
            <h3 className="text-lg font-semibold mb-4">Add Footnote</h3>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="footnoteText" className="block text-sm font-medium text-gray-700 mb-2">
                  Footnote Text
                </label>
                <textarea
                  id="footnoteText"
                  value={footnoteText}
                  onChange={(e) => setFootnoteText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                  placeholder="Enter footnote content..."
                  autoFocus
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={cancelFootnote}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={insertFootnote}
                disabled={!footnoteText.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Insert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post Configuration Modal */}
      {showConfigureModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div 
            ref={configureModalRef}
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            tabIndex={-1}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault()
                setShowConfigureModal(false)
              }
            }}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Post Configuration</h2>
                <button 
                  onClick={() => setShowConfigureModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={postMetadata.title}
                  onChange={(e) => setPostMetadata(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter post title"
                />
              </div>

              {/* Slug */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Slug
                </label>
                <input
                  type="text"
                  value={postMetadata.slug}
                  onChange={(e) => setPostMetadata(prev => ({ ...prev, slug: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="url-friendly-slug"
                />
              </div>

              {/* Excerpt */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Excerpt
                </label>
                <textarea
                  value={postMetadata.excerpt}
                  onChange={(e) => setPostMetadata(prev => ({ ...prev, excerpt: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Brief description of the post"
                />
              </div>

              {/* Author */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Author
                </label>
                <input
                  type="text"
                  value={postMetadata.author}
                  onChange={(e) => setPostMetadata(prev => ({ ...prev, author: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Author name"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={postMetadata.status}
                  onChange={(e) => setPostMetadata(prev => ({ ...prev, status: e.target.value as 'draft' | 'published' | 'archived' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              {/* Read Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Read Time (minutes)
                </label>
                <input
                  type="number"
                  value={postMetadata.read_time_minutes}
                  onChange={(e) => setPostMetadata(prev => ({ ...prev, read_time_minutes: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  placeholder="Estimated read time"
                />
              </div>

              {/* Cover Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cover Image
                </label>
                <div
                  className={`border-2 border-dashed p-4 text-center rounded-lg transition-colors ${
                    configIsDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                  }`}
                  onDrop={handleConfigDrop}
                  onDragOver={handleConfigDragOver}
                  onDragLeave={handleConfigDragLeave}
                >
                  {configCoverImage ? (
                    <div className="space-y-2">
                      <div className="text-sm text-gray-600">Selected: {configCoverImage.name}</div>
                      {configCoverPreview && (
                        <img
                          src={configCoverPreview}
                          alt="Cover preview"
                          className="max-w-full max-h-48 mx-auto rounded"
                        />
                      )}
                      <button
                        onClick={() => {
                          setConfigCoverImage(null)
                          setConfigCoverPreview(null)
                        }}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ) : postMetadata.cover_image_url ? (
                    <div className="space-y-2">
                      <div className="text-sm text-gray-600">Current cover image:</div>
                      <img
                        src={postMetadata.cover_image_url}
                        alt="Current cover"
                        className="max-w-full max-h-48 mx-auto rounded"
                      />
                      <div className="space-x-2">
                        <button
                          onClick={() => setPostMetadata(prev => ({ ...prev, cover_image_url: '' }))}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="mb-2">📷</div>
                      <div className="text-gray-600">
                        Drag and drop an image here, or{' '}
                        <button
                          onClick={() => configFileInputRef.current?.click()}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          browse
                        </button>
                      </div>
                    </div>
                  )}
                  <input
                    ref={configFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleConfigFileSelect}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Tags Management */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags
                </label>
                
                {/* Current Tags */}
                {postTags.length > 0 && (
                  <div className="mb-3">
                    <div className="flex flex-wrap gap-2">
                      {postTags.map(tag => (
                        <div 
                          key={tag.id}
                          className="flex items-center rounded-full px-3 py-1 text-sm font-medium"
                          style={{ backgroundColor: tag.background_color, color: tag.text_color }}
                        >
                          <span>{tag.name}</span>
                          <button
                            onClick={() => removeTagFromPost(tag.id)}
                            className="ml-2 -mr-1 p-0.5 rounded-full hover:bg-black/10"
                          >
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Search and add tags */}
                <div className="relative">
                  <input
                    type="text"
                    value={tagSearchQuery}
                    onChange={(e) => handleTagSearch(e.target.value)}
                    onFocus={() => setShowTagDropdown(tagSearchQuery.trim().length > 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Search tags or type to create new..."
                  />
                  
                  {/* Tag Dropdown */}
                  {showTagDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {filteredTags.length > 0 ? (
                        <>
                          <div className="px-3 py-1 text-xs text-gray-500 bg-gray-50 border-b">
                            Existing Tags
                          </div>
                          {filteredTags.map((tag) => (
                            <button
                              key={tag.id}
                              onClick={() => addTagToPost(tag)}
                              className="w-full text-left px-3 py-2 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none text-sm"
                            >
                              <span className="inline-flex items-center">
                                <span className="w-3 h-3 rounded-full bg-blue-500 mr-2"></span>
                                {tag.name}
                              </span>
                            </button>
                          ))}
                        </>
                      ) : null}
                      
                      {/* Create New Tag Option */}
                      {tagSearchQuery.trim() && 
                       !availableTags.some(tag => tag.name.toLowerCase() === tagSearchQuery.toLowerCase()) && (
                        <div>
                          {filteredTags.length > 0 && (
                            <div className="border-t border-gray-200"></div>
                          )}
                          <button
                            onClick={createAndAddTag}
                            disabled={isCreatingTag}
                            className="w-full text-left px-3 py-2 hover:bg-green-50 focus:bg-green-50 focus:outline-none text-sm text-green-700 disabled:opacity-50"
                          >
                            <span className="inline-flex items-center">
                              <span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>
                              {isCreatingTag ? 'Creating...' : `Create "${tagSearchQuery}"`}
                            </span>
                          </button>
                        </div>
                      )}
                      
                      {filteredTags.length === 0 && 
                       tagSearchQuery.trim() && 
                       availableTags.some(tag => tag.name.toLowerCase() === tagSearchQuery.toLowerCase()) && (
                        <div className="px-3 py-2 text-sm text-gray-500">
                          Tag already added to this post
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Tag Help Text */}
                <div className="mt-2 text-xs text-gray-500">
                  Search existing tags or type a new name to create one. Click on suggested tags to add them.
                </div>
              </div>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  onClick={() => setShowConfigureModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfigApply}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Upload Modal */}
      {showImageModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div 
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden"
            onKeyDown={handleImageModalKeyDown}
            onPaste={handlePaste}
            tabIndex={-1}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Insert Image</h3>
              <button
                onClick={cancelImage}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              {!selectedImage ? (
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isDragOver 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <svg 
                    className="mx-auto h-12 w-12 text-gray-400 mb-4" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
                    />
                  </svg>
                  <p className="text-lg text-gray-600 mb-2">
                    Drop or paste your image here, or{' '}
                    <label className="text-blue-600 hover:text-blue-800 cursor-pointer font-medium underline">
                      select files from your computer
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </label>
                  </p>
                  <p className="text-sm text-gray-500">
                    Supports JPG, PNG, GIF, WebP, SVG (Max 10MB)
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">Selected Image</h4>
                      <button
                        onClick={() => {
                          setSelectedImage(null)
                          if (imagePreview) {
                            URL.revokeObjectURL(imagePreview)
                            setImagePreview(null)
                          }
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    
                    {imagePreview && (
                      <div className="mb-4 flex justify-center">
                        <img 
                          src={imagePreview} 
                          alt="Preview" 
                          className="max-w-full max-h-64 object-contain rounded border"
                        />
                      </div>
                    )}
                    
                    <div className="text-sm text-gray-600">
                      <p><span className="font-medium">Name:</span> {selectedImage.name}</p>
                      <p>
                        <span className="font-medium">Size:</span> {' '}
                        {selectedImage.size < 1024 * 1024 
                          ? `${Math.round(selectedImage.size / 1024)} KB`
                          : `${(selectedImage.size / (1024 * 1024)).toFixed(1)} MB`
                        }
                      </p>
                      <p><span className="font-medium">Type:</span> {selectedImage.type}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-3 p-4 border-t bg-gray-50">
              <button
                onClick={cancelImage}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={insertImage}
                disabled={!selectedImage}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Components */}
      <LinkModal
        showLinkModal={showLinkModal}
        linkText={linkText}
        linkUrl={linkUrl}
        onLinkTextChange={setLinkText}
        onLinkUrlChange={setLinkUrl}
        onInsertLink={insertLinkHook}
        onCancel={cancelLinkHook}
        onKeyDown={handleLinkModalKeyDownHook}
      />

      <FormulaModal
        showFormulaModal={showFormulaModal}
        latexInput={latexInput}
        onLatexInputChange={setLatexInput}
        onInsertFormula={insertFormulaHook}
        onCancel={cancelFormulaHook}
        renderLatex={renderLatexHook}
        onKeyDown={handleFormulaModalKeyDownHook}
      />

      <TableModal
        showTableModal={showTableModal}
        tableRows={tableRows}
        tableCols={tableCols}
        onTableRowsChange={setTableRows}
        onTableColsChange={setTableCols}
        onInsertTable={insertTableHook}
        onCancel={cancelTableHook}
        onKeyDown={handleTableModalKeyDownHook}
      />

      <FootnoteModal
        showFootnoteModal={showFootnoteModal}
        footnoteText={footnoteText}
        onFootnoteTextChange={setFootnoteText}
        onInsertFootnote={insertFootnoteHook}
        onCancel={cancelFootnoteHook}
        onKeyDown={handleFootnoteModalKeyDownHook}
      />

      <ColorModal
        showColorModal={showColorModal}
        selectedColor={selectedColor}
        customColor={customColor}
        onApplyColor={applyColor}
        onCancel={cancelColor}
        onColorChange={handleColorChange}
        onKeyDown={handleColorModalKeyDownHook}
      />

      <ImageModal
        showImageModal={showImageModal}
        selectedImage={selectedImage}
        imagePreview={imagePreview || ""}
        isDragOver={isDragOver}
        onFileSelect={handleFileSelectHook}
        onDrop={handleDropHook}
        onDragOver={handleDragOverHook}
        onDragLeave={handleDragLeaveHook}
        onPaste={handlePasteHook}
        onInsertImage={insertImageHook}
        onCancel={cancelImageHook}
        onRemoveImage={() => {}}
        onKeyDown={handleImageModalKeyDownHook}
      />

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div 
            ref={helpModalRef}
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            tabIndex={-1}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault()
                setShowHelpModal(false)
              }
            }}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Keyboard Shortcuts</h2>
                <button 
                  onClick={() => setShowHelpModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                {/* Text Formatting */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Text Formatting</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded">
                      <span className="text-gray-700">Bold text</span>
                      <kbd className="px-2 py-1 bg-gray-200 rounded text-sm font-mono">Ctrl+B</kbd>
                    </div>
                    <div className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded">
                      <span className="text-gray-700">Italic text</span>
                      <kbd className="px-2 py-1 bg-gray-200 rounded text-sm font-mono">Ctrl+I</kbd>
                    </div>
                  </div>
                </div>

                {/* Editor Actions */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Editor Actions</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded">
                      <span className="text-gray-700">Undo</span>
                      <kbd className="px-2 py-1 bg-gray-200 rounded text-sm font-mono">Ctrl+Z</kbd>
                    </div>
                    <div className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded">
                      <span className="text-gray-700">Redo</span>
                      <kbd className="px-2 py-1 bg-gray-200 rounded text-sm font-mono">Ctrl+Y</kbd>
                    </div>
                    <div className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded">
                      <span className="text-gray-700">Save post</span>
                      <kbd className="px-2 py-1 bg-gray-200 rounded text-sm font-mono">Ctrl+S</kbd>
                    </div>
                  </div>
                </div>

                {/* Modal Controls */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Modal Controls</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded">
                      <span className="text-gray-700">Close any modal</span>
                      <kbd className="px-2 py-1 bg-gray-200 rounded text-sm font-mono">Esc</kbd>
                    </div>
                  </div>
                </div>

                {/* Additional Information */}
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> On Mac, use <kbd className="px-1 py-0.5 bg-blue-200 rounded text-xs">Cmd</kbd> instead of <kbd className="px-1 py-0.5 bg-blue-200 rounded text-xs">Ctrl</kbd> for all shortcuts.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
