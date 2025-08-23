'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import TagManager, { Tag } from '../../../../components/TagManager'

interface Project {
  id: number
  slug: string
  title: string
  year: number | null
  description: string | null
  github_url: string | null
  live_demo_url: string | null
  created_at: string
  updated_at: string
  status?: string
  status_description?: string
  tags?: Tag[]
}

export default function ProjectEditPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Project form data
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [year, setYear] = useState('')
  const [description, setDescription] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [demoUrl, setDemoUrl] = useState('')
  const [status, setStatus] = useState('')
  const [projectTags, setProjectTags] = useState<Tag[]>([])
  const [lastUpdate, setLastUpdate] = useState('')

  // Available statuses for dropdown
  const availableStatuses = [
    'planned',
    'in-progress', 
    'complete',
    'archived'
  ]

  useEffect(() => {
    fetchProject()
  }, [projectId])

  const fetchProject = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/projects/${projectId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch project')
      }
      const data = await response.json()
      const project = data.project
      
      // Populate form fields
      setTitle(project.title || '')
      setSlug(project.slug || '')
      setYear(project.year ? project.year.toString() : '')
      setDescription(project.description || '')
      setGithubUrl(project.github_url || '')
      setDemoUrl(project.live_demo_url || '')
      setStatus(project.status || '')
      setProjectTags(project.tags || [])
      setLastUpdate(new Date(project.updated_at).toLocaleDateString())
      
    } catch (error) {
      console.error('Error fetching project:', error)
      setError('Failed to load project')
    } finally {
      setLoading(false)
    }
  }

  const updateProjectTags = async (tags: Tag[]) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/tags`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tagIds: tags.map(tag => tag.id)
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update project tags')
      }

    } catch (error) {
      console.error('Error updating project tags:', error)
      throw error
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)

      const updateData = {
        slug,
        title,
        year: year ? parseInt(year) : null,
        description,
        github_url: githubUrl || null,
        live_demo_url: demoUrl || null,
        status
      }

      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        throw new Error('Failed to update project')
      }

      // Update project tags
      await updateProjectTags(projectTags)

      // Redirect back to projects page
      router.push('/projects')
      
    } catch (error) {
      console.error('Error saving project:', error)
      setError('Failed to save project')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    router.push('/projects')
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-700">{error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Project</h1>
          
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-red-700">{error}</div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {/* First Row */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                GitHub Repo Link
              </label>
              <input
                type="url"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://github.com/username/repo"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Demo Link
              </label>
              <input
                type="url"
                value={demoUrl}
                onChange={(e) => setDemoUrl(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://example.com"
              />
            </div>

            {/* Title field moved to first row for better balance */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Project Title"
                required
              />
            </div>
          </div>

          {/* Tags Management - Full width row */}
          <div className="mb-4">
            <TagManager
              selectedTags={projectTags}
              onTagsChange={setProjectTags}
              placeholder="Search tags for this project..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Compact fields row */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Status</option>
                {availableStatuses.map((statusOption) => (
                  <option key={statusOption} value={statusOption}>
                    {statusOption.charAt(0).toUpperCase() + statusOption.slice(1).replace('-', ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Year
              </label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="2024"
                min="1970"
                max="2100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Slug <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="project-slug"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Update
              </label>
              <input
                type="text"
                value={lastUpdate}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
              />
            </div>
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={10}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
              placeholder="Project description..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-start space-x-4">
            <button
              onClick={handleSave}
              disabled={saving || !title.trim() || !slug.trim()}
              className={`px-6 py-2 rounded-md font-medium transition-colors duration-200 ${
                saving || !title.trim() || !slug.trim()
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            
            <button
              onClick={handleCancel}
              disabled={saving}
              className="px-6 py-2 rounded-md font-medium bg-gray-200 hover:bg-gray-300 text-gray-700 transition-colors duration-200"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
