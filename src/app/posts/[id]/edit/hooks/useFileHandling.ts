import { useCallback } from 'react'

interface FileHandlingParams {
  setSelectedImage: (image: File | null) => void
  setImagePreview: (preview: string | null) => void
  setIsDragOver: (dragOver: boolean) => void
}

export const useFileHandling = (params: FileHandlingParams) => {
  const { setSelectedImage, setImagePreview, setIsDragOver } = params

  // Process image file (from file input, drag & drop, or clipboard)
  const processImageFile = useCallback((file: File) => {
    setSelectedImage(file)
    
    // Create preview URL
    const previewUrl = URL.createObjectURL(file)
    setImagePreview(previewUrl)
  }, [setSelectedImage, setImagePreview])

  // Handle file selection from file input
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      processImageFile(file)
    }
  }, [processImageFile])

  // Handle drag and drop events
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [setIsDragOver])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [setIsDragOver])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      if (file.type.startsWith('image/')) {
        processImageFile(file)
      }
    }
  }, [setIsDragOver, processImageFile])

  // Handle clipboard paste
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
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
  }, [processImageFile])

  return {
    processImageFile,
    handleFileSelect,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handlePaste
  }
}
