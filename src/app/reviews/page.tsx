'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Toast from '../../components/Toast'
import ConfirmationModal from '../../components/ConfirmationModal'

interface Tag {
  id: number
  name: string
  slug: string
  description?: string
  background_color: string
  text_color: string
}

interface Review {
  id: number
  object: string
  author?: string
  score: number
  review_text: string
  thumbnail?: string
  created_at: string
  tags?: Tag[]
}

interface ReviewsResponse {
  success: boolean
  reviews: Review[]
  totalCount: number
  totalPages: number
  currentPage: number
}

interface ToastState {
  show: boolean
  message: string
  type: 'success' | 'error'
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [selectedTag, setSelectedTag] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [toast, setToast] = useState<ToastState>({ show: false, message: '', type: 'success' })
  const [deleteConfirm, setDeleteConfirm] = useState<{show: boolean, review: Review | null}>({show: false, review: null})
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    fetchReviews()
    fetchTags()
  }, [searchTerm, selectedType, selectedTag, currentPage])

  const fetchReviews = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10'
      })

      if (searchTerm) params.append('search', searchTerm)
      if (selectedType) params.append('type', selectedType)
      if (selectedTag) params.append('tag', selectedTag)

      const response = await fetch(`/api/reviews?${params}`)
      const data: ReviewsResponse = await response.json()

      if (data.success) {
        setReviews(data.reviews || [])
        setTotalPages(data.totalPages || 1)
        setTotalCount(data.totalCount || 0)
      } else {
        setError('Failed to load reviews')
        setReviews([])
        setTotalPages(1)
        setTotalCount(0)
      }
    } catch (err) {
      setError('Error loading reviews')
      setReviews([])
      setTotalPages(1)
      setTotalCount(0)
      console.error('Error fetching reviews:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchTags = async () => {
    try {
      const response = await fetch('/api/tags')
      const data = await response.json()
      if (data.success) {
        setAllTags(data.tags || [])
      }
    } catch (err) {
      console.error('Error fetching tags:', err)
    }
  }

  const handleDeleteClick = (review: Review) => {
    setDeleteConfirm({ show: true, review })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.review) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/reviews/${deleteConfirm.review.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchReviews()
        setToast({ show: true, message: 'Review deleted successfully', type: 'success' })
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete review')
      }
    } catch (err) {
      console.error('Error deleting review:', err)
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setToast({ show: true, message: errorMessage, type: 'error' })
    } finally {
      setIsDeleting(false)
      setDeleteConfirm({ show: false, review: null })
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    fetchReviews()
  }

  const clearFilters = () => {
    setSearchTerm('')
    setSelectedType('')
    setSelectedTag('')
    setCurrentPage(1)
  }

  const formatScore = (score?: number) => {
    if (score === null || score === undefined) return 'No score'
    return `${score}/10`
  }

  const getScoreColor = (score?: number) => {
    if (!score) return 'text-gray-500 bg-gray-50'
    if (score >= 8) return 'text-green-600 bg-green-50'
    if (score >= 6) return 'text-yellow-600 bg-yellow-50'
    if (score >= 4) return 'text-orange-600 bg-orange-50'
    return 'text-red-600 bg-red-50'
  }

  if (loading && (!reviews || reviews.length === 0)) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center">Loading reviews...</div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen">
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, show: false })}
        />
      )}

      <ConfirmationModal
        isOpen={deleteConfirm.show}
        onClose={() => setDeleteConfirm({ show: false, review: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Review"
        message={`Are you sure you want to delete the review for "${deleteConfirm.review?.object}"? This action cannot be undone.`}
        isConfirming={isDeleting}
      />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Reviews</h1>
          <Link
            href="/reviews/new"
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Add New Review
          </Link>
        </div>

        {/* Search and Filter Controls */}
        <div className="mb-6 space-y-4">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <input
              type="text"
              placeholder="Search reviews..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Search
            </button>
          </form>

          <div className="flex gap-4 flex-wrap">
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value)
                setCurrentPage(1)
              }}
              className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            >
              <option value="">All Authors</option>
              <option value="Nintendo">Nintendo</option>
              <option value="Luigi Rossi">Luigi Rossi</option>
              <option value="Vincent van Gogh">Vincent van Gogh</option>
            </select>

            <select
              value={selectedTag}
              onChange={(e) => {
                setSelectedTag(e.target.value)
                setCurrentPage(1)
              }}
              className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            >
              <option value="">All Tags</option>
              {allTags.map(tag => (
                <option key={tag.id} value={tag.slug}>
                  {tag.name}
                </option>
              ))}
            </select>

            {(searchTerm || selectedType || selectedTag) && (
              <button
                onClick={clearFilters}
                className="px-3 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Results Summary */}
        <div className="mb-4 text-sm text-gray-600">
          Showing {reviews?.length || 0} of {totalCount} reviews
          {searchTerm && ` matching "${searchTerm}"`}
          {selectedType && ` by ${selectedType}`}
          {selectedTag && ` tagged with "${selectedTag}"`}
        </div>

        {/* Reviews List */}
        <div className="space-y-4">
          {reviews && reviews.map((review) => (
            <article
              key={review.id}
              className="bg-white shadow rounded-lg overflow-hidden hover:shadow-md transition-shadow duration-200"
            >
              <div className="p-6">
                <div className="flex gap-6">
                  {/* Thumbnail - Left Side */}
                  <div className="flex-shrink-0">
                    {review.thumbnail ? (
                      <img
                        src={review.thumbnail}
                        alt={review.object}
                        className="w-32 h-32 object-contain rounded-lg shadow-sm bg-gray-50"
                        onError={(e) => {
                          console.log('Image failed to load:', review.thumbnail)
                          e.currentTarget.style.display = 'none'
                          const fallback = e.currentTarget.nextElementSibling as HTMLElement
                          if (fallback) fallback.classList.remove('hidden')
                        }}
                      />
                    ) : null}
                    <div className={`w-32 h-32 bg-gray-200 rounded-lg flex items-center justify-center ${review.thumbnail ? 'hidden' : ''}`}>
                      <span className="text-gray-400 text-xs text-center">No Image</span>
                    </div>
                  </div>

                  {/* Content - Right Side */}
                  <div className="flex-1 min-w-0 relative">
                    {/* Header with object name, author, and score */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-bold text-gray-900 truncate">
                          {review.object}
                        </h3>
                        {review.author && (
                          <p className="text-sm text-gray-600 mt-1">
                            by {review.author}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <div className={`px-3 py-1 rounded-full text-sm font-bold ${getScoreColor(review.score)}`}>
                          {formatScore(review.score)}
                        </div>
                        <time className="text-sm text-gray-500 whitespace-nowrap">
                          {new Date(review.created_at).toLocaleDateString()}
                        </time>
                      </div>
                    </div>

                    {/* Review text */}
                    <p className="text-gray-700 text-sm leading-relaxed mb-3 whitespace-pre-wrap">
                      {review.review_text}
                    </p>

                    {/* Tags */}
                    {review.tags && review.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {review.tags.map((tag) => (
                          <span
                            key={tag.id}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                            style={{ backgroundColor: tag.background_color, color: tag.text_color }}
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Edit/Delete buttons - Bottom Right */}
                    <div className="absolute bottom-0 right-0 flex gap-2">
                      <Link href={`/reviews/${review.id}/edit`}>
                        <span className="text-blue-500 hover:text-blue-700 cursor-pointer">Edit</span>
                      </Link>
                      <button
                        onClick={() => handleDeleteClick(review)}
                        className="text-red-500 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        {(!reviews || reviews.length === 0) && !loading && (
          <div className="text-center py-8 text-gray-500">
            No reviews found.
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex justify-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = Math.max(1, Math.min(currentPage - 2 + i, totalPages - 4 + i))
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-3 py-2 border rounded ${
                    currentPage === pageNum
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              )
            })}

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
