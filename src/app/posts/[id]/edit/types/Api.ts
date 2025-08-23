import { Post } from './Post'
import { Tag } from './Post'
import { ImageUploadResult } from './Image'

export interface ApiResponse<T = unknown> {
  success?: boolean
  message?: string
  error?: string
  data?: T
}

export interface GetPostResponse extends ApiResponse {
  post: Post
}

export interface UpdatePostResponse extends ApiResponse {
  post: Post
}

export interface GetTagsResponse extends ApiResponse {
  tags: Tag[]
}

export interface CreateTagResponse extends ApiResponse {
  tag: Tag
}

export interface UploadImageResponse extends ApiResponse {
  result: ImageUploadResult
}

export interface SavePostRequest {
  content_md: string
  title?: string
  slug?: string
  excerpt?: string
  status?: 'draft' | 'published' | 'archived'
}
