import { NextResponse } from 'next/server'
import pool from '../../../../../lib/db'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params
    
    if (!postId) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      )
    }
    
    const client = await pool.connect()
    
    // Fetch the specific post with its tags
    const query = `
      SELECT 
        p.id,
        p.slug,
        p.title,
        p.excerpt,
        p.content_md,
        p.status,
        p.author,
        p.read_time_minutes,
        p.cover_image_url,
        p.published_at,
        p.view_count,
        p.created_at,
        p.updated_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', t.id, 
              'name', t.name, 
              'slug', t.slug, 
              'description', t.description,
              'background_color', t.background_color,
              'text_color', t.text_color
            )
          ) FILTER (WHERE t.id IS NOT NULL), 
          '[]'::json
        ) as tags
      FROM posts p
      LEFT JOIN post_tags pt ON p.id = pt.post_id
      LEFT JOIN tags t ON pt.tag_id = t.id
      WHERE p.id = $1
      GROUP BY p.id, p.slug, p.title, p.excerpt, p.content_md, p.status, 
               p.author, p.read_time_minutes, p.cover_image_url, 
               p.published_at, p.view_count, p.created_at, p.updated_at
    `
    
    const result = await client.query(query, [postId])
    client.release()
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      post: result.rows[0]
    })
    
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch post' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params
    
    if (!postId) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const {
      title,
      slug,
      excerpt,
      content_md,
      author,
      status,
      read_time_minutes,
      cover_image_url
    } = body

    // Validate status if provided
    if (status && !['draft', 'published', 'archived'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be draft, published, or archived' },
        { status: 400 }
      )
    }

    const client = await pool.connect()

    // Build dynamic update query
    const updateFields = []
    const values = []
    let paramCount = 1

    if (title !== undefined) {
      updateFields.push(`title = $${paramCount}`)
      values.push(title)
      paramCount++
    }

    if (slug !== undefined) {
      updateFields.push(`slug = $${paramCount}`)
      values.push(slug)
      paramCount++
    }

    if (excerpt !== undefined) {
      updateFields.push(`excerpt = $${paramCount}`)
      values.push(excerpt)
      paramCount++
    }

    if (content_md !== undefined) {
      updateFields.push(`content_md = $${paramCount}`)
      values.push(content_md)
      paramCount++
    }

    if (author !== undefined) {
      updateFields.push(`author = $${paramCount}`)
      values.push(author)
      paramCount++
    }

    if (status !== undefined) {
      updateFields.push(`status = $${paramCount}`)
      values.push(status)
      paramCount++
    }

    if (read_time_minutes !== undefined) {
      updateFields.push(`read_time_minutes = $${paramCount}`)
      values.push(read_time_minutes)
      paramCount++
    }

    if (cover_image_url !== undefined) {
      updateFields.push(`cover_image_url = $${paramCount}`)
      values.push(cover_image_url)
      paramCount++
    }

    if (updateFields.length === 0) {
      client.release()
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    // Add updated_at timestamp
    updateFields.push(`updated_at = NOW()`)
    
    // Add the post ID as the last parameter
    values.push(postId)

    const updateQuery = `
      UPDATE posts 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `

    const result = await client.query(updateQuery, values)
    client.release()

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: 'Post updated successfully',
      post: result.rows[0]
    })

  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json(
      { error: 'Failed to update post' },
      { status: 500 }
    )
  }
}
