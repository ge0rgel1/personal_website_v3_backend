import { NextRequest, NextResponse } from 'next/server'
import pool from '../../../../../../lib/db'

// PUT /api/reviews/[id]/tags - Update review tags
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const reviewId = parseInt(id)
    const { tagIds } = await request.json()

    if (!Array.isArray(tagIds)) {
      return NextResponse.json(
        { error: 'tagIds must be an array' },
        { status: 400 }
      )
    }

    // Start transaction
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')

      // Remove all existing review-tag relationships for this review
      await client.query(
        'DELETE FROM review_tags WHERE review_id = $1',
        [reviewId]
      )

      // Add new review-tag relationships
      if (tagIds.length > 0) {
        const values = tagIds.map((_: number, index: number) => `($1, $${index + 2})`).join(', ')
        const query = `INSERT INTO review_tags (review_id, tag_id) VALUES ${values}`
        await client.query(query, [reviewId, ...tagIds])
      }

      await client.query('COMMIT')

      return NextResponse.json({
        success: true,
        message: 'Review tags updated successfully'
      })

    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }

  } catch (error) {
    console.error('Error updating review tags:', error)
    return NextResponse.json(
      { error: 'Failed to update review tags' },
      { status: 500 }
    )
  }
}

// GET /api/reviews/[id]/tags - Get tags for a specific review
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const reviewId = parseInt(id)

    const result = await pool.query(`
      SELECT t.id, t.name, t.slug, t.description, t.background_color, t.text_color 
      FROM tags t
      JOIN review_tags rt ON t.id = rt.tag_id
      WHERE rt.review_id = $1
      ORDER BY t.name ASC
    `, [reviewId])
    
    return NextResponse.json({
      success: true,
      tags: result.rows
    })
  } catch (error) {
    console.error('Error fetching review tags:', error)
    return NextResponse.json(
      { error: 'Failed to fetch review tags' },
      { status: 500 }
    )
  }
}
