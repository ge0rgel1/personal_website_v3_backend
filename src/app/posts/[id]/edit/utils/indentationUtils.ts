/**
 * Utility functions for text indentation in text editors
 */

interface TextAreaElement {
  value: string
  selectionStart: number
  selectionEnd: number
  setSelectionRange: (start: number, end: number) => void
}

/**
 * Adds 4 spaces at the beginning of each selected line
 */
export const indentText = (textarea: TextAreaElement): string => {
  const { value, selectionStart, selectionEnd } = textarea
  
  // Get the text before, selected, and after
  const beforeSelection = value.substring(0, selectionStart)
  const selectedText = value.substring(selectionStart, selectionEnd)
  const afterSelection = value.substring(selectionEnd)
  
  // Find the start of the first line in selection
  const firstLineStart = beforeSelection.lastIndexOf('\n') + 1
  const textFromFirstLine = value.substring(firstLineStart)
  
  // Split selected text into lines, including partial lines
  const fullSelectedText = beforeSelection.substring(firstLineStart) + selectedText
  const lines = fullSelectedText.split('\n')
  
  // Add 4 spaces to each line
  const indentedLines = lines.map(line => '    ' + line)
  
  // Calculate new text
  const beforeFirstLine = value.substring(0, firstLineStart)
  const newSelectedText = indentedLines.join('\n')
  const newValue = beforeFirstLine + newSelectedText + afterSelection
  
  // Calculate new cursor positions
  const addedSpaces = lines.length * 4
  const newSelectionStart = selectionStart + 4 // First line gets 4 spaces
  const newSelectionEnd = selectionEnd + addedSpaces
  
  // Set new selection
  setTimeout(() => {
    textarea.setSelectionRange(newSelectionStart, newSelectionEnd)
  }, 0)
  
  return newValue
}

/**
 * Removes up to 4 spaces from the beginning of each selected line
 */
export const unindentText = (textarea: TextAreaElement): string => {
  const { value, selectionStart, selectionEnd } = textarea
  
  // Get the text before, selected, and after
  const beforeSelection = value.substring(0, selectionStart)
  const selectedText = value.substring(selectionStart, selectionEnd)
  const afterSelection = value.substring(selectionEnd)
  
  // Find the start of the first line in selection
  const firstLineStart = beforeSelection.lastIndexOf('\n') + 1
  
  // Split selected text into lines, including partial lines
  const fullSelectedText = beforeSelection.substring(firstLineStart) + selectedText
  const lines = fullSelectedText.split('\n')
  
  // Remove up to 4 spaces from each line
  let totalRemovedSpaces = 0
  let firstLineRemovedSpaces = 0
  
  const unindentedLines = lines.map((line, index) => {
    // Count leading spaces (up to 4)
    let spacesToRemove = 0
    for (let i = 0; i < Math.min(4, line.length); i++) {
      if (line[i] === ' ') {
        spacesToRemove++
      } else {
        break
      }
    }
    
    if (index === 0) {
      firstLineRemovedSpaces = spacesToRemove
    }
    totalRemovedSpaces += spacesToRemove
    
    return line.substring(spacesToRemove)
  })
  
  // Calculate new text
  const beforeFirstLine = value.substring(0, firstLineStart)
  const newSelectedText = unindentedLines.join('\n')
  const newValue = beforeFirstLine + newSelectedText + afterSelection
  
  // Calculate new cursor positions
  const newSelectionStart = Math.max(firstLineStart, selectionStart - firstLineRemovedSpaces)
  const newSelectionEnd = selectionEnd - totalRemovedSpaces
  
  // Set new selection
  setTimeout(() => {
    textarea.setSelectionRange(newSelectionStart, newSelectionEnd)
  }, 0)
  
  return newValue
}
