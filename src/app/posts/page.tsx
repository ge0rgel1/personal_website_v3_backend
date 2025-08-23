'use client'

import { useState, useEffect } from 'react'
import Toast from '../../components/Toast'

interface Post {
  id: number
  slug: string
  title: string
  excerpt: string | null
  content_md: string
  status: 'draft' | 'published' | 'archived'
  author: string
  read_time_minutes: number | null
  cover_image_url: string | null
  published_at: string | null
  view_count: number
  created_at: string
  updated_at: string
  tags: Array<{
    id: number
    name: string
    slug: string
    background_color: string
    text_color: string
  }>
}

interface ToastState {
  show: boolean
  message: string
  type: 'success' | 'error'
}

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('newest')
  const [deleteConfirm, setDeleteConfirm] = useState<{show: boolean, post: Post | null}>({show: false, post: null})
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState<ToastState>({ show: false, message: '', type: 'success' })
  const [showNewPostModal, setShowNewPostModal] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [creatingBlankPost, setCreatingBlankPost] = useState(false)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<Post | null>(null)
  const [templateSearch, setTemplateSearch] = useState('')
  const [creatingFromTemplate, setCreatingFromTemplate] = useState(false)
  const [statusDropdownOpen, setStatusDropdownOpen] = useState<number | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null)
  const [editingReadTime, setEditingReadTime] = useState<number | null>(null)
  const [readTimeInputValue, setReadTimeInputValue] = useState<string>('')
  const [updatingReadTime, setUpdatingReadTime] = useState<number | null>(null)
  const [editingTitle, setEditingTitle] = useState<number | null>(null)
  const [titleInputValue, setTitleInputValue] = useState<string>('')
  const [updatingTitle, setUpdatingTitle] = useState<number | null>(null)

  useEffect(() => {
    fetchPosts()
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusDropdownOpen && !(event.target as Element).closest('.status-dropdown')) {
        setStatusDropdownOpen(null)
      }
      if (editingReadTime && !(event.target as Element).closest('.read-time-editor')) {
        handleReadTimeCancel()
      }
      if (editingTitle && !(event.target as Element).closest('.title-editor')) {
        handleTitleUpdate(editingTitle)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [statusDropdownOpen, editingReadTime, editingTitle, titleInputValue, posts])

  const fetchPosts = async () => {
    try {
      setError(null)
      const response = await fetch('/api/posts')
      if (!response.ok) {
        throw new Error('Failed to fetch posts')
      }
      const data = await response.json()
      setPosts(data.posts)
    } catch (error) {
      console.error('Error fetching posts:', error)
      setError('Failed to load posts')
    } finally {
      setLoading(false)
    }
  }

  const filteredAndSortedPosts = posts
    .filter(post => {
      const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (post.excerpt && post.excerpt.toLowerCase().includes(searchTerm.toLowerCase())) ||
        post.tags.some(tag => tag.name.toLowerCase().includes(searchTerm.toLowerCase()))
      
      const matchesStatus = statusFilter === 'all' || post.status === statusFilter
      
      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'title':
          return a.title.localeCompare(b.title)
        case 'views':
          return b.view_count - a.view_count
        default:
          return 0
      }
    })

  const handleEdit = (postId: number) => {
    // Navigate to edit page
    window.location.href = `/posts/${postId}/edit`
  }

  const handleDeleteClick = (post: Post) => {
    setDeleteConfirm({show: true, post})
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.post) return
    
    setDeleting(true)
    try {
      const response = await fetch(`/api/posts?id=${deleteConfirm.post.id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete post')
      }
      
      const result = await response.json()
      
      // Remove post from local state
      setPosts(posts.filter(post => post.id !== deleteConfirm.post!.id))
      
      // Close modal
      setDeleteConfirm({show: false, post: null})
      
      // Show success message
      setToast({ show: true, message: result.message, type: 'success' })
      
    } catch (error) {
      console.error('Error deleting post:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete post'
      setToast({ show: true, message: errorMessage, type: 'error' })
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteConfirm({show: false, post: null})
  }

  const handleStatusUpdate = async (postId: number, newStatus: 'draft' | 'published' | 'archived') => {
    setUpdatingStatus(postId)
    try {
      const response = await fetch(`/api/posts?id=${postId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update post status')
      }
      
      // Update post in local state
      setPosts(posts.map(post => 
        post.id === postId ? { ...post, status: newStatus } : post
      ))
      
      // Close dropdown
      setStatusDropdownOpen(null)
      
      // Show success message
      setToast({ show: true, message: 'Status updated successfully', type: 'success' })
      
    } catch (error) {
      console.error('Error updating post status:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to update status'
      setToast({ show: true, message: errorMessage, type: 'error' })
    } finally {
      setUpdatingStatus(null)
    }
  }

  const handleReadTimeEdit = (postId: number, currentReadTime: number | null) => {
    setEditingReadTime(postId)
    setReadTimeInputValue(currentReadTime?.toString() || '1')
  }

  const handleReadTimeUpdate = async (postId: number) => {
    setUpdatingReadTime(postId)
    try {
      // Parse the input value to integer
      let readTime = 1 // default value
      const inputValue = readTimeInputValue.trim()
      
      if (inputValue) {
        const parsedValue = parseFloat(inputValue)
        if (!isNaN(parsedValue)) {
          readTime = Math.floor(Math.abs(parsedValue)) || 1 // Take integer part, ensure positive, default to 1 if 0
        }
      }

      const response = await fetch(`/api/posts?id=${postId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ read_time_minutes: readTime }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update read time')
      }
      
      // Update post in local state
      setPosts(posts.map(post => 
        post.id === postId ? { ...post, read_time_minutes: readTime } : post
      ))
      
      // Close edit mode
      setEditingReadTime(null)
      setReadTimeInputValue('')
      
      // Show success message
      setToast({ show: true, message: 'Read time updated successfully', type: 'success' })
      
    } catch (error) {
      console.error('Error updating read time:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to update read time'
      setToast({ show: true, message: errorMessage, type: 'error' })
    } finally {
      setUpdatingReadTime(null)
    }
  }

  const handleReadTimeCancel = () => {
    setEditingReadTime(null)
    setReadTimeInputValue('')
  }

  const handleTitleEdit = (postId: number, currentTitle: string) => {
    setEditingTitle(postId)
    setTitleInputValue(currentTitle)
  }

  const handleTitleUpdate = async (postId: number) => {
    // Don't update if the title hasn't changed or is empty
    const trimmedTitle = titleInputValue.trim()
    const currentPost = posts.find(p => p.id === postId)
    
    if (!trimmedTitle || trimmedTitle === currentPost?.title) {
      setEditingTitle(null)
      setTitleInputValue('')
      return
    }

    setUpdatingTitle(postId)
    try {
      const response = await fetch(`/api/posts?id=${postId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: trimmedTitle }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update title')
      }
      
      // Update post in local state
      setPosts(posts.map(post => 
        post.id === postId ? { ...post, title: trimmedTitle } : post
      ))
      
      // Show success message
      setToast({ show: true, message: 'Title updated successfully', type: 'success' })
      
    } catch (error) {
      console.error('Error updating title:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to update title'
      setToast({ show: true, message: errorMessage, type: 'error' })
      
      // Revert the input value on error
      setTitleInputValue(currentPost?.title || '')
    } finally {
      setUpdatingTitle(null)
      setEditingTitle(null)
      setTitleInputValue('')
    }
  }

  const handleTitleCancel = () => {
    setEditingTitle(null)
    setTitleInputValue('')
  }

  const handleNewPostOption = async (option: 'upload' | 'blank' | 'template') => {
    if (option === 'upload') {
      // Keep modal open for upload functionality
      return
    }
    
    if (option === 'blank') {
      setCreatingBlankPost(true)
      try {
        const response = await fetch('/api/posts/create-blank', {
          method: 'POST',
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to create blank post')
        }
        
        const result = await response.json()
        
        // Close modal and reset state
        setShowNewPostModal(false)
        setSelectedFile(null)
        setIsDragOver(false)
        setUploading(false)
        setCreatingBlankPost(false)
        
        // Navigate to edit page for the new post
        window.location.href = `/posts/${result.post.id}/edit`
        
      } catch (error) {
        console.error('Error creating blank post:', error)
        setToast({ show: true, message: error instanceof Error ? error.message : 'Failed to create blank post', type: 'error' })
        setCreatingBlankPost(false)
      }
      return
    }
    
    if (option === 'template') {
      setShowTemplateModal(true)
      return
    }
    
    setShowNewPostModal(false)
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === 'text/markdown') {
      setSelectedFile(file)
    } else if (file) {
      setToast({ show: true, message: 'Please select a markdown (.md) file', type: 'error' })
    }
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragOver(false)
    
    const files = event.dataTransfer.files
    const file = files[0]
    
    if (file && file.type === 'text/markdown') {
      setSelectedFile(file)
    } else if (file) {
      setToast({ show: true, message: 'Please select a markdown (.md) file', type: 'error' })
    }
  }

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragOver(false)
  }

  const handleClearFile = () => {
    setSelectedFile(null)
  }

  const handleUploadFile = async () => {
    if (!selectedFile) return
    
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      
      const response = await fetch('/api/posts/upload', {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to upload file')
      }
      
      const result = await response.json()
      
      // Close modal and reset state
      setShowNewPostModal(false)
      setSelectedFile(null)
      setIsDragOver(false)
      
      // Navigate to edit page for the new post
      window.location.href = `/posts/${result.post.id}/edit`
      
    } catch (error) {
      console.error('Error uploading file:', error)
      setToast({ show: true, message: error instanceof Error ? error.message : 'Failed to upload file', type: 'error' })
    } finally {
      setUploading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleCreateFromTemplate = async () => {
    if (!selectedTemplate) return
    
    setCreatingFromTemplate(true)
    try {
      const response = await fetch('/api/posts/create-from-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ templateId: selectedTemplate.id })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create post from template')
      }
      
      const result = await response.json()
      
      // Close modals and reset state
      setShowNewPostModal(false)
      setShowTemplateModal(false)
      setSelectedTemplate(null)
      setTemplateSearch('')
      setSelectedFile(null)
      setIsDragOver(false)
      setUploading(false)
      setCreatingBlankPost(false)
      setCreatingFromTemplate(false)
      
      // Navigate to edit page for the new post
      window.location.href = `/posts/${result.post.id}/edit`
      
    } catch (error) {
      console.error('Error creating post from template:', error)
      setToast({ show: true, message: error instanceof Error ? error.message : 'Failed to create post from template', type: 'error' })
      setCreatingFromTemplate(false)
    }
  }

  const filteredTemplates = posts.filter(post => 
    post.title.toLowerCase().includes(templateSearch.toLowerCase()) ||
    post.tags.some(tag => tag.name.toLowerCase().includes(templateSearch.toLowerCase()))
  )

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading posts</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              <button 
                onClick={fetchPosts}
                className="mt-2 bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm transition-colors duration-200"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
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
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Posts</h1>
            <p className="mt-2 text-gray-600">
              Manage your blog posts and articles
            </p>
          </div>
          <button 
            onClick={() => setShowNewPostModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
          >
            New Post
          </button>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Search posts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="title">Title A-Z</option>
            <option value="views">Most Views</option>
          </select>
        </div>

        {/* Posts Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                    Image
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Update
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Views
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Read Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tags
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedPosts.map((post) => (
                  <tr key={post.id} className="hover:bg-gray-50">
                    <td className="px-3 py-4 whitespace-nowrap">
                      <div className="w-12 h-8 flex-shrink-0">
                        {post.cover_image_url ? (
                          <img
                            src={post.cover_image_url}
                            alt={post.title}
                            className="w-12 h-8 object-cover rounded border border-gray-200"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                              const fallback = e.currentTarget.nextElementSibling as HTMLElement
                              if (fallback) fallback.classList.remove('hidden')
                            }}
                          />
                        ) : null}
                        <div className={`w-12 h-8 bg-gray-100 rounded border border-gray-200 flex items-center justify-center ${post.cover_image_url ? 'hidden' : ''}`}>
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="title-editor">
                        {editingTitle === post.id ? (
                          <input
                            type="text"
                            value={titleInputValue}
                            onChange={(e) => setTitleInputValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleTitleUpdate(post.id)
                              } else if (e.key === 'Escape') {
                                handleTitleCancel()
                              }
                            }}
                            onBlur={() => handleTitleUpdate(post.id)}
                            disabled={updatingTitle === post.id}
                            className="w-full px-2 py-1 text-sm font-medium border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                            placeholder="Enter title"
                            autoFocus
                          />
                        ) : (
                          <div
                            onDoubleClick={() => handleTitleEdit(post.id, post.title)}
                            className="text-left w-full hover:bg-gray-100 px-2 py-1 rounded transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 text-sm font-medium text-gray-900"
                            title="Double-click to edit"
                          >
                            {post.title}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap relative">
                      <div className="relative status-dropdown">
                        <button
                          onClick={() => setStatusDropdownOpen(statusDropdownOpen === post.id ? null : post.id)}
                          disabled={updatingStatus === post.id}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-all duration-200 hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                            post.status === 'published' ? 'bg-green-100 text-green-800' :
                            post.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          } ${updatingStatus === post.id ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                        >
                          {updatingStatus === post.id ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              Updating...
                            </>
                          ) : (
                            <>
                              {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
                              <svg className="ml-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </>
                          )}
                        </button>
                        
                        {statusDropdownOpen === post.id && (
                          <div className="absolute top-full left-0 mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                            <div className="py-2">
                              {(['published', 'draft', 'archived'] as const).map((status) => (
                                <button
                                  key={status}
                                  onClick={() => handleStatusUpdate(post.id, status)}
                                  disabled={updatingStatus === post.id}
                                  className={`w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50 flex items-center ${
                                    post.status === status ? 'bg-blue-50' : ''
                                  }`}
                                >
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    status === 'published' ? 'bg-green-100 text-green-800' :
                                    status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(post.updated_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {post.view_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="read-time-editor">
                        {editingReadTime === post.id ? (
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={readTimeInputValue}
                              onChange={(e) => setReadTimeInputValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleReadTimeUpdate(post.id)
                                } else if (e.key === 'Escape') {
                                  handleReadTimeCancel()
                                }
                              }}
                              disabled={updatingReadTime === post.id}
                              className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                              placeholder="1"
                              autoFocus
                            />
                            <span className="text-xs text-gray-400">min</span>
                            <div className="flex space-x-1">
                              <button
                                onClick={() => handleReadTimeUpdate(post.id)}
                                disabled={updatingReadTime === post.id}
                                className="p-1 text-green-600 hover:text-green-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                                title="Save"
                              >
                                {updatingReadTime === post.id ? (
                                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </button>
                              <button
                                onClick={handleReadTimeCancel}
                                disabled={updatingReadTime === post.id}
                                className="p-1 text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                                title="Cancel"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleReadTimeEdit(post.id, post.read_time_minutes)}
                            className="text-left hover:bg-gray-100 px-2 py-1 rounded transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                          >
                            {post.read_time_minutes ? `${post.read_time_minutes} min` : 'N/A'}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {post.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                            style={{ backgroundColor: tag.background_color, color: tag.text_color }}
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(post.id)}
                          className="text-blue-600 hover:text-blue-900 transition-colors duration-200"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteClick(post)}
                          className="text-red-600 hover:text-red-900 transition-colors duration-200"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {filteredAndSortedPosts.length === 0 && !loading && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No posts found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== 'all' ? 'Try adjusting your search or filters.' : 'Get started by creating a new post.'}
            </p>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm.show && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            {/* Modal panel */}
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-auto pointer-events-auto">
              <div className="p-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                      <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Delete Post
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Are you sure you want to delete &ldquo;{deleteConfirm.post?.title}&rdquo;? This action cannot be undone.
                    </p>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={handleDeleteCancel}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={handleDeleteConfirm}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:bg-red-400 disabled:cursor-not-allowed"
                  >
                    {deleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* New Post Modal */}
        {showNewPostModal && (
          <div 
            className="fixed inset-0 flex items-center justify-center p-4 z-50"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            onClick={() => {
              if (!uploading && !creatingBlankPost && !creatingFromTemplate) {
                setShowNewPostModal(false)
                setSelectedFile(null)
                setIsDragOver(false)
                setUploading(false)
                setCreatingBlankPost(false)
                setShowTemplateModal(false)
                setSelectedTemplate(null)
                setTemplateSearch('')
                setCreatingFromTemplate(false)
              }
            }}
          >
            <div 
              className="bg-white rounded-2xl p-8 max-w-4xl w-full mx-4 relative z-10 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Create New Post</h2>
                <p className="text-gray-600">Choose how you&apos;d like to create your new post</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Upload Markdown File Option */}
                <div className="col-span-1 md:col-span-3">
                  <div 
                    className={`border-2 border-dashed rounded-xl p-8 transition-all duration-200 ${
                      creatingBlankPost || creatingFromTemplate
                        ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                        : isDragOver 
                          ? 'border-blue-400 bg-blue-50' 
                          : selectedFile 
                            ? 'border-green-400 bg-green-50' 
                            : 'border-gray-300 hover:border-blue-300 hover:bg-blue-50 cursor-pointer'
                    }`}
                    onDrop={!creatingBlankPost && !creatingFromTemplate ? handleDrop : undefined}
                    onDragOver={!creatingBlankPost && !creatingFromTemplate ? handleDragOver : undefined}
                    onDragLeave={!creatingBlankPost && !creatingFromTemplate ? handleDragLeave : undefined}
                    onClick={() => {
                      if (!selectedFile && !uploading && !creatingBlankPost && !creatingFromTemplate) {
                        document.getElementById('file-upload')?.click()
                      }
                    }}
                  >
                    <input
                      id="file-upload"
                      type="file"
                      accept=".md,.markdown"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    
                    {!selectedFile ? (
                      <div className="text-center">
                        <div className="mx-auto w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {isDragOver ? 'Drop your markdown file here' : 'Upload by dragging or Select from folder'}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Import an existing markdown file to create a new post
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          Supports .md and .markdown files
                        </p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className={`mx-auto w-16 h-16 rounded-xl flex items-center justify-center mb-4 ${
                          uploading ? 'bg-blue-100' : 'bg-green-100'
                        }`}>
                          {uploading ? (
                            <svg className="w-8 h-8 text-blue-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          ) : (
                            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {uploading ? 'Uploading...' : 'File Selected'}
                        </h3>
                        <p className="text-sm text-gray-600 mb-1">{selectedFile.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
                        {uploading && (
                          <p className="text-xs text-blue-600 mt-2">Creating your post...</p>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {selectedFile && (
                    <div className="flex justify-center space-x-4 mt-6">
                      <button
                        onClick={handleUploadFile}
                        disabled={uploading || creatingBlankPost || creatingFromTemplate}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200 disabled:bg-blue-400 disabled:cursor-not-allowed"
                      >
                        {uploading ? 'Uploading...' : 'Upload'}
                      </button>
                      <button
                        onClick={handleClearFile}
                        disabled={uploading || creatingBlankPost || creatingFromTemplate}
                        className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors duration-200 disabled:bg-gray-50 disabled:cursor-not-allowed"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>

                {/* Other Options */}
                <div className="col-span-1 md:col-span-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Blank Post Option */}
                    <div 
                      onClick={() => handleNewPostOption('blank')}
                      className={`border-2 border-gray-200 rounded-xl p-6 transition-all duration-200 cursor-pointer group ${
                        creatingBlankPost 
                          ? 'border-green-400 bg-green-50 cursor-not-allowed' 
                          : 'hover:border-green-300 hover:bg-green-50'
                      }`}
                    >
                      <div className="text-center">
                        <div className={`mx-auto w-16 h-16 rounded-xl flex items-center justify-center mb-4 transition-colors duration-200 ${
                          creatingBlankPost 
                            ? 'bg-green-200' 
                            : 'bg-green-100 group-hover:bg-green-200'
                        }`}>
                          {creatingBlankPost ? (
                            <svg className="w-8 h-8 text-green-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          ) : (
                            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                          )}
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {creatingBlankPost ? 'Creating...' : 'Blank Post'}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {creatingBlankPost 
                            ? 'Setting up your blank post...' 
                            : 'Start with a completely blank post and write from scratch'
                          }
                        </p>
                      </div>
                    </div>

                    {/* Use Past Post Option */}
                    <div 
                      onClick={() => {
                        if (!uploading && !creatingBlankPost && !creatingFromTemplate) {
                          handleNewPostOption('template')
                        }
                      }}
                      className={`border-2 border-gray-200 rounded-xl p-6 transition-all duration-200 group ${
                        uploading || creatingBlankPost || creatingFromTemplate
                          ? 'cursor-not-allowed opacity-50'
                          : 'hover:border-purple-300 hover:bg-purple-50 cursor-pointer'
                      }`}
                    >
                      <div className="text-center">
                        <div className="mx-auto w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-purple-200 transition-colors duration-200">
                          <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Use Past Post</h3>
                        <p className="text-sm text-gray-600">Create a new post based on an existing post template</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => {
                    if (!uploading && !creatingBlankPost && !creatingFromTemplate) {
                      setShowNewPostModal(false)
                      setSelectedFile(null)
                      setIsDragOver(false)
                      setUploading(false)
                      setCreatingBlankPost(false)
                      setShowTemplateModal(false)
                      setSelectedTemplate(null)
                      setTemplateSearch('')
                      setCreatingFromTemplate(false)
                    }
                  }}
                  disabled={uploading || creatingBlankPost || creatingFromTemplate}
                  className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors duration-200 disabled:bg-gray-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Template Selection Modal */}
        {showTemplateModal && (
          <div 
            className="fixed inset-0 flex items-center justify-center p-4 z-50"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            onClick={() => {
              if (!creatingFromTemplate) {
                setShowTemplateModal(false)
                setSelectedTemplate(null)
                setTemplateSearch('')
              }
            }}
          >
            <div 
              className="bg-white rounded-2xl p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Template Post</h2>
                <p className="text-gray-600">Choose an existing post to use as a template</p>
              </div>
              
              {/* Search Bar */}
              <div className="mb-6">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search posts by title or tags..."
                    value={templateSearch}
                    onChange={(e) => setTemplateSearch(e.target.value)}
                    disabled={creatingFromTemplate}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Posts List */}
              <div className="flex-1 overflow-y-auto mb-6">
                <div className="space-y-3">
                  {filteredTemplates.map((post) => (
                    <div
                      key={post.id}
                      onClick={() => !creatingFromTemplate && setSelectedTemplate(post)}
                      className={`border-2 rounded-lg p-4 transition-all duration-200 cursor-pointer ${
                        selectedTemplate?.id === post.id
                          ? 'border-blue-500 bg-blue-50'
                          : creatingFromTemplate
                            ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                            : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 flex-1 mr-4">
                          {post.title}
                        </h3>
                        <span className="text-sm text-gray-500 whitespace-nowrap">
                          {new Date(post.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                      
                      {post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {post.tags.map((tag) => (
                            <span
                              key={tag.id}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                            >
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {filteredTemplates.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      {templateSearch ? 'No posts match your search.' : 'No posts available.'}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => {
                    if (!creatingFromTemplate) {
                      setShowTemplateModal(false)
                      setSelectedTemplate(null)
                      setTemplateSearch('')
                    }
                  }}
                  disabled={creatingFromTemplate}
                  className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors duration-200 disabled:bg-gray-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateFromTemplate}
                  disabled={!selectedTemplate || creatingFromTemplate}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200 disabled:bg-blue-400 disabled:cursor-not-allowed"
                >
                  {creatingFromTemplate ? 'Creating...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
