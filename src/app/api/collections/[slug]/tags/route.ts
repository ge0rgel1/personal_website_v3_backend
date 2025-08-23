import { NextRequest, NextResponse } from 'next/server'
import pool from '../../../../../../lib/db'

interface Params {
  params: Promise<{
    slug: string
  }>
}

// GET /api/collections/[slug]/tags - Get tags for a collection
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { slug } = await params
    
    const query = `
      SELECT t.id, t.name, t.slug, t.description, t.background_color, t.text_color
      FROM tags t
      INNER JOIN collection_tags ct ON t.id = ct.tag_id
      INNER JOIN collections c ON ct.collection_id = c.id
      WHERE c.slug = $1
      ORDER BY t.name
    `
    
    const result = await pool.query(query, [slug])
    
    return NextResponse.json({
      success: true,
      tags: result.rows
    })
  } catch (error) {
    console.error('Error fetching collection tags:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch collection tags' },
      { status: 500 }
    )
  }
}

// PUT /api/collections/[slug]/tags - Update tags for a collection
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { slug } = await params
    const { tagIds } = await request.json()
    
    if (!Array.isArray(tagIds)) {
      return NextResponse.json(
        { success: false, error: 'tagIds must be an array' },
        { status: 400 }
      )
    }
    
    // Get collection ID
    const collectionQuery = 'SELECT id FROM collections WHERE slug = $1'
    const collectionResult = await pool.query(collectionQuery, [slug])
    
    if (collectionResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Collection not found' },
        { status: 404 }
      )
    }
    
    const collectionId = collectionResult.rows[0].id
    
    // Begin transaction
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      
      // Delete existing tags
      await client.query('DELETE FROM collection_tags WHERE collection_id = $1', [collectionId])
      
      // Insert new tags
      if (tagIds.length > 0) {
        const values = tagIds.map((tagId: number, index: number) => 
          `($1, $${index + 2})`
        ).join(', ')
        
        const query = `INSERT INTO collection_tags (collection_id, tag_id) VALUES ${values}`
        await client.query(query, [collectionId, ...tagIds])
      }
      
      await client.query('COMMIT')
      
      return NextResponse.json({
        success: true,
        message: 'Collection tags updated successfully'
      })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Error updating collection tags:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update collection tags' },
      { status: 500 }
    )
  }
}
