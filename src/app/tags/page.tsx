'use client'

import { useState, useEffect } from 'react'
import Toast from '@/components/Toast'
import ConfirmationModal from '@/components/ConfirmationModal'

interface Tag {
  id: number
  name: string
  slug: string
  description: string | null
  background_color: string
  text_color: string
}

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingTagId, setUpdatingTagId] = useState<number | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newTag, setNewTag] = useState({
    name: '',
    description: '',
    background_color: '#ffffff',
    text_color: '#000000',
  });
  const [tagToDelete, setTagToDelete] = useState<Tag | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const getRandomHexColor = () => {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  };

  useEffect(() => {
    fetchTags()
  }, [])

  const fetchTags = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/tags')
      if (!response.ok) {
        throw new Error('Failed to fetch tags')
      }
      const data = await response.json()
      setTags(data.tags)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleTagChange = (id: number, field: keyof Tag, value: string) => {
    setTags((prevTags) =>
      prevTags.map((tag) =>
        tag.id === id ? { ...tag, [field]: value } : tag
      )
    )
  }

  const handleSaveTag = async (id: number) => {
    const tagToUpdate = tags.find((tag) => tag.id === id)
    if (!tagToUpdate) return

    setUpdatingTagId(id)
    try {
      const response = await fetch(`/api/tags/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: tagToUpdate.name,
          description: tagToUpdate.description,
          background_color: tagToUpdate.background_color,
          text_color: tagToUpdate.text_color,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update tag')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save tag')
    } finally {
      setUpdatingTagId(null)
    }
  }

  const handleCancelCreate = () => {
    setShowCreateModal(false)
    setError(null)
  }

  const handleCreateTag = async () => {
    // Reset previous errors
    setError(null)

    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTag),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create tag')
      }

      setTags((prevTags) => [...prevTags, result.tag])
      setShowCreateModal(false)
      setNewTag({
        name: '',
        description: '',
        background_color: '#ffffff',
        text_color: '#000000',
      })
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'An unknown error occurred'
      setError(errorMessage)
      alert(`Error: ${errorMessage}`) // Show alert to the user
    }
  }

  const handleDeleteTag = async () => {
    if (!tagToDelete) return

    try {
      const response = await fetch(`/api/tags/${tagToDelete.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete tag')
      }

      setTags((prevTags) => prevTags.filter((tag) => tag.id !== tagToDelete.id))
      setToast({ message: 'Tag deleted successfully.', type: 'success' });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred'
      setToast({ message: errorMessage, type: 'error' });
    } finally {
        setTagToDelete(null); // Close the modal
    }
  }

  if (loading) return <div>Loading...</div>
  if (error && !showCreateModal) {
    // Only show page-level error if modal is closed
    return <div>Error: {error}</div>
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Manage Tags</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          Create Tag
        </button>
      </div>
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <ul className="divide-y divide-gray-200">
          {tags.map((tag) => (
            <li key={tag.id} className="px-6 py-4">
              <div className="grid grid-cols-12 items-center gap-4">
                {/* Tag Preview */}
                <div className="col-span-2">
                  <span
                    className="px-3 py-1 rounded-full text-sm font-semibold inline-block text-center"
                    style={{
                      backgroundColor: tag.background_color,
                      color: tag.text_color,
                      minWidth: '80px',
                    }}
                  >
                    {tag.name}
                  </span>
                </div>

                {/* Name Input */}
                <div className="col-span-2">
                  <input
                    type="text"
                    value={tag.name}
                    onChange={(e) =>
                      handleTagChange(tag.id, 'name', e.target.value)
                    }
                    className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                    placeholder="Tag Name"
                  />
                </div>

                {/* Description Input */}
                <div className="col-span-3">
                  <input
                    type="text"
                    value={tag.description || ''}
                    onChange={(e) =>
                      handleTagChange(tag.id, 'description', e.target.value)
                    }
                    className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                    placeholder="Description"
                  />
                </div>

                {/* Background Color Input */}
                <div className="col-span-2 flex items-center gap-1">
                    BG Color
                  <input
                    type="text"
                    value={tag.background_color}
                    onChange={(e) =>
                      handleTagChange(
                        tag.id,
                        'background_color',
                        e.target.value
                      )
                    }
                    maxLength={7}
                    className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm"
                    placeholder="#RRGGBB"
                  />
                  <button 
                    onClick={() => handleTagChange(tag.id, 'background_color', getRandomHexColor())}
                    className="p-2 text-gray-500 rounded-md hover:bg-gray-100"
                    title="Random Color"
                  >
                    <img src="https://pub-6dd13910f89644f68ddb4e678bc6be56.r2.dev/images/random-svgrepo-com.svg" className="h-4 w-4" alt="Random color" />
                  </button>
                </div>

                {/* Text Color Input */}
                <div className="col-span-2 flex items-center gap-1">
                    Text Color
                  <input
                    type="text"
                    value={tag.text_color}
                    onChange={(e) =>
                      handleTagChange(tag.id, 'text_color', e.target.value)
                    }
                    maxLength={7}
                    className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm"
                    placeholder="#RRGGBB"
                  />
                   <button 
                    onClick={() => handleTagChange(tag.id, 'text_color', getRandomHexColor())}
                    className="p-2 text-gray-500 rounded-md hover:bg-gray-100"
                    title="Random Color"
                  >
                    <img src="https://pub-6dd13910f89644f68ddb4e678bc6be56.r2.dev/images/random-svgrepo-com.svg" className="h-4 w-4" alt="Random color" />
                  </button>
                </div>

                <div className="col-span-1 flex justify-end gap-2">
                  <button
                    onClick={() => handleSaveTag(tag.id)}
                    disabled={updatingTagId === tag.id}
                    className="p-2 text-gray-500 rounded-md hover:bg-gray-100 hover:text-indigo-600 disabled:text-gray-300 disabled:hover:bg-transparent"
                    title="Save Changes"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M17 3H5a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2zm-3 12H8v-4h6v4zm2-6H5V5h12v4z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setTagToDelete(tag)}
                    className="p-2 text-gray-500 rounded-md hover:bg-gray-100 hover:text-red-600"
                    title="Delete Tag"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Create Tag Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        >
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
            <h2 className="text-2xl font-bold mb-6">Create New Tag</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tag Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., 'React'"
                  value={newTag.name}
                  onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  placeholder="e.g., 'Frontend JavaScript library'"
                  value={newTag.description}
                  onChange={(e) =>
                    setNewTag({ ...newTag, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Background Color
                  </label>
                  <div className="flex items-center border border-gray-300 rounded-md">
                    <input
                      type="color"
                      value={newTag.background_color}
                      onChange={(e) =>
                        setNewTag({ ...newTag, background_color: e.target.value })
                      }
                      className="w-10 h-10 p-1 border-none bg-transparent"
                    />
                    <input
                      type="text"
                      value={newTag.background_color}
                      onChange={(e) =>
                        setNewTag({ ...newTag, background_color: e.target.value })
                      }
                      maxLength={7}
                      className="w-full px-3 py-2 border-none focus:ring-0"
                      placeholder="#ffffff"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setNewTag({...newTag, background_color: getRandomHexColor()})}
                    className="p-2 text-gray-500 rounded-md hover:bg-gray-100"
                    title="Random Color"
                  >
                    <img src="https://pub-6dd13910f89644f68ddb4e678bc6be56.r2.dev/images/random-svgrepo-com.svg" className="h-5 w-5" alt="Random color" />
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Text Color</label>
                  <div className="flex items-center border border-gray-300 rounded-md">
                    <input
                      type="color"
                      value={newTag.text_color}
                      onChange={(e) =>
                        setNewTag({ ...newTag, text_color: e.target.value })
                      }
                      className="w-10 h-10 p-1 border-none bg-transparent"
                    />
                    <input
                      type="text"
                      value={newTag.text_color}
                      onChange={(e) =>
                        setNewTag({ ...newTag, text_color: e.target.value })
                      }
                      maxLength={7}
                      className="w-full px-3 py-2 border-none focus:ring-0"
                      placeholder="#000000"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setNewTag({...newTag, text_color: getRandomHexColor()})}
                    className="p-2 text-gray-500 rounded-md hover:bg-gray-100"
                    title="Random Color"
                  >
                    <img src="https://pub-6dd13910f89644f68ddb4e678bc6be56.r2.dev/images/random-svgrepo-com.svg" className="h-5 w-5" alt="Random color" />
                  </button>
                </div>
              </div>
              <div className="flex justify-end gap-4 mt-6">
                <button
                  onClick={handleCancelCreate}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTag}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create Tag
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!tagToDelete}
        onClose={() => setTagToDelete(null)}
        onConfirm={handleDeleteTag}
        title="Confirm Deletion"
        message={`Are you sure you want to delete the tag "${tagToDelete?.name}"? This action cannot be undone.`}
      />
    </div>
  )
}
