import React from 'react'
import { TableModalState } from '../../types'

interface TableModalProps extends TableModalState {
  onInsertTable: () => void
  onCancel: () => void
  onTableRowsChange: (rows: number) => void
  onTableColsChange: (cols: number) => void
  onKeyDown: (e: React.KeyboardEvent) => void
}

export const TableModal: React.FC<TableModalProps> = ({
  showTableModal,
  tableRows,
  tableCols,
  onInsertTable,
  onCancel,
  onTableRowsChange,
  onTableColsChange,
  onKeyDown
}) => {
  if (!showTableModal) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
      <div 
        className="bg-white rounded-lg p-6 shadow-xl max-w-md w-full mx-4"
        onKeyDown={onKeyDown}
        tabIndex={-1}
      >
        <h3 className="text-lg font-semibold mb-4">Insert Table</h3>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="tableRows" className="block text-sm font-medium text-gray-700 mb-2">
              Number of Rows
            </label>
            <input
              id="tableRows"
              type="number"
              min="1"
              max="20"
              value={tableRows}
              onChange={(e) => onTableRowsChange(Math.min(20, Math.max(1, parseInt(e.target.value) || 1)))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="3"
            />
          </div>
          <div>
            <label htmlFor="tableCols" className="block text-sm font-medium text-gray-700 mb-2">
              Number of Columns
            </label>
            <input
              id="tableCols"
              type="number"
              min="1"
              max="8"
              value={tableCols}
              onChange={(e) => onTableColsChange(Math.min(8, Math.max(1, parseInt(e.target.value) || 1)))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="3"
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
            onClick={onInsertTable}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Insert
          </button>
        </div>
      </div>
    </div>
  )
}
