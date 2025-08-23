// Editor configuration constants
export const EDITOR_CONFIG = {
  MAX_HISTORY_SIZE: 50,
  HISTORY_DEBOUNCE_MS: 500,
  SAVE_SUCCESS_TIMEOUT_MS: 2000,
  SAVE_ERROR_TIMEOUT_MS: 3000,
} as const

// Default values for editor state
export const DEFAULT_POST_METADATA = {
  title: '',
  slug: '',
  excerpt: '',
  author: 'me',
  status: 'draft' as const,
  read_time_minutes: 0,
  cover_image_url: ''
}

// Default table configuration
export const DEFAULT_TABLE_CONFIG = {
  rows: 3,
  cols: 3
} as const

// Supported image types
export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml'
] as const
