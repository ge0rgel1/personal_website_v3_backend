import { useState, useEffect, useCallback } from 'react'

export interface Tag {
  id: number
  name: string
  slug: string
  description?: string
  background_color: string
  text_color: string
}

interface TagManagerProps {
  selectedTags: Tag[]
  onTagsChange: (tags: Tag[]) => void
  placeholder?: string
  className?: string
}

export default function TagManager({ 
  selectedTags, 
  onTagsChange, 
  placeholder = "Search tags or type to create new...",
  className = ""
}: TagManagerProps) {
  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  const [tagSearchQuery, setTagSearchQuery] = useState('')
  const [filteredTags, setFilteredTags] = useState<Tag[]>([])
  const [showTagDropdown, setShowTagDropdown] = useState(false)
  const [isCreatingTag, setIsCreatingTag] = useState(false)

  // Fetch available tags
  const fetchAvailableTags = useCallback(async () => {
    try {
      const response = await fetch('/api/tags')
      if (!response.ok) {
        throw new Error('Failed to fetch tags')
      }
      const data = await response.json()
      setAvailableTags(data.tags || [])
    } catch (error) {
      console.error('Error fetching tags:', error)
    }
  }, [])

  // Load tags on component mount
  useEffect(() => {
    fetchAvailableTags()
  }, [fetchAvailableTags])

  // Filter tags based on search query
  useEffect(() => {
    if (!tagSearchQuery.trim()) {
      setFilteredTags([])
    } else {
      const query = tagSearchQuery.toLowerCase()
      const filtered = availableTags.filter(tag => 
        tag.name.toLowerCase().includes(query) &&
        !selectedTags.some(selectedTag => selectedTag.id === tag.id)
      )
      setFilteredTags(filtered)
    }
  }, [tagSearchQuery, availableTags, selectedTags])

  const handleTagSearch = (query: string) => {
    setTagSearchQuery(query)
    setShowTagDropdown(query.trim().length > 0)
  }

  const addTag = (tag: Tag) => {
    if (!selectedTags.some(selectedTag => selectedTag.id === tag.id)) {
      onTagsChange([...selectedTags, tag])
    }
    setTagSearchQuery('')
    setShowTagDropdown(false)
  }

  const removeTag = (tagId: number) => {
    onTagsChange(selectedTags.filter(tag => tag.id !== tagId))
  }

  const createAndAddTag = async () => {
    if (!tagSearchQuery.trim()) return

    try {
      setIsCreatingTag(true)
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: tagSearchQuery.trim(),
          description: null
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create tag')
      }

      const data = await response.json()
      const newTag = data.tag

      // Add to available tags and selected tags
      setAvailableTags(prev => [...prev, newTag])
      addTag(newTag)

    } catch (error) {
      console.error('Error creating tag:', error)
      alert(`Failed to create tag: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsCreatingTag(false)
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('.tag-manager-container')) {
        setShowTagDropdown(false)
      }
    }

    if (showTagDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showTagDropdown])

  return (
    <div className={`tag-manager-container ${className}`}>
      {/* Current Tags */}
      {selectedTags.length > 0 && (
        <div className="mb-2">
          <div className="flex flex-wrap gap-1">
            {selectedTags.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs"
                style={{ backgroundColor: tag.background_color, color: tag.text_color }}
              >
                {tag.name}
                <button
                  onClick={() => removeTag(tag.id)}
                  className="ml-1 hover:text-white focus:outline-none text-sm"
                  title={`Remove ${tag.name} tag`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tag Search and Add */}
      <div className="relative">
        <input
          type="text"
          value={tagSearchQuery}
          onChange={(e) => handleTagSearch(e.target.value)}
          onFocus={() => setShowTagDropdown(tagSearchQuery.trim().length > 0)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={placeholder}
        />
        
        {/* Tag Dropdown */}
        {showTagDropdown && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
            {filteredTags.length > 0 ? (
              <>
                <div className="px-3 py-1 text-xs text-gray-500 bg-gray-50 border-b">
                  Existing Tags
                </div>
                {filteredTags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => addTag(tag)}
                    className="w-full text-left px-3 py-2 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none text-sm"
                  >
                    <span className="inline-flex items-center">
                      <span className="w-3 h-3 rounded-full bg-blue-500 mr-2"></span>
                      {tag.name}
                    </span>
                  </button>
                ))}
              </>
            ) : null}
            
            {/* Create New Tag Option */}
            {tagSearchQuery.trim() && 
             !availableTags.some(tag => tag.name.toLowerCase() === tagSearchQuery.toLowerCase()) && (
              <div>
                {filteredTags.length > 0 && (
                  <div className="border-t border-gray-200"></div>
                )}
                <button
                  onClick={createAndAddTag}
                  disabled={isCreatingTag}
                  className="w-full text-left px-3 py-2 hover:bg-green-50 focus:bg-green-50 focus:outline-none text-sm text-green-700 disabled:opacity-50"
                >
                  <span className="inline-flex items-center">
                    <span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>
                    {isCreatingTag ? 'Creating...' : `Create "${tagSearchQuery}"`}
                  </span>
                </button>
              </div>
            )}
            
            {filteredTags.length === 0 && 
             tagSearchQuery.trim() && 
             availableTags.some(tag => tag.name.toLowerCase() === tagSearchQuery.toLowerCase()) && (
              <div className="px-3 py-2 text-sm text-gray-500">
                Tag already added to this project
              </div>
            )}
          </div>
        )}
      </div>

      {/* Compact Tag Help Text */}
      <div className="mt-1 text-xs text-gray-500">
        Search tags or type to create new ones
      </div>
    </div>
  )
}
