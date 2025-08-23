import React, { useEffect, useRef } from 'react'
import { ImageModalState } from '../../types'

interface ImageModalProps extends ImageModalState {
  onInsertImage: () => void
  onCancel: () => void
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onPaste: (e: React.ClipboardEvent) => void
  onKeyDown: (e: React.KeyboardEvent) => void
  onRemoveImage: () => void
}

export const ImageModal: React.FC<ImageModalProps> = ({
  showImageModal,
  selectedImage,
  imagePreview,
  isDragOver,
  onInsertImage,
  onCancel,
  onFileSelect,
  onDragOver,
  onDragLeave,
  onDrop,
  onPaste,
  onKeyDown,
  onRemoveImage
}) => {
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (showImageModal && modalRef.current) {
      modalRef.current.focus()
    }
  }, [showImageModal])

  if (!showImageModal) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
      <div 
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden"
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        tabIndex={-1}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Insert Image</h3>
          <button
            onClick={onCancel}
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
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
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
                    onChange={onFileSelect}
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
                    onClick={onRemoveImage}
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
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={onInsertImage}
            disabled={!selectedImage}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}
