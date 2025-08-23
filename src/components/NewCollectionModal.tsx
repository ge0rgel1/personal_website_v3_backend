'use client'

import { useState, useEffect } from 'react'

interface NewCollectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (collectionData: CollectionFormData) => void
}

interface CollectionFormData {
  title: string
  slug: string
  description: string
  cover_image_url: string
  is_public: boolean
}

export default function NewCollectionModal({ isOpen, onClose, onSubmit }: NewCollectionModalProps) {
  const [formData, setFormData] = useState<CollectionFormData>({
    title: '',
    slug: '',
    description: '',
    cover_image_url: '',
    is_public: true
  })
  const [coverImage, setCoverImage] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [coverMode, setCoverMode] = useState<'url' | 'upload'>('url')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Cleanup object URLs when component unmounts or modal closes
  useEffect(() => {
    return () => {
      if (coverPreview) {
        URL.revokeObjectURL(coverPreview)
      }
    }
  }, [coverPreview])

  if (!isOpen) return null

  const handleInputChange = (field: keyof CollectionFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleCoverModeChange = (mode: 'url' | 'upload') => {
    setCoverMode(mode)
    // Don't clear the data when switching modes - preserve the existing preview
  }

  const processImageFile = (file: File) => {
    setCoverImage(file)
    
    // Create preview URL
    const previewUrl = URL.createObjectURL(file)
    setCoverPreview(previewUrl)
  }

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      processImageFile(file)
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    }
    
    return newErrors
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const validationErrors = validateForm()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setIsSubmitting(true)
    
    try {
      let updatedData = { ...formData }

      // If there's a cover image to upload, upload it first
      if (coverMode === 'upload' && coverImage) {
        const uploadFormData = new FormData()
        uploadFormData.append('file', coverImage)

        const response = await fetch('/api/images/upload?folder=collections', {
          method: 'POST',
          body: uploadFormData,
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to upload cover image')
        }

        const data = await response.json()
        updatedData = { ...updatedData, cover_image_url: data.image.url }
      } else if (coverMode === 'url') {
        // Use the URL from the form
        updatedData = { ...updatedData, cover_image_url: formData.cover_image_url }
      }

      await onSubmit(updatedData)
      
      // Reset form
      setFormData({
        title: '',
        slug: '',
        description: '',
        cover_image_url: '',
        is_public: true
      })
      setCoverImage(null)
      if (coverPreview) {
        URL.revokeObjectURL(coverPreview)
      }
      setCoverPreview(null)
      setCoverMode('url')
      setErrors({})
      onClose()
    } catch (error) {
      console.error('Error creating collection:', error)
      alert(`Failed to create collection: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      title: '',
      slug: '',
      description: '',
      cover_image_url: '',
      is_public: true
    })
    setCoverImage(null)
    if (coverPreview) {
      URL.revokeObjectURL(coverPreview)
    }
    setCoverPreview(null)
    setCoverMode('url')
    setErrors({})
    onClose()
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Collection</h2>
          
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                errors.title ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter collection title"
            />
            {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
          </div>

          {/* Slug */}
          <div>
            <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-1">
              Slug
            </label>
            <input
              type="text"
              id="slug"
              value={formData.slug}
              onChange={(e) => handleInputChange('slug', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Leave blank to auto-generate"
            />
            <p className="text-gray-500 text-xs mt-1">URL-friendly identifier. Auto-generated if left blank.</p>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              placeholder="Optional description"
            />
          </div>

          {/* Cover Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cover Image
            </label>
            
            <div className="border border-gray-300 rounded-lg p-3">
              <div className="flex items-center h-10 mb-3">
                {/* Mode Toggle Buttons - Left Side */}
                <div className="flex space-x-1 mr-3">
                  <button
                    type="button"
                    onClick={() => handleCoverModeChange('url')}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      coverMode === 'url'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Image URL
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCoverModeChange('upload')}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      coverMode === 'upload'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Upload Image
                  </button>
                </div>

                {/* Input Area - Flex grow to fill remaining space */}
                <div className="flex-1">
                  {coverMode === 'url' ? (
                    /* URL Input */
                    <input
                      type="url"
                      value={formData.cover_image_url}
                      onChange={(e) => handleInputChange('cover_image_url', e.target.value)}
                      className="w-full h-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                      placeholder="Enter cover image URL"
                    />
                  ) : (
                    /* File Upload */
                    <div
                      className={`h-full border-2 border-dashed p-2 text-center rounded transition-colors flex flex-col items-center justify-center ${
                        isDragOver ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300'
                      }`}
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                    >
                      {coverImage ? (
                        <div className="text-center">
                          <div className="text-xs text-gray-600 mb-1">Selected: {coverImage.name}</div>
                          <button
                            type="button"
                            onClick={() => {
                              setCoverImage(null)
                              if (coverPreview) {
                                URL.revokeObjectURL(coverPreview)
                              }
                              setCoverPreview(null)
                            }}
                            className="text-red-500 hover:text-red-700 text-xs"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div className="text-center">
                          <div className="mb-1">📷</div>
                          <div className="text-gray-600 text-xs">
                            Drop image or{' '}
                            <button
                              type="button"
                              onClick={() => document.getElementById('file-input')?.click()}
                              className="text-indigo-500 hover:text-indigo-700"
                            >
                              browse
                            </button>
                          </div>
                        </div>
                      )}
                      <input
                        id="file-input"
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </div>
                  )}
                </div>
              </div>
              
              {/* Image Preview */}
              {((coverMode === 'url' && formData.cover_image_url) || (coverMode === 'upload' && coverPreview)) && (
                <div className="mt-3 border-t pt-3">
                  <div className="text-xs text-gray-600 mb-2">Preview:</div>
                  <div className="flex justify-center">
                    <img
                      src={coverMode === 'url' ? formData.cover_image_url : coverPreview || ''}
                      alt="Cover preview"
                      className="max-w-full max-h-32 object-contain rounded border"
                      onError={(e) => {
                        // Hide broken images
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Public/Private Toggle */}
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_public}
                onChange={(e) => handleInputChange('is_public', e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="ml-2 text-sm text-gray-700">Make collection public</span>
            </label>
          </div>

          {/* Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white py-2 px-4 rounded-lg font-medium transition-colors duration-200"
            >
              {isSubmitting ? 'Creating...' : 'Create'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="flex-1 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-800 py-2 px-4 rounded-lg font-medium transition-colors duration-200"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
