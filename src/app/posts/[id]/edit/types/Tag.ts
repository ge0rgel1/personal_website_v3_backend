import { Tag } from './Post'

export interface TagState {
  postTags: Tag[]
  availableTags: Tag[]
  tagSearchQuery: string
  filteredTags: Tag[]
  showTagDropdown: boolean
  isCreatingTag: boolean
}

export interface TagHandlers {
  addTag: (tag: Tag) => void
  removeTag: (tagId: number) => void
  createTag: (name: string, description?: string) => Promise<Tag | null>
  searchTags: (query: string) => void
  toggleTagDropdown: () => void
}

export interface CreateTagRequest {
  name: string
  description?: string
}

export interface TagSearchResult {
  tags: Tag[]
  query: string
}
