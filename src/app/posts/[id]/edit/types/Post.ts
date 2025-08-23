export interface Tag {
  id: number
  name: string
  slug: string
  description?: string
  background_color: string
  text_color: string
}

export interface Post {
  id: number
  slug: string
  title: string
  excerpt: string | null
  content_md: string
  status: PostStatus
  author: string
  read_time_minutes: number | null
  cover_image_url: string | null
  published_at: string | null
  view_count: number
  created_at: string
  updated_at: string
  tags: Tag[]
}

export type PostStatus = 'draft' | 'published' | 'archived'

export interface PostMetadata {
  title: string
  slug: string
  excerpt: string
  author: string
  status: PostStatus
  read_time_minutes: number
  cover_image_url: string
}

export interface PostUpdateData {
  title?: string
  slug?: string
  excerpt?: string
  content_md?: string
  author?: string
  status?: PostStatus
  read_time_minutes?: number
  cover_image_url?: string
}
