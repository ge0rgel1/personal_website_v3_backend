'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import TagManager, { Tag } from '../../../components/TagManager'
import Toast from '../../../components/Toast'
import ConfirmationModal from '../../../components/ConfirmationModal'

interface Collection {
  id: number
  title: string
  slug: string
  description: string
  cover_image_url: string
  is_public: boolean
  created_at: string
  updated_at: string
}

interface Post {
  id: number
  title: string
  slug: string
  excerpt: string
  cover_image_url: string
  status: string
  created_at: string
  updated_at: string
  position: number
  added_at: string
}

interface CollectionPageProps {
  params: Promise<{
    slug: string
  }>
}

interface ToastState {
  show: boolean
  message: string
  type: 'success' | 'error'
}

export default function CollectionDetailPage({ params }: CollectionPageProps) {
  const [collection, setCollection] = useState<Collection | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [slug, setSlug] = useState<string>('')
  const [draggedPost, setDraggedPost] = useState<Post | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [showAddPostsModal, setShowAddPostsModal] = useState(false)
  const [availablePosts, setAvailablePosts] = useState<Post[]>([])
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  
  // Edit collection modal state
  const [showEditModal, setShowEditModal] = useState(false)
  const [editFormData, setEditFormData] = useState({
    title: '',
    slug: '',
    description: '',
    cover_image_url: '',
    is_public: true
  })
  const [editCoverImage, setEditCoverImage] = useState<File | null>(null)
  const [editCoverPreview, setEditCoverPreview] = useState<string | null>(null)
  const [editIsDragOver, setEditIsDragOver] = useState(false)
  const [editCoverMode, setEditCoverMode] = useState<'url' | 'upload'>('url')
  const [selectedTags, setSelectedTags] = useState<Tag[]>([])
  const [isUpdating, setIsUpdating] = useState(false)
  const [toast, setToast] = useState<ToastState>({ show: false, message: '', type: 'success' })
  const [deleteCollectionConfirm, setDeleteCollectionConfirm] = useState(false)
  const [isDeletingCollection, setIsDeletingCollection] = useState(false)
  const [removePostConfirm, setRemovePostConfirm] = useState<{show: boolean, post: Post | null}>({show: false, post: null})
  const [isRemovingPost, setIsRemovingPost] = useState(false)

  useEffect(() => {
    const initializeParams = async () => {
      const resolvedParams = await params
      setSlug(resolvedParams.slug)
    }
    initializeParams()
  }, [params])

  useEffect(() => {
    if (slug) {
      fetchCollection()
    }
  }, [slug])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showAddPostsModal) {
        handleCloseAddModal()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [showAddPostsModal])

  const fetchCollection = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Fetch collection details
      const collectionResponse = await fetch(`/api/collections/${slug}`)
      
      if (!collectionResponse.ok) {
        if (collectionResponse.status === 404) {
          notFound()
        }
        throw new Error('Failed to fetch collection')
      }
      
      const collectionData = await collectionResponse.json()
      
      if (collectionData.success) {
        setCollection(collectionData.data)
        setPosts(collectionData.data.posts || [])
        
        // Fetch collection tags
        const tagsResponse = await fetch(`/api/collections/${slug}/tags`)
        if (tagsResponse.ok) {
          const tagsData = await tagsResponse.json()
          if (tagsData.success) {
            setSelectedTags(tagsData.tags || [])
          }
        }
      } else {
        throw new Error(collectionData.error || 'Failed to load collection')
      }
    } catch (error) {
      console.error('Error fetching collection:', error)
      setError('Failed to load collection')
    } finally {
      setLoading(false)
    }
  }

  const handleRemovePostClick = (post: Post) => {
    setRemovePostConfirm({ show: true, post });
  }

  const handleRemovePostConfirm = async () => {
    if (!removePostConfirm.post) return;
    
    setIsRemovingPost(true);
    try {
      const response = await fetch(`/api/collections/${slug}/posts`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ postId: removePostConfirm.post.id })
      });
      
      if (response.ok) {
        setPosts(posts.filter(post => post.id !== removePostConfirm.post!.id));
        setToast({ show: true, message: 'Post removed from collection.', type: 'success' });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove post');
      }
    } catch (error) {
      console.error('Error removing post from collection:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setToast({ show: true, message: errorMessage, type: 'error' });
    } finally {
      setIsRemovingPost(false);
      setRemovePostConfirm({ show: false, post: null });
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const handleDragStart = (e: React.DragEvent, post: Post) => {
    // console.log('Drag started for:', post.title)
    setDraggedPost(post)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', post.id.toString())
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear drag over if we're actually leaving the element (not just moving to a child)
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX
    const y = e.clientY
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverIndex(null)
    }
  }

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    e.stopPropagation()
    // console.log('Drop at index:', dropIndex)
    setDragOverIndex(null)
    
    if (!draggedPost) {
      console.log('No dragged post')
      return
    }
    
    const dragIndex = posts.findIndex(p => p.id === draggedPost.id)
    // console.log('Drag from index:', dragIndex, 'to index:', dropIndex)
    
    if (dragIndex === dropIndex) {
      setDraggedPost(null)
      return
    }
    
    // Optimistically update the UI
    const newPosts = [...posts]
    const [removed] = newPosts.splice(dragIndex, 1)
    newPosts.splice(dropIndex, 0, removed)
    
    // Update positions
    const updatedPosts = newPosts.map((post, index) => ({
      ...post,
      position: index + 1
    }))
    
    setPosts(updatedPosts)
    
    // Update positions on the server
    try {
      const response = await fetch(`/api/collections/${slug}/reorder`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          postIds: updatedPosts.map(p => p.id)
        })
      })
      
      if (!response.ok) {
        // Revert on error
        fetchCollection()
        console.error('Failed to update post order')
      }
    } catch (error) {
      // Revert on error
      fetchCollection()
      console.error('Error updating post order:', error)
    }
    
    setDraggedPost(null)
  }

  const handleEditPost = (postId: number) => {
    window.open(`/posts/${postId}/edit`, '_blank')
  }

  const handleDragEnd = () => {
    setDraggedPost(null)
    setDragOverIndex(null)
  }

  const fetchAvailablePosts = async () => {
    try {
      setLoadingPosts(true)
      // Only fetch published posts for collection addition
      const response = await fetch('/api/posts?status=published')
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Posts API response:', response.status, errorText)
        throw new Error(`Failed to fetch posts: ${response.status}`)
      }
      
      const data = await response.json()
      // console.log('Posts API data:', data)
      
      // Backend posts API returns { posts: [...] } format
      if (data.posts) {
        // Filter out posts that are already in the collection
        const currentPostIds = posts.map(p => p.id)
        const filteredPosts = data.posts.filter((post: Post) => !currentPostIds.includes(post.id))
        setAvailablePosts(filteredPosts)
      } else {
        console.error('Posts API error: No posts field in response', data)
        throw new Error('Invalid response format from posts API')
      }
    } catch (error) {
      console.error('Error fetching available posts:', error)
      // Set empty array instead of keeping loading state
      setAvailablePosts([])
    } finally {
      setLoadingPosts(false)
    }
  }

  const handleOpenAddModal = () => {
    setShowAddPostsModal(true)
    setSearchTerm('')
    setSortBy('newest')
    fetchAvailablePosts()
  }

  const handleCloseAddModal = () => {
    setShowAddPostsModal(false)
    setAvailablePosts([])
  }

  const handleAddPost = async (postId: number) => {
    try {
      const response = await fetch(`/api/collections/${slug}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ postId })
      })
      
      if (response.ok) {
        // Refresh collection data to show the new post
        fetchCollection()
        // Remove the added post from available posts
        setAvailablePosts(prev => prev.filter(p => p.id !== postId))
      } else {
        console.error('Failed to add post to collection')
      }
    } catch (error) {
      console.error('Error adding post to collection:', error)
    }
  }

  // Edit collection functions
  const handleOpenEditModal = () => {
    if (!collection) return
    
    setEditFormData({
      title: collection.title,
      slug: collection.slug,
      description: collection.description || '',
      cover_image_url: collection.cover_image_url || '',
      is_public: collection.is_public
    })
    setEditCoverImage(null)
    setEditCoverPreview(null)
    setEditCoverMode(collection.cover_image_url ? 'url' : 'upload')
    setShowEditModal(true)
  }

  const handleCloseEditModal = () => {
    setShowEditModal(false)
    setEditFormData({
      title: '',
      slug: '',
      description: '',
      cover_image_url: '',
      is_public: true
    })
    setEditCoverImage(null)
    setEditCoverPreview(null)
    setEditIsDragOver(false)
    setEditCoverMode('url')
  }

  const handleEditCoverModeChange = (mode: 'url' | 'upload') => {
    setEditCoverMode(mode)
    // Don't clear the data when switching modes - preserve the existing preview
  }

  const processEditImageFile = (file: File) => {
    setEditCoverImage(file)
    
    // Create preview URL
    const previewUrl = URL.createObjectURL(file)
    setEditCoverPreview(previewUrl)
  }

  const handleEditDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setEditIsDragOver(true)
  }

  const handleEditDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setEditIsDragOver(false)
  }

  const handleEditDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setEditIsDragOver(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      if (file.type.startsWith('image/')) {
        processEditImageFile(file)
      }
    }
  }

  const handleEditFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      processEditImageFile(file)
    }
  }

  const handleUpdateCollection = async () => {
    try {
      setIsUpdating(true)
      let updatedData = { ...editFormData }

      // If there's a new cover image, upload it first
      if (editCoverMode === 'upload' && editCoverImage) {
        const formData = new FormData()
        formData.append('file', editCoverImage)

        const response = await fetch('/api/images/upload?folder=collections', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to upload cover image')
        }

        const data = await response.json()
        updatedData = { ...updatedData, cover_image_url: data.image.url }
      } else if (editCoverMode === 'url') {
        // Use the URL from the form
        updatedData = { ...updatedData, cover_image_url: editFormData.cover_image_url }
      }

      // Update collection via API using slug instead of ID
      const response = await fetch(`/api/collections/${collection?.slug}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update collection')
      }

      const result = await response.json()
      
      // Update tags separately
      const tagsResponse = await fetch(`/api/collections/${collection?.slug}/tags`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tagIds: selectedTags.map(tag => tag.id)
        })
      })

      if (!tagsResponse.ok) {
        console.error('Failed to update collection tags')
      }
      
      // Update local state
      setCollection(result.collection)
      setToast({ show: true, message: 'Collection updated successfully!', type: 'success' })
      
      // Close modal and cleanup
      handleCloseEditModal()
      
      // If slug changed, we might need to redirect
      if (updatedData.slug !== collection?.slug) {
        window.location.href = `/collections/${updatedData.slug}`
      }

    } catch (error) {
      console.error('Error updating collection:', error)
      const errorMessage = `Failed to update collection: ${error instanceof Error ? error.message : 'Unknown error'}`
      setToast({ show: true, message: errorMessage, type: 'error' })
    } finally {
      setIsUpdating(false)
    }
  }

  // Filter and sort available posts
  const filteredAvailablePosts = availablePosts
    .filter(post => {
      const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (post.excerpt || '').toLowerCase().includes(searchTerm.toLowerCase())
      return matchesSearch
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'updated':
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        case 'title':
          return a.title.localeCompare(b.title)
        default:
          return 0
      }
    })

  const handleDeleteCollectionClick = () => {
    setDeleteCollectionConfirm(true);
  }

  const handleDeleteCollectionConfirm = async () => {
    if (!collection) return;

    setIsDeletingCollection(true);
    try {
      const response = await fetch(`/api/collections/${collection.slug}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        window.location.href = '/collections';
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete collection');
      }
    } catch (error) {
      console.error('Error deleting collection:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setToast({ show: true, message: errorMessage, type: 'error' });
      setIsDeletingCollection(false);
      setDeleteCollectionConfirm(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !collection) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Error</h1>
          <p className="text-gray-600 mb-4">{error || 'Collection not found'}</p>
          <Link
            href="/collections"
            className="text-indigo-600 hover:text-indigo-900"
          >
            ← Back to Collections
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, show: false })}
        />
      )}

      <ConfirmationModal
        isOpen={deleteCollectionConfirm}
        onClose={() => setDeleteCollectionConfirm(false)}
        onConfirm={handleDeleteCollectionConfirm}
        title="Delete Collection"
        message={`Are you sure you want to delete the collection "${collection?.title}"? This action cannot be undone.`}
        isConfirming={isDeletingCollection}
      />

      <ConfirmationModal
        isOpen={removePostConfirm.show}
        onClose={() => setRemovePostConfirm({ show: false, post: null })}
        onConfirm={handleRemovePostConfirm}
        title="Remove Post"
        message={`Are you sure you want to remove the post "${removePostConfirm.post?.title}" from this collection?`}
        confirmText="Remove"
        isConfirming={isRemovingPost}
      />

      {/* Header */}
      <div className="mb-8">
        <Link
          href="/collections"
          className="text-indigo-600 hover:text-indigo-900 mb-4 inline-flex items-center"
        >
          ← Back to Collections
        </Link>
        
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{collection.title}</h1>
            <p className="text-gray-600 mb-4">{collection.description}</p>
            
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                collection.is_public 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {collection.is_public ? 'Public' : 'Private'}
              </span>
              <span>{posts.length} posts</span>
              <span>Created {formatDate(collection.created_at)}</span>
              {collection.updated_at !== collection.created_at && (
                <span>Updated {formatDate(collection.updated_at)}</span>
              )}
            </div>
          </div>
          
          {collection.cover_image_url && (
            <div className="ml-6 flex-shrink-0">
              <img
                src={collection.cover_image_url}
                alt={collection.title}
                className="w-32 h-20 object-cover rounded-lg shadow-sm"
              />
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mb-6 flex gap-3">
        <button 
          onClick={handleOpenAddModal}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
        >
          Add Posts
        </button>
        <button 
          onClick={handleOpenEditModal}
          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
        >
          Edit Collection
        </button>
        <button
          onClick={handleDeleteCollectionClick}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
        >
          Delete Collection
        </button>
      </div>

      {/* Posts List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Posts in Collection</h2>
            {posts.length > 0 && (
              <p className="text-sm text-gray-500">
                Drag posts to reorder • Click Edit to modify content
              </p>
            )}
          </div>
        </div>
        
        {posts.length === 0 ? (
          <div className="p-6 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No posts in this collection</h3>
            <p className="text-gray-600 mb-4">Add some posts to get started.</p>
            <button 
              onClick={handleOpenAddModal}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
            >
              Add Posts
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {posts.map((post, index) => (
              <div
                key={post.id}
                draggable
                onDragStart={(e) => handleDragStart(e, post)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                className={`p-6 transition-all duration-200 cursor-move border-l-4 ${
                  dragOverIndex === index 
                    ? 'bg-blue-50 border-l-blue-400 shadow-md' 
                    : 'border-l-transparent'
                } ${
                  draggedPost?.id === post.id 
                    ? 'opacity-50 scale-95 shadow-lg' 
                    : ''
                } hover:bg-gray-50 hover:shadow-sm`}
              >
                <div className="flex gap-6">
                  {/* Position indicator and drag handle */}
                  <div className="flex-shrink-0 flex items-center">
                    <div className="flex flex-col items-center mr-4">
                      <div className="w-8 h-8 bg-indigo-100 text-indigo-800 rounded-full flex items-center justify-center text-sm font-semibold mb-2 shadow-sm">
                        {post.position}
                      </div>
                      <div className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M7 2a1 1 0 000 2h6a1 1 0 100-2H7zM7 8a1 1 0 000 2h6a1 1 0 100-2H7zM7 14a1 1 0 000 2h6a1 1 0 100-2H7z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Cover Image */}
                  <div className="flex-shrink-0">
                    {post.cover_image_url ? (
                      <img
                        src={post.cover_image_url}
                        alt={post.title}
                        className="w-24 h-16 object-cover rounded-lg shadow-sm"
                      />
                    ) : (
                      <div className="w-24 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                        <span className="text-gray-400 text-xs">No Image</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {post.title}
                        </h3>
                        
                        {post.excerpt && (
                          <p className="text-gray-600 mt-1 text-sm line-clamp-2">
                            {post.excerpt}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span className={`px-2 py-1 rounded-full ${
                            post.status === 'published' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {post.status}
                          </span>
                          <span>Added {formatDate(post.added_at)}</span>
                          <span>Created {formatDate(post.created_at)}</span>
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => handleEditPost(post.id)}
                          className="px-3 py-1 rounded text-xs font-medium bg-indigo-100 text-indigo-800 hover:bg-indigo-200 transition-colors duration-200"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleRemovePostClick(post)}
                          className="px-3 py-1 rounded text-xs font-medium bg-red-100 text-red-800 hover:bg-red-200 transition-colors duration-200"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Posts Modal */}
      {showAddPostsModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{backgroundColor: 'rgba(0, 0, 0, 0.5)'}}>
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Add Posts to Collection</h2>
              <button
                onClick={handleCloseAddModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search and Sort Controls */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search posts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="updated">Recently Updated</option>
                  <option value="title">Title A-Z</option>
                </select>
              </div>
            </div>

            {/* Posts List */}
            <div className="flex-1 overflow-y-auto">
              {loadingPosts ? (
                <div className="p-6">
                  <div className="animate-pulse space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex gap-4">
                        <div className="w-20 h-14 bg-gray-200 rounded"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                        <div className="w-16 h-8 bg-gray-200 rounded"></div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : filteredAvailablePosts.length === 0 ? (
                <div className="p-6 text-center">
                  <div className="text-gray-400 mb-4">
                    <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No posts available</h3>
                  <p className="text-gray-600">
                    {searchTerm ? 'No posts match your search.' : 'All posts are already in this collection.'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredAvailablePosts.map((post) => (
                    <div key={post.id} className="p-6 hover:bg-gray-50">
                      <div className="flex gap-4 items-center">
                        {/* Post Image */}
                        <div className="flex-shrink-0">
                          {post.cover_image_url ? (
                            <img
                              src={post.cover_image_url}
                              alt={post.title}
                              className="w-20 h-14 object-cover rounded-lg shadow-sm"
                            />
                          ) : (
                            <div className="w-20 h-14 bg-gray-200 rounded-lg flex items-center justify-center">
                              <span className="text-gray-400 text-xs">No Image</span>
                            </div>
                          )}
                        </div>

                        {/* Post Details */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">
                            {post.title}
                          </h3>
                          {post.excerpt && (
                            <p className="text-gray-600 text-sm line-clamp-2 mb-2">
                              {post.excerpt}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className={`px-2 py-1 rounded-full ${
                              post.status === 'published' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {post.status}
                            </span>
                            <span>Updated {formatDate(post.updated_at)}</span>
                          </div>
                        </div>

                        {/* Add Button */}
                        <div className="flex-shrink-0">
                          <button
                            onClick={() => handleAddPost(post.id)}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 text-sm font-medium"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">
                  {filteredAvailablePosts.length} posts available
                </span>
                <button
                  onClick={handleCloseAddModal}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Collection Modal */}
      {showEditModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div 
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            tabIndex={-1}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault()
                handleCloseEditModal()
              }
            }}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Edit Collection</h2>
                <button 
                  onClick={handleCloseEditModal}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={editFormData.title}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter collection title"
                  />
                </div>

                {/* Slug */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Slug
                  </label>
                  <input
                    type="text"
                    value={editFormData.slug}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, slug: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="url-friendly-slug"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={editFormData.description}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    rows={3}
                    placeholder="Brief description of the collection"
                  />
                </div>

                {/* Is Public */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Visibility
                  </label>
                  <select
                    value={editFormData.is_public ? 'public' : 'private'}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, is_public: e.target.value === 'public' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                  </select>
                </div>

                {/* Cover Image */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cover Image
                  </label>
                  
                  {/* Cover Image Container - Preview and Input Side by Side */}
                  <div className="flex gap-4 items-start">
                    {/* Cover Image Preview - Fixed Section */}
                    <div className="flex-shrink-0 w-24">
                      <div className="w-24 h-24 border border-gray-300 rounded bg-gray-50 flex items-center justify-center">
                        {((editCoverMode === 'url' && editFormData.cover_image_url) || (editCoverMode === 'upload' && editCoverPreview)) ? (
                          <img
                            src={editCoverMode === 'url' ? editFormData.cover_image_url : editCoverPreview || ''}
                            alt="Cover preview"
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
                            onClick={() => handleEditCoverModeChange('url')}
                            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                              editCoverMode === 'url'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            Image URL
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditCoverModeChange('upload')}
                            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                              editCoverMode === 'upload'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            Upload Image
                          </button>
                        </div>

                        {/* Input Area - Flex grow to fill remaining space */}
                        <div className="flex-1">
                          {editCoverMode === 'url' ? (
                            /* URL Input */
                            <input
                              type="url"
                              value={editFormData.cover_image_url}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, cover_image_url: e.target.value }))}
                              className="w-full h-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                              placeholder="Enter cover image URL"
                            />
                          ) : (
                            /* File Upload */
                            <div
                              className={`h-full border-2 border-dashed p-2 text-center rounded transition-colors flex flex-col items-center justify-center ${
                                editIsDragOver ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300'
                              }`}
                              onDrop={handleEditDrop}
                              onDragOver={handleEditDragOver}
                              onDragLeave={handleEditDragLeave}
                            >
                              {editCoverImage ? (
                                <div className="text-center">
                                  <div className="text-xs text-gray-600 mb-1">Selected: {editCoverImage.name}</div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditCoverImage(null)
                                      setEditCoverPreview(null)
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
                                      onClick={() => document.getElementById('edit-file-input')?.click()}
                                      className="text-indigo-500 hover:text-indigo-700"
                                    >
                                      browse
                                    </button>
                                  </div>
                                </div>
                              )}
                              <input
                                id="edit-file-input"
                                type="file"
                                accept="image/*"
                                onChange={handleEditFileSelect}
                                className="hidden"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
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
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={handleCloseEditModal}
                  disabled={isUpdating}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateCollection}
                  disabled={isUpdating || !editFormData.title.trim() || !editFormData.slug.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isUpdating ? 'Updating...' : 'Update Collection'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
