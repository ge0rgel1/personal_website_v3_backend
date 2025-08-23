import React from 'react'
import { FootnoteModalState } from '../../types'

interface FootnoteModalProps extends FootnoteModalState {
  onInsertFootnote: () => void
  onCancel: () => void
  onFootnoteTextChange: (text: string) => void
  onKeyDown: (e: React.KeyboardEvent) => void
}

export const FootnoteModal: React.FC<FootnoteModalProps> = ({
  showFootnoteModal,
  footnoteText,
  onInsertFootnote,
  onCancel,
  onFootnoteTextChange,
  onKeyDown
}) => {
  if (!showFootnoteModal) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
      <div 
        className="bg-white rounded-lg p-6 shadow-xl max-w-md w-full mx-4"
        onKeyDown={onKeyDown}
        tabIndex={-1}
      >
        <h3 className="text-lg font-semibold mb-4">Add Footnote</h3>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="footnoteText" className="block text-sm font-medium text-gray-700 mb-2">
              Footnote Text
            </label>
            <textarea
              id="footnoteText"
              value={footnoteText}
              onChange={(e) => onFootnoteTextChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
              placeholder="Enter footnote content..."
              autoFocus
            />
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onInsertFootnote}
            disabled={!footnoteText.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Insert
          </button>
        </div>
      </div>
    </div>
  )
}
