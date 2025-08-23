'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import NewCollectionModal from '../../components/NewCollectionModal'

interface Tag {
  id: number
  name: string
  background_color: string
  text_color: string
}

interface Collection {
  id: number
  title: string
  slug: string
  description: string
  cover_image_url: string
  is_public: boolean
  post_count: number
  tags: Tag[]
  created_at: string
  updated_at: string
}

interface CollectionFormData {
  title: string
  slug: string
  description: string
  cover_image_url: string
  is_public: boolean
}

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    fetchCollections()
  }, [])

  const fetchCollections = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/collections')
      
      if (!response.ok) {
        throw new Error('Failed to fetch collections')
      }
      
      const data = await response.json()
      
      if (data.success) {
        setCollections(data.data || [])
      } else {
        throw new Error(data.error || 'Failed to load collections')
      }
    } catch (error) {
      console.error('Error fetching collections:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredCollections = collections.filter(collection => {
    const matchesSearch = collection.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      collection.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      collection.tags.some((tag) => tag.name.toLowerCase().includes(searchTerm.toLowerCase()))
    return matchesSearch
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const handleCreateCollection = async (collectionData: CollectionFormData) => {
    try {
      const response = await fetch('/api/collections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(collectionData),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          // Add the new collection to the list
          setCollections(prev => [result.data, ...prev])
          setIsModalOpen(false)
        } else {
          console.error('Failed to create collection:', result.error)
        }
      } else {
        console.error('Failed to create collection')
      }
    } catch (error) {
      console.error('Error creating collection:', error)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Collections</h1>
          <p className="mt-2 text-gray-600">
            Manage your curated collections
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
        >
          New Collection
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search collections..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {/* Collections List */}
      <div className="space-y-6">
        {filteredCollections.map((collection) => (
          <article
            key={collection.id}
            className="bg-white shadow rounded-lg overflow-hidden hover:shadow-md transition-shadow duration-200"
          >
            <div className="p-6">
              <div className="flex gap-6">
                {/* Cover Image - Left Side */}
                <div className="flex-shrink-0">
                  {collection.cover_image_url ? (
                    <img
                      src={collection.cover_image_url}
                      alt={collection.title}
                      className="w-36 h-36 object-cover rounded-lg shadow-sm"
                      onError={(e) => {
                        console.log('Image failed to load:', collection.cover_image_url)
                        e.currentTarget.style.display = 'none'
                        const fallback = e.currentTarget.nextElementSibling as HTMLElement
                        if (fallback) fallback.classList.remove('hidden')
                      }}
                    />
                  ) : null}
                  <div className={`w-36 h-36 bg-gray-200 rounded-lg flex items-center justify-center ${collection.cover_image_url ? 'hidden' : ''}`}>
                    <span className="text-gray-400 text-sm text-center">No Cover Image</span>
                  </div>
                </div>

                {/* Content - Right Side */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <Link href={`/collections/${collection.slug}`}>
                      <h2 className="text-xl font-semibold text-gray-900 hover:text-purple-600 transition-colors cursor-pointer">
                        {collection.title}
                      </h2>
                    </Link>
                    <div className="flex items-center gap-3 ml-4">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {collection.is_public ? 'Public' : 'Private'}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 mb-4">
                    {collection.description || 'No description available'}
                  </p>
                  
                  {/* Tags */}
                  {collection.tags && collection.tags.length > 0 && (
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-2">
                        {collection.tags.map((tag) => (
                          <span
                            key={tag.id}
                            className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium"
                            style={{ backgroundColor: tag.background_color, color: tag.text_color }}
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                                      <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm text-gray-500">
                      <span>{collection.post_count} posts</span>
                      <span className="mx-2">•</span>
                      <span>Created {formatDate(collection.created_at)}</span>
                      {collection.updated_at !== collection.created_at && (
                        <>
                          <span className="mx-2">•</span>
                          <span>Updated {formatDate(collection.updated_at)}</span>
                        </>
                      )}
                    </div>
                    
                  </div>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      {filteredCollections.length === 0 && !loading && (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No collections found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? 'Try adjusting your search.' : 'Get started by creating a new collection.'}
          </p>
        </div>
      )}
      
      {/* New Collection Modal */}
      <NewCollectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateCollection}
      />
    </div>
  )
}
