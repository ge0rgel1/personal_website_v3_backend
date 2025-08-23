// Utilities for preprocessing markdown content before rendering

/**
 * Preprocess math content to ensure proper parsing
 * Handles both inline and display math blocks
 */
export const preprocessMathContent = (content: string): string => {
  // Ensure display math blocks are properly formatted and preserve newlines
  return content
    // Handle display math blocks ($$...$$) - preserve internal newlines and formatting
    .replace(/\$\$\s*([\s\S]*?)\s*\$\$/g, (match, math) => {
      const trimmedMath = math.trim()
      return `\n\n$$\n${trimmedMath}\n$$\n\n`
    })
    // Handle inline math ($...$) - remove internal newlines but preserve spaces
    .replace(/\$([^$\n]+)\$/g, (match, math) => `$${math.trim()}$`)
}

/**
 * Extract table of contents from markdown content
 * Returns array of heading objects with text, level, and id
 */
export const extractTableOfContents = (content: string) => {
  const headings: Array<{ text: string; level: number; id: string }> = []
  const lines = content.split('\n')
  
  lines.forEach((line) => {
    const match = line.match(/^(#{1,6})\s+(.+)$/)
    if (match) {
      const level = match[1].length
      const text = match[2].trim()
      const id = text.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')
      
      headings.push({ text, level, id })
    }
  })
  
  return headings
}

/**
 * Calculate estimated reading time based on word count
 * Assumes average reading speed of 200 words per minute
 */
export const calculateReadingTime = (content: string): number => {
  if (!content.trim()) return 0
  
  // Remove markdown syntax for more accurate word count
  const plainText = content
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/`[^`]+`/g, '') // Remove inline code
    .replace(/\$\$[\s\S]*?\$\$/g, '') // Remove display math
    .replace(/\$[^$]+\$/g, '') // Remove inline math
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Replace links with text
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '') // Remove images
    .replace(/#+\s/g, '') // Remove heading markers
    .replace(/[*_~`]/g, '') // Remove formatting markers
    .replace(/\n+/g, ' ') // Replace newlines with spaces
    .trim()
  
  const wordCount = plainText.split(/\s+/).filter(word => word.length > 0).length
  const readingTimeMinutes = Math.ceil(wordCount / 200)
  
  return Math.max(1, readingTimeMinutes) // Minimum 1 minute
}

/**
 * Format content for preview display
 * Truncates content and provides clean preview text
 */
export const formatPreviewContent = (content: string, maxLength: number = 300): string => {
  if (!content.trim()) return ''
  
  // Remove markdown syntax for clean preview
  const plainText = content
    .replace(/```[\s\S]*?```/g, '[code]') // Replace code blocks
    .replace(/`[^`]+`/g, '[code]') // Replace inline code
    .replace(/\$\$[\s\S]*?\$\$/g, '[formula]') // Replace display math
    .replace(/\$[^$]+\$/g, '[formula]') // Replace inline math
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Replace links with text
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '[image]') // Replace images
    .replace(/#+\s/g, '') // Remove heading markers
    .replace(/[*_~]/g, '') // Remove formatting markers
    .replace(/\n+/g, ' ') // Replace newlines with spaces
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
  
  if (plainText.length <= maxLength) {
    return plainText
  }
  
  // Truncate at word boundary
  const truncated = plainText.substring(0, maxLength)
  const lastSpace = truncated.lastIndexOf(' ')
  
  return lastSpace > 0 ? truncated.substring(0, lastSpace) + '...' : truncated + '...'
}
