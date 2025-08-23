import { useCallback } from 'react'
import katex from 'katex'

export const useUtilityFunctions = () => {
  // LaTeX renderer for formula modal preview
  const renderLatex = useCallback((latex: string) => {
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
  }, [])

  // Format file size for display
  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }, [])

  // Check if file type is supported image
  const isImageFile = useCallback((file: File) => {
    return file.type.startsWith('image/')
  }, [])

  return {
    renderLatex,
    formatFileSize,
    isImageFile
  }
}
