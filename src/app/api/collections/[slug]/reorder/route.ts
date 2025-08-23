import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  host: 'ep-green-credit-ads0h4ly-pooler.c-2.us-east-1.aws.neon.tech',
  port: 5432,
  user: 'neondb_owner',
  password: 'npg_3IuaBKM6OqxP',
  database: 'neondb',
  ssl: { rejectUnauthorized: false }, // Required for Neon
})

interface ReorderPageProps {
  params: Promise<{
    slug: string
  }>
}

export async function PUT(
  request: NextRequest,
  { params }: ReorderPageProps
) {
  try {
    const { slug } = await params
    const { postIds } = await request.json()

    if (!postIds || !Array.isArray(postIds)) {
      return NextResponse.json(
        { success: false, error: 'Post IDs array is required' },
        { status: 400 }
      )
    }

    // First, get the collection ID from the slug
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

      // Use a large offset to temporarily move positions out of the way
      const offset = 1000000
      
      // First pass: set all positions to offset + new_position to avoid conflicts
      for (let i = 0; i < postIds.length; i++) {
        const postId = postIds[i]
        const tempPosition = offset + i + 1

        await client.query(
          'UPDATE collection_posts SET position = $1 WHERE collection_id = $2 AND post_id = $3',
          [tempPosition, collectionId, postId]
        )
      }

      // Second pass: set final positions
      for (let i = 0; i < postIds.length; i++) {
        const postId = postIds[i]
        const finalPosition = i + 1

        await client.query(
          'UPDATE collection_posts SET position = $1 WHERE collection_id = $2 AND post_id = $3',
          [finalPosition, collectionId, postId]
        )
      }

      await client.query('COMMIT')

      return NextResponse.json({
        success: true,
        message: 'Post order updated successfully'
      })

    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }

  } catch (error) {
    console.error('Error reordering posts:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
