import { NextRequest, NextResponse } from 'next/server'
import pool from '../../../../../../lib/db'

interface CollectionPostsPageProps {
  params: Promise<{
    slug: string
  }>
}

export async function POST(
  request: NextRequest,
  { params }: CollectionPostsPageProps
) {
  try {
    const { slug } = await params
    const { postId } = await request.json()

    if (!postId) {
      return NextResponse.json(
        { success: false, error: 'Post ID is required' },
        { status: 400 }
      )
    }

    // Convert postId to integer to match database type
    const postIdInt = parseInt(postId)
    
    if (isNaN(postIdInt)) {
      return NextResponse.json(
        { success: false, error: 'Post ID must be a valid number' },
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

    // Check if the post exists
    const postCheckQuery = 'SELECT id FROM posts WHERE id = $1'
    const postCheckResult = await pool.query(postCheckQuery, [postIdInt])

    if (postCheckResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: `Post with ID ${postIdInt} does not exist` },
        { status: 404 }
      )
    }

    // Check if the post is already in the collection
    const existingQuery = 'SELECT collection_id, post_id FROM collection_posts WHERE collection_id = $1 AND post_id = $2'
    const existingResult = await pool.query(existingQuery, [collectionId, postIdInt])

    if (existingResult.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Post is already in this collection' },
        { status: 400 }
      )
    }

    // Get the next position for this collection
    const positionQuery = 'SELECT COALESCE(MAX(position), 0) + 1 as next_position FROM collection_posts WHERE collection_id = $1'
    const positionResult = await pool.query(positionQuery, [collectionId])
    const nextPosition = positionResult.rows[0].next_position

    // Add the post to the collection
    const insertQuery = 'INSERT INTO collection_posts (collection_id, post_id, position) VALUES ($1, $2, $3)'
    await pool.query(insertQuery, [collectionId, postIdInt, nextPosition])

    return NextResponse.json({
      success: true,
      message: 'Post added to collection successfully',
      position: nextPosition
    })

  } catch (error) {
    console.error('Error adding post to collection:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: CollectionPostsPageProps
) {
  try {
    const { slug } = await params
    const { postId } = await request.json()

    if (!postId) {
      return NextResponse.json(
        { success: false, error: 'Post ID is required' },
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

    // Remove the post from the collection
    const deleteQuery = 'DELETE FROM collection_posts WHERE collection_id = $1 AND post_id = $2'
    const deleteResult = await pool.query(deleteQuery, [collectionId, postId])

    if (deleteResult.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Post not found in collection' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Post removed from collection successfully'
    })

  } catch (error) {
    console.error('Error removing post from collection:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
