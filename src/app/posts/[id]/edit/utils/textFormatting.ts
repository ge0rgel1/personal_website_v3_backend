import React from 'react'

// Types for text formatting functions
export interface TextPosition {
  start: number
  end: number
}

export interface FormattingContext {
  content: string
  textarea: HTMLTextAreaElement
  onContentChange: (newContent: string) => void
  onComplete?: () => void
}

/**
 * Utility function to find line boundaries
 */
export const getLineBoundaries = (content: string, position: number) => {
  let lineStart = position
  while (lineStart > 0 && content[lineStart - 1] !== '\n') {
    lineStart--
  }

  let lineEnd = position
  while (lineEnd < content.length && content[lineEnd] !== '\n') {
    lineEnd++
  }

  return { lineStart, lineEnd }
}

/**
 * Utility function to set cursor position
 */
export const setCursorPosition = (textarea: HTMLTextAreaElement, position: number) => {
  setTimeout(() => {
    textarea.focus()
    textarea.setSelectionRange(position, position)
  }, 0)
}

/**
 * Apply heading formatting to the current line
 */
export const applyHeadingUtility = (level: number, context: FormattingContext) => {
  const { content, textarea, onContentChange, onComplete } = context

  const start = textarea.selectionStart
  const end = textarea.selectionEnd

  // Find the start of the current line
  let lineStart = start
  while (lineStart > 0 && content[lineStart - 1] !== '\n') {
    lineStart--
  }

  // Find the end of the current line
  let lineEnd = end
  while (lineEnd < content.length && content[lineEnd] !== '\n') {
    lineEnd++
  }

  // Get the current line content
  const currentLine = content.substring(lineStart, lineEnd)
  
  // Remove existing heading markers if any
  const cleanLine = currentLine.replace(/^#{1,6}\s*/, '')
  
  // Create new line with heading markers
  const headingMarkers = '#'.repeat(level)
  const newLine = level === 0 ? cleanLine : `${headingMarkers} ${cleanLine}`
  
  // Replace the line in the content
  const newContent = 
    content.substring(0, lineStart) + 
    newLine + 
    content.substring(lineEnd)
  
  // Update content
  onContentChange(newContent)
  
  // Calculate new cursor position
  const newCursorPos = lineStart + newLine.length
  
  // Restore focus and cursor position
  setTimeout(() => {
    textarea.focus()
    textarea.setSelectionRange(newCursorPos, newCursorPos)
  }, 0)
  
  // Call completion callback
  onComplete?.()
}

/**
 * Apply bold formatting to selected text
 */
export const applyBold = (context: FormattingContext) => {
  const { content, textarea, onContentChange } = context
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  
  // Only apply if there's a selection
  if (start === end) return

  const before = content.slice(0, start)
  const selected = content.slice(start, end)
  const after = content.slice(end)

  const isWrapped = before.endsWith('**') && after.startsWith('**')
  const newContent = isWrapped
    ? before.slice(0, -2) + selected + after.slice(2)  // unwrap
    : before + '**' + selected + '**' + after          // wrap

  onContentChange(newContent)
  
  const newCursorPos = isWrapped 
    ? start - 2 + selected.length 
    : start + selected.length + 4
  
  setCursorPosition(textarea, newCursorPos)
}

/**
 * Apply italic formatting to selected text
 */
export const applyItalics = (context: FormattingContext) => {
  const { content, textarea, onContentChange } = context
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  
  // Only apply if there's a selection
  if (start === end) return

  const before = content.slice(0, start)
  const selected = content.slice(start, end)
  const after = content.slice(end)

  // Check if wrapped with single asterisks (but not double)
  const isWrapped = before.endsWith('*') && !before.endsWith('**') && 
                   after.startsWith('*') && !after.startsWith('**')
  
  const newContent = isWrapped
    ? before.slice(0, -1) + selected + after.slice(1)  // unwrap
    : before + '*' + selected + '*' + after            // wrap

  onContentChange(newContent)
  
  const newCursorPos = isWrapped 
    ? start - 1 + selected.length 
    : start + selected.length + 2
  
  setCursorPosition(textarea, newCursorPos)
}

/**
 * Apply list formatting to selected lines
 */
export const applyListUtility = (
  listType: 'ordered' | 'unordered',
  context: FormattingContext
) => {
  const { content, textarea, onContentChange, onComplete } = context
  const start = textarea.selectionStart
  const end = textarea.selectionEnd

  // Get the line boundaries for the entire selection
  let lineStart = start
  while (lineStart > 0 && content[lineStart - 1] !== '\n') {
    lineStart--
  }

  let lineEnd = end
  while (lineEnd < content.length && content[lineEnd] !== '\n') {
    lineEnd++
  }

  // Get all lines in the selection
  const selectedText = content.substring(lineStart, lineEnd)
  const lines = selectedText.split('\n')
  
  // Process each line
  const processedLines = lines.map((line, index) => {
    // Remove existing list markers if any
    const cleanLine = line.replace(/^\s*[\-\*\+]\s*/, '').replace(/^\s*\d+\.\s*/, '')
    
    if (listType === 'ordered') {
      return `${index + 1}. ${cleanLine}`
    } else {
      return `- ${cleanLine}`
    }
  })

  // Join the lines back together
  const newText = processedLines.join('\n')
  
  // Replace the selected lines in the content
  const newContent = 
    content.substring(0, lineStart) + 
    newText + 
    content.substring(lineEnd)
  
  onContentChange(newContent)
  
  // Maintain the selection by calculating how much content was added
  const originalLength = lineEnd - lineStart
  const newLength = newText.length
  const addedLength = newLength - originalLength
  
  // Store the current scroll position before focusing
  const scrollTop = textarea.scrollTop
  
  // Restore selection, adjusting for the added list markers
  setTimeout(() => {
    const newStart = start
    const newEnd = end + addedLength
    textarea.setSelectionRange(newStart, newEnd)
    
    // Restore the scroll position after setting selection
    textarea.scrollTop = scrollTop
  }, 0)
  
  // Call completion callback
  onComplete?.()
}

/**
 * Apply quotation formatting to selected lines
 */
export const applyQuotation = (context: FormattingContext) => {
  const { content, textarea, onContentChange } = context
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  
  // Only apply quotation if there's a text selection
  if (start === end) return

  const { lineStart, lineEnd } = getLineBoundaries(content, start)

  // Get all lines in the selection
  const selectedText = content.substring(lineStart, lineEnd)
  const lines = selectedText.split('\n')
  
  // Process each line - add quotation marker
  const processedLines = lines.map(line => {
    // Remove existing quotation marker if any
    const cleanLine = line.replace(/^\s*>\s*/, '')
    return `> ${cleanLine}`
  })

  // Join the lines back together
  const quotedText = processedLines.join('\n')
  
  // Replace the selected text with quotation formatting
  const newContent = 
    content.substring(0, lineStart) + 
    quotedText + 
    content.substring(lineEnd)
  
  onContentChange(newContent)
  
  // Calculate new cursor position (after the quotation formatting)
  const newCursorPos = lineStart + quotedText.length
  setCursorPosition(textarea, newCursorPos)
}

/**
 * Apply inline code formatting to selected text
 */
export const applyCode = (context: FormattingContext) => {
  const { content, textarea, onContentChange } = context
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  
  // Only apply code if there's a text selection
  if (start === end) return

  const selectedText = content.substring(start, end)
  
  // Wrap the selected text with backticks
  const codeText = `\`${selectedText}\``
  
  // Replace the selected text with code formatting
  const newContent = 
    content.substring(0, start) + 
    codeText + 
    content.substring(end)
  
  onContentChange(newContent)
  
  // Calculate new cursor position (after the code formatting)
  const newCursorPos = start + codeText.length
  setCursorPosition(textarea, newCursorPos)
}

/**
 * Apply strikethrough formatting to selected text
 */
export const applyStrikethrough = (context: FormattingContext) => {
  const { content, textarea, onContentChange } = context
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  
  // Only apply if there's a selection
  if (start === end) return

  const before = content.slice(0, start)
  const selected = content.slice(start, end)
  const after = content.slice(end)

  const isWrapped = before.endsWith('~~') && after.startsWith('~~')
  const newContent = isWrapped
    ? before.slice(0, -2) + selected + after.slice(2)  // unwrap
    : before + '~~' + selected + '~~' + after          // wrap

  onContentChange(newContent)
  
  const newCursorPos = isWrapped 
    ? start - 2 + selected.length 
    : start + selected.length + 4
  
  setCursorPosition(textarea, newCursorPos)
}
