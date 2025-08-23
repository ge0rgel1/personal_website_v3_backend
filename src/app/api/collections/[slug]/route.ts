import { NextRequest, NextResponse } from 'next/server'
import pool from '../../../../../lib/db'

interface CollectionPageProps {
  params: {
    slug: string
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Get collection with posts
    const query = `
      SELECT 
        c.id,
        c.title,
        c.slug,
        c.description,
        c.cover_image_url,
        c.is_public,
        c.created_at,
        c.updated_at,
        COALESCE(
          JSON_AGG(
            CASE 
              WHEN p.id IS NOT NULL THEN
                JSON_BUILD_OBJECT(
                  'id', p.id,
                  'title', p.title,
                  'slug', p.slug,
                  'excerpt', p.excerpt,
                  'cover_image_url', p.cover_image_url,
                  'status', p.status,
                  'created_at', p.created_at,
                  'updated_at', p.updated_at,
                  'position', cp.position,
                  'added_at', cp.added_at
                )
              ELSE NULL
            END
            ORDER BY cp.position ASC
          ) FILTER (WHERE p.id IS NOT NULL),
          '[]'::json
        ) as posts
      FROM collections c
      LEFT JOIN collection_posts cp ON c.id = cp.collection_id
      LEFT JOIN posts p ON cp.post_id = p.id
      WHERE c.slug = $1
      GROUP BY c.id, c.title, c.slug, c.description, c.cover_image_url, c.is_public, c.created_at, c.updated_at
    `

    const result = await pool.query(query, [slug])

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Collection not found' },
        { status: 404 }
      )
    }

    const collection = result.rows[0]

    // Parse the posts JSON
    if (typeof collection.posts === 'string') {
      collection.posts = JSON.parse(collection.posts)
    }

    return NextResponse.json({
      success: true,
      data: collection
    })

  } catch (error) {
    console.error('Error fetching collection:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

interface CollectionUpdateData {
  title: string
  slug: string
  description?: string
  cover_image_url?: string
  is_public: boolean
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    console.log('PUT request received for collection update')
    const { slug } = await params
    console.log('Collection slug:', slug)

    const updateData: CollectionUpdateData = await request.json()
    console.log('Update data:', updateData)
    
    // Validate required fields
    if (!updateData.title?.trim() || !updateData.slug?.trim()) {
      console.log('Missing required fields')
      return NextResponse.json(
        { error: 'Title and slug are required' },
        { status: 400 }
      )
    }

    // Check if the collection exists
    const existingQuery = 'SELECT id, slug FROM collections WHERE slug = $1'
    const existingResult = await pool.query(existingQuery, [slug])
    
    if (existingResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      )
    }

    const existingCollection = existingResult.rows[0]

    // Check if slug is being changed and if new slug already exists
    if (updateData.slug !== existingCollection.slug) {
      const slugCheckQuery = 'SELECT id FROM collections WHERE slug = $1 AND id != $2'
      const slugCheckResult = await pool.query(slugCheckQuery, [updateData.slug, existingCollection.id])
      
      if (slugCheckResult.rows.length > 0) {
        return NextResponse.json(
          { error: 'A collection with this slug already exists' },
          { status: 400 }
        )
      }
    }

    // Update the collection
    const updateQuery = `
      UPDATE collections 
      SET title = $1, slug = $2, description = $3, cover_image_url = $4, is_public = $5, updated_at = now()
      WHERE id = $6
      RETURNING *
    `
    
    const updateResult = await pool.query(updateQuery, [
      updateData.title.trim(),
      updateData.slug.trim(),
      updateData.description?.trim() || null,
      updateData.cover_image_url?.trim() || null,
      updateData.is_public,
      existingCollection.id
    ])

    return NextResponse.json({
      success: true,
      collection: updateResult.rows[0]
    })

  } catch (error) {
    console.error('Error updating collection:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    // Check if the collection exists
    const existingQuery = 'SELECT id FROM collections WHERE slug = $1'
    const existingResult = await pool.query(existingQuery, [slug])
    
    if (existingResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Collection not found' },
        { status: 404 }
      )
    }

    // Delete the collection (this will cascade to collection_posts and collection_tags)
    const deleteQuery = 'DELETE FROM collections WHERE slug = $1 RETURNING *'
    await pool.query(deleteQuery, [slug])

    return NextResponse.json({
      success: true,
      message: 'Collection deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting collection:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
