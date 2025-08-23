'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import TagManager, { Tag } from '../../../components/TagManager'

export default function NewReviewPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    object: '',
    review_text: '',
    thumbnail: '',
    score: '',
    author: 'George Li'
  })
  const [selectedTags, setSelectedTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Image upload states
  const [thumbnailImage, setThumbnailImage] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const [thumbnailIsDragOver, setThumbnailIsDragOver] = useState(false)
  const [thumbnailMode, setThumbnailMode] = useState<'url' | 'upload'>('url')

  // Image upload functions
  const processThumbnailImageFile = (file: File) => {
    setThumbnailImage(file)
    
    // Create preview URL
    const previewUrl = URL.createObjectURL(file)
    setThumbnailPreview(previewUrl)
  }

  const handleThumbnailDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setThumbnailIsDragOver(true)
  }

  const handleThumbnailDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setThumbnailIsDragOver(false)
  }

  const handleThumbnailDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setThumbnailIsDragOver(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      if (file.type.startsWith('image/')) {
        processThumbnailImageFile(file)
      }
    }
  }

  const handleThumbnailFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      processThumbnailImageFile(file)
    }
  }

  const handleThumbnailModeChange = (mode: 'url' | 'upload') => {
    setThumbnailMode(mode)
    // Don't clear the data when switching modes - preserve the existing preview
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      let thumbnailUrl = formData.thumbnail

      // If user uploaded an image, upload it first
      if (thumbnailMode === 'upload' && thumbnailImage) {
        const imageFormData = new FormData()
        imageFormData.append('file', thumbnailImage)

        const uploadResponse = await fetch('/api/images/upload?folder=reviews', {
          method: 'POST',
          body: imageFormData,
        })

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json()
          throw new Error(errorData.error || 'Failed to upload thumbnail image')
        }

        const uploadData = await uploadResponse.json()
        thumbnailUrl = uploadData.image.url
      }

      const reviewData = {
        object: formData.object,
        author: formData.author,
        score: formData.score ? parseFloat(formData.score) : null,
        review_text: formData.review_text,
        thumbnail: thumbnailUrl || null,
        tag_ids: selectedTags.map(tag => tag.id)
      }

      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reviewData)
      })

      const data = await response.json()

      if (data.success) {
        router.push('/reviews')
      } else {
        setError(data.error || 'Failed to create review')
      }
    } catch (err) {
      console.error('Error creating review:', err)
      setError('Error creating review')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Create New Review</h1>
        <button
          onClick={() => router.back()}
          className="text-blue-500 hover:text-blue-600"
        >
          ← Back to Reviews
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Object/Title */}
          <div className="lg:col-span-2">
            <label htmlFor="object" className="block text-sm font-medium text-gray-700 mb-2">
              Title *
            </label>
            <input
              type="text"
              id="object"
              name="object"
              value={formData.object}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              placeholder="Enter review title"
            />
          </div>

          {/* Author */}
          <div>
            <label htmlFor="author" className="block text-sm font-medium text-gray-700 mb-2">
              Author *
            </label>
            <input
              type="text"
              id="author"
              name="author"
              value={formData.author}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              placeholder="Enter author name"
            />
          </div>

          {/* Score */}
          <div>
            <label htmlFor="score" className="block text-sm font-medium text-gray-700 mb-2">
              Score (0-10)
            </label>
            <input
              type="number"
              id="score"
              name="score"
              value={formData.score}
              onChange={handleInputChange}
              min="0"
              max="10"
              step="0.1"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              placeholder="Optional score from 0-10 (e.g., 8.5)"
            />
          </div>

          {/* Thumbnail */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Thumbnail Image
            </label>
            
            {/* Thumbnail Container - Preview and Input Side by Side */}
            <div className="flex gap-4 items-start">
              {/* Thumbnail Preview - Fixed Section */}
              <div className="flex-shrink-0 w-24">
                <div className="w-24 h-24 border border-gray-300 rounded bg-gray-50 flex items-center justify-center">
                  {((thumbnailMode === 'url' && formData.thumbnail) || (thumbnailMode === 'upload' && thumbnailPreview)) ? (
                    <img
                      src={thumbnailMode === 'url' ? formData.thumbnail : thumbnailPreview || ''}
                      alt="Thumbnail preview"
                      className="w-full h-full object-cover rounded"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  ) : (
                    <div className="text-gray-400 text-xs text-center">
                      No image
                    </div>
                  )}
                </div>
              </div>

              {/* Input Controls */}
              <div className="flex-1">
                <div className="h-24 flex flex-col">
                  {/* Mode Toggle */}
                  <div className="mb-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleThumbnailModeChange('url')}
                      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                        thumbnailMode === 'url'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Image URL
                    </button>
                    <button
                      type="button"
                      onClick={() => handleThumbnailModeChange('upload')}
                      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                        thumbnailMode === 'upload'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Upload Image
                    </button>
                  </div>

                  {/* Input Area - Flex grow to fill remaining space */}
                  <div className="flex-1">
                    {thumbnailMode === 'url' ? (
                      /* URL Input */
                      <input
                        type="url"
                        id="thumbnail"
                        name="thumbnail"
                        value={formData.thumbnail}
                        onChange={handleInputChange}
                        className="w-full h-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                        placeholder="Enter thumbnail image URL"
                      />
                    ) : (
                      /* File Upload */
                      <div
                        className={`h-full border-2 border-dashed p-2 text-center rounded transition-colors flex flex-col items-center justify-center ${
                          thumbnailIsDragOver ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300'
                        }`}
                        onDrop={handleThumbnailDrop}
                        onDragOver={handleThumbnailDragOver}
                        onDragLeave={handleThumbnailDragLeave}
                      >
                        {thumbnailImage ? (
                          <div className="text-center">
                            <div className="text-xs text-gray-600 mb-1">Selected: {thumbnailImage.name}</div>
                            <button
                              type="button"
                              onClick={() => {
                                setThumbnailImage(null)
                                setThumbnailPreview(null)
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
                                onClick={() => document.getElementById('thumbnail-file-input')?.click()}
                                className="text-indigo-500 hover:text-indigo-700"
                              >
                                browse
                              </button>
                            </div>
                          </div>
                        )}
                        <input
                          id="thumbnail-file-input"
                          type="file"
                          accept="image/*"
                          onChange={handleThumbnailFileSelect}
                          className="hidden"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Review Content */}
        <div>
          <label htmlFor="review_text" className="block text-sm font-medium text-gray-700 mb-2">
            Review Content *
          </label>
          <textarea
            id="review_text"
            name="review_text"
            value={formData.review_text}
            onChange={handleInputChange}
            required
            rows={12}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            placeholder="Write your review content here..."
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tags
          </label>
          <TagManager
            selectedTags={selectedTags}
            onTagsChange={setSelectedTags}
          />
        </div>

        {/* Submit Button */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Review'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
