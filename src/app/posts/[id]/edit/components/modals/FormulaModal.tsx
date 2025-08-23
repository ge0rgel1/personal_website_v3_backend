import React from 'react'
import { FormulaModalState } from '../../types'

interface FormulaModalProps extends FormulaModalState {
  onInsertFormula: () => void
  onCancel: () => void
  onLatexInputChange: (input: string) => void
  onKeyDown: (e: React.KeyboardEvent) => void
  renderLatex: (latex: string) => string
}

export const FormulaModal: React.FC<FormulaModalProps> = ({
  showFormulaModal,
  latexInput,
  onInsertFormula,
  onCancel,
  onLatexInputChange,
  onKeyDown,
  renderLatex
}) => {
  if (!showFormulaModal) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
      <div 
        className="bg-white rounded-lg p-6 shadow-xl"
        style={{ width: '80vw', height: '80vh' }}
        onKeyDown={onKeyDown}
      >
        <h3 className="text-lg font-semibold mb-4">Insert Formula</h3>
        
        {/* Main content area with left and right panels */}
        <div className="flex" style={{ height: 'calc(100% - 8rem)' }}>
          {/* Left panel - LaTeX input */}
          <div className="w-1/2 pr-3 flex flex-col">
            <label htmlFor="latexInput" className="block text-sm font-medium text-gray-700 mb-2">
              LaTeX Input
            </label>
            <textarea
              id="latexInput"
              value={latexInput}
              onChange={(e) => onLatexInputChange(e.target.value)}
              placeholder="Enter LaTeX formula (e.g., E = mc^2, \frac{a}{b}, \sum_{i=1}^{n} x_i)"
              className="flex-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm"
              autoFocus
            />
          </div>
          
          {/* Right panel - Preview */}
          <div className="w-1/2 pl-3 flex flex-col">
            <div className="text-sm font-medium text-gray-700 mb-2">Preview</div>
            <div className="flex-1 w-full border border-gray-300 rounded-md bg-white overflow-auto">
              <div 
                className="p-4 h-full"
                dangerouslySetInnerHTML={{ 
                  __html: renderLatex(latexInput) 
                }}
              />
            </div>
          </div>
        </div>
        
        {/* Buttons */}
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onInsertFormula}
            disabled={!latexInput.trim()}
            className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-md transition-colors"
          >
            Insert
          </button>
        </div>
      </div>
    </div>
  )
}
