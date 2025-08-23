import { NextRequest, NextResponse } from 'next/server'
import pool from '../../../../../../lib/db'

// PUT /api/posts/[id]/tags - Update post tags
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const postId = parseInt(id)
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

      // Remove all existing post-tag relationships for this post
      await client.query(
        'DELETE FROM post_tags WHERE post_id = $1',
        [postId]
      )

      // Add new post-tag relationships
      if (tagIds.length > 0) {
        const values = tagIds.map((tagId, index) => `($1, $${index + 2})`).join(', ')
        const query = `INSERT INTO post_tags (post_id, tag_id) VALUES ${values}`
        await client.query(query, [postId, ...tagIds])
      }

      await client.query('COMMIT')

      return NextResponse.json({
        success: true,
        message: 'Post tags updated successfully'
      })

    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }

  } catch (error) {
    console.error('Error updating post tags:', error)
    return NextResponse.json(
      { error: 'Failed to update post tags' },
      { status: 500 }
    )
  }
}

// GET /api/posts/[id]/tags - Get tags for a specific post
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const postId = parseInt(id)

    const result = await pool.query(`
      SELECT t.id, t.name, t.slug, t.description 
      FROM tags t
      JOIN post_tags pt ON t.id = pt.tag_id
      WHERE pt.post_id = $1
      ORDER BY t.name ASC
    `, [postId])
    
    return NextResponse.json({
      success: true,
      tags: result.rows
    })
  } catch (error) {
    console.error('Error fetching post tags:', error)
    return NextResponse.json(
      { error: 'Failed to fetch post tags' },
      { status: 500 }
    )
  }
}
