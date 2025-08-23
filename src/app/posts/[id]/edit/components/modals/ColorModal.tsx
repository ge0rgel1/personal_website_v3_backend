import React, { useState, useRef, useEffect } from 'react'
import { ColorModalState } from '../../types'

interface ColorModalProps extends ColorModalState {
  onApplyColor: (color: string) => void
  onCancel: () => void
  onColorChange: (color: string) => void
  onKeyDown?: (e: React.KeyboardEvent) => void
}

// Default color palette (10x8 = 80 colors) - no duplicates, better spacing
const DEFAULT_COLORS = [
  // Row 1 - Grays/Blacks/Whites
  '#000000', '#1a1a1a', '#333333', '#4d4d4d', '#666666', '#808080', '#999999', '#b3b3b3', '#cccccc', '#ffffff',
  // Row 2 - Dark Reds
  '#8B0000', '#B22222', '#DC143C', '#FF0000', '#FF6347', '#FF4500', '#CD5C5C', '#F08080', '#FFB6C1', '#FFC0CB',
  // Row 3 - Oranges & Yellows
  '#FF8C00', '#FFA500', '#FFD700', '#FFFF00', '#ADFF2F', '#9AFF9A', '#F0E68C', '#BDB76B', '#DAA520', '#B8860B',
  // Row 4 - Greens
  '#006400', '#008000', '#228B22', '#32CD32', '#90EE90', '#98FB98', '#00FA9A', '#00FF7F', '#7CFC00', '#7FFF00',
  // Row 5 - Cyans & Teals
  '#008B8B', '#20B2AA', '#00CED1', '#00FFFF', '#E0FFFF', '#AFEEEE', '#B0E0E6', '#87CEEB', '#87CEFA', '#00BFFF',
  // Row 6 - Blues
  '#000080', '#0000CD', '#0000FF', '#4169E1', '#6495ED', '#1E90FF', '#ADD8E6', '#B0C4DE', '#4682B4', '#5F9EA0',
  // Row 7 - Purples & Violets
  '#4B0082', '#483D8B', '#6A5ACD', '#7B68EE', '#9370DB', '#8A2BE2', '#9400D3', '#9932CC', '#BA55D3', '#DA70D6',
  // Row 8 - Magentas & Pinks
  '#8B008B', '#800080', '#C71585', '#FF1493', '#FF69B4', '#DDA0DD', '#EE82EE', '#D8BFD8', '#FFCCCB', '#F5DEB3'
]

export const ColorModal: React.FC<ColorModalProps> = ({
  showColorModal,
  selectedColor,
  customColor,
  onApplyColor,
  onCancel,
  onColorChange,
  onKeyDown
}) => {
  const [currentColor, setCurrentColor] = useState(selectedColor || '#000000')
  const [isCustomMode, setIsCustomMode] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    if (showColorModal && canvasRef.current) {
      drawColorPicker()
    }
  }, [showColorModal])

  useEffect(() => {
    if (showColorModal && modalRef.current) {
      modalRef.current.focus()
    }
  }, [showColorModal])

  const drawColorPicker = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height

    // Create a better color spectrum with more saturated colors
    // Top area: Bright, saturated colors
    // Bottom area: Darker, deeper colors
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const hue = (x / width) * 360
        
        // Create two zones: top half (bright colors) and bottom half (dark colors)
        if (y < height / 2) {
          // Top half: High saturation, varying lightness from 50% to 90%
          const saturation = 100
          const lightness = 50 + (1 - (y / (height / 2))) * 40
          ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`
        } else {
          // Bottom half: High saturation, varying lightness from 50% to 10% (darker colors)
          const saturation = 100
          const lightness = 50 - ((y - height / 2) / (height / 2)) * 40
          ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`
        }
        
        ctx.fillRect(x, y, 1, 1)
      }
    }
  }

  const drawGradient = () => {
    // Removed - no longer needed since we simplified the color picker
  }

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const imageData = ctx.getImageData(x, y, 1, 1)
    const data = imageData.data
    const hex = `#${((1 << 24) + (data[0] << 16) + (data[1] << 8) + data[2]).toString(16).slice(1)}`
    
    setCurrentColor(hex)
    onColorChange(hex)
  }

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return
    handleCanvasClick(e)
  }

  const handleDefaultColorClick = (color: string) => {
    setCurrentColor(color)
    onColorChange(color)
    setIsCustomMode(false)
  }

  const handleCustomColorInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value
    setCurrentColor(color)
    onColorChange(color)
  }

  const handleApply = () => {
    onApplyColor(currentColor)
  }

  const getRgbFromHex = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null
  }

  const rgb = getRgbFromHex(currentColor)

  if (!showColorModal) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
      <div 
        ref={modalRef}
        className="bg-white rounded-lg p-6 w-[600px] max-w-[90vw] shadow-xl"
        onKeyDown={onKeyDown}
        tabIndex={-1}
      >
        <h3 className="text-lg font-semibold mb-4">Text Color</h3>
        
        {/* Current Color Display */}
        <div className="mb-4 p-3 border border-gray-300 rounded-md bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div 
                className="w-8 h-8 border border-gray-300 rounded mr-3" 
                style={{ backgroundColor: currentColor }}
              ></div>
              <div>
                <div className="font-medium">{currentColor.toUpperCase()}</div>
                {rgb && (
                  <div className="text-sm text-gray-600">
                    RGB({rgb.r}, {rgb.g}, {rgb.b})
                  </div>
                )}
              </div>
            </div>
            <input
              type="text"
              value={currentColor}
              onChange={handleCustomColorInput}
              className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="#000000"
            />
          </div>
        </div>

        {/* Default Colors Grid */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Default Colors</h4>
          <div className="flex justify-center">
            <div className="grid grid-cols-10 gap-0 border border-gray-300 rounded overflow-hidden">
              {DEFAULT_COLORS.map((color, index) => (
                <button
                  key={index}
                  className={`w-8 h-8 border-r border-b border-gray-200 hover:scale-105 transition-transform ${
                    currentColor === color ? 'ring-2 ring-blue-500' : ''
                  } ${index % 10 === 9 ? 'border-r-0' : ''} ${index >= 70 ? 'border-b-0' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => handleDefaultColorClick(color)}
                  title={color}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Custom Color Picker */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Custom Color</h4>
          <div className="flex justify-center">
            <canvas
              ref={canvasRef}
              width={400}
              height={200}
              className="border border-gray-300 rounded cursor-crosshair"
              onClick={handleCanvasClick}
              onMouseDown={() => setIsDragging(true)}
              onMouseUp={() => setIsDragging(false)}
              onMouseMove={handleCanvasMouseMove}
              onMouseLeave={() => setIsDragging(false)}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  )
}
