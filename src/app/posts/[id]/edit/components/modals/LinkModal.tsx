import React from 'react'
import { LinkModalState } from '../../types'

interface LinkModalProps extends LinkModalState {
  onInsertLink: () => void
  onCancel: () => void
  onLinkTextChange: (text: string) => void
  onLinkUrlChange: (url: string) => void
  onKeyDown: (e: React.KeyboardEvent) => void
}

export const LinkModal: React.FC<LinkModalProps> = ({
  showLinkModal,
  linkText,
  linkUrl,
  onInsertLink,
  onCancel,
  onLinkTextChange,
  onLinkUrlChange,
  onKeyDown
}) => {
  if (!showLinkModal) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
      <div 
        className="bg-white rounded-lg p-6 w-96 max-w-[90vw] shadow-xl"
        onKeyDown={onKeyDown}
      >
        <h3 className="text-lg font-semibold mb-4">Insert Link</h3>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="linkText" className="block text-sm font-medium text-gray-700 mb-1">
              Link Text
            </label>
            <input
              id="linkText"
              type="text"
              value={linkText}
              onChange={(e) => onLinkTextChange(e.target.value)}
              placeholder="Enter link text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="linkUrl" className="block text-sm font-medium text-gray-700 mb-1">
              URL
            </label>
            <input
              id="linkUrl"
              type="url"
              value={linkUrl}
              onChange={(e) => onLinkUrlChange(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onInsertLink}
            disabled={!linkText.trim() || !linkUrl.trim()}
            className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-md transition-colors"
          >
            Insert
          </button>
        </div>
      </div>
    </div>
  )
}
