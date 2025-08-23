export interface ImageUploadResult {
  url: string
  key: string
  filename: string
}

export interface ImageUploadState {
  uploading: boolean
  error: string | null
  progress?: number
}

export interface DragDropHandlers {
  onDragEnter: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
}

export interface ImagePreviewData {
  file: File
  preview: string
  size: string
  type: string
}
