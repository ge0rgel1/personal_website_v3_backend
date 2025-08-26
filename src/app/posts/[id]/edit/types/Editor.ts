export type SaveStatus = 'idle' | 'saved' | 'error'

export interface EditorState {
  loading: boolean
  error: string | null
  markdownContent: string
  isSaving: boolean
  saveStatus: SaveStatus
  showHeadingDropdown: boolean
  showListDropdown: boolean
}

export interface CursorPosition {
  start: number
  end: number
}

export interface TextSelection {
  start: number
  end: number
  selectedText: string
}
