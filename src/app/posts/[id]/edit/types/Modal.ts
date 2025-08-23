export interface LinkModalState {
  showLinkModal: boolean
  linkText: string
  linkUrl: string
}

export interface FormulaModalState {
  showFormulaModal: boolean
  latexInput: string
}

export interface TableModalState {
  showTableModal: boolean
  tableRows: number
  tableCols: number
}

export interface FootnoteModalState {
  showFootnoteModal: boolean
  footnoteText: string
}

export interface ImageModalState {
  showImageModal: boolean
  selectedImage: File | null
  imagePreview: string | null
  isDragOver: boolean
}

export interface ConfigureModalState {
  showConfigureModal: boolean
  configCoverImage: File | null
  configCoverPreview: string | null
  configIsDragOver: boolean
}

export interface ColorModalState {
  showColorModal: boolean
  selectedColor: string
  customColor: string
}

export interface ModalHandlers {
  openLinkModal: () => void
  insertLink: () => void
  cancelLink: () => void
  openFormulaModal: () => void
  insertFormula: () => void
  cancelFormula: () => void
  openTableModal: () => void
  insertTable: () => void
  cancelTable: () => void
  openFootnoteModal: () => void
  insertFootnote: () => void
  cancelFootnote: () => void
  openImageModal: () => void
  insertImage: () => void
  cancelImage: () => void
}
