import { NextRequest, NextResponse } from 'next/server'
import pool from '../../../../lib/db'

const defaultColors = [
  { background: '#FEE2E2', text: '#991B1B' }, // Red
  { background: '#FEF3C7', text: '#92400E' }, // Amber
  { background: '#D1FAE5', text: '#065F46' }, // Green
  { background: '#DBEAFE', text: '#1E40AF' }, // Blue
  { background: '#E0E7FF', text: '#3730A3' }, // Indigo
  { background: '#F5D0FE', text: '#701A75' }, // Fuchsia
  { background: '#FCE7F3', text: '#9D174D' }  // Pink
];

function getRandomColor() {
  return defaultColors[Math.floor(Math.random() * defaultColors.length)];
}

// GET /api/tags - Get all tags
export async function GET() {
  try {
    const result = await pool.query(
      'SELECT id, name, slug, description, background_color, text_color FROM tags ORDER BY name ASC'
    )
    
    return NextResponse.json({
      success: true,
      tags: result.rows
    })
  } catch (error) {
    console.error('Error fetching tags:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tags' },
      { status: 500 }
    )
  }
}

// POST /api/tags - Create a new tag
export async function POST(request: NextRequest) {
  try {
    const { name, description } = await request.json()
    
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Tag name is required' },
        { status: 400 }
      )
    }

    // Generate slug from name
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

    // Check if tag already exists
    const existingTag = await pool.query(
      'SELECT id FROM tags WHERE LOWER(name) = LOWER($1) OR slug = $2',
      [name, slug]
    )

    if (existingTag.rows.length > 0) {
      return NextResponse.json(
        { error: 'Tag already exists' },
        { status: 409 }
      )
    }

    // Assign a random color
    const { background, text } = getRandomColor();

    // Create new tag
    const result = await pool.query(
      'INSERT INTO tags (name, slug, description, background_color, text_color) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, slug, description, background_color, text_color',
      [name.trim(), slug, description || null, background, text]
    )
    
    return NextResponse.json({
      success: true,
      tag: result.rows[0]
    })
  } catch (error) {
    console.error('Error creating tag:', error)
    return NextResponse.json(
      { error: 'Failed to create tag' },
      { status: 500 }
    )
  }
}
