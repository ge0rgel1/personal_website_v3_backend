import { NextResponse } from 'next/server'
import pool from '../../../../lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    
    const client = await pool.connect()
    
    // Fetch all posts with their tags
    let query = `
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
              'background_color', t.background_color,
              'text_color', t.text_color
            )
          ) FILTER (WHERE t.id IS NOT NULL), 
          '[]'::json
        ) as tags
      FROM posts p
      LEFT JOIN post_tags pt ON p.id = pt.post_id
      LEFT JOIN tags t ON pt.tag_id = t.id
    `
    
    // Add WHERE clause if status filter is provided
    if (status) {
      query += ` WHERE p.status = $1`
    }
    
    query += `
      GROUP BY p.id, p.slug, p.title, p.excerpt, p.content_md, p.status, 
               p.author, p.read_time_minutes, p.cover_image_url, 
               p.published_at, p.view_count, p.created_at, p.updated_at
      ORDER BY p.created_at DESC
    `
    
    const result = status 
      ? await client.query(query, [status])
      : await client.query(query)
    
    client.release()
    
    return NextResponse.json({
      posts: result.rows
    })
    
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const postId = searchParams.get('id')
    
    if (!postId) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      )
    }
    
    const client = await pool.connect()
    
    // Start transaction
    await client.query('BEGIN')
    
    try {
      // First, check if the post exists
      const checkQuery = 'SELECT id, title FROM posts WHERE id = $1'
      const checkResult = await client.query(checkQuery, [postId])
      
      if (checkResult.rows.length === 0) {
        await client.query('ROLLBACK')
        client.release()
        return NextResponse.json(
          { error: 'Post not found' },
          { status: 404 }
        )
      }
      
      // Delete from post_tags table first (due to foreign key constraint)
      await client.query('DELETE FROM post_tags WHERE post_id = $1', [postId])
      
      // Delete the post from posts table
      await client.query('DELETE FROM posts WHERE id = $1', [postId])
      
      // Commit transaction
      await client.query('COMMIT')
      client.release()
      
      return NextResponse.json({
        success: true,
        message: `Post "${checkResult.rows[0].title}" deleted successfully`
      })
      
    } catch (error) {
      // Rollback on error
      await client.query('ROLLBACK')
      client.release()
      throw error
    }
    
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json(
      { error: 'Failed to delete post' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const postId = searchParams.get('id')
    
    if (!postId) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { status, read_time_minutes, title } = body

    // Validate that at least one field is provided
    if (!status && read_time_minutes === undefined && !title) {
      return NextResponse.json(
        { error: 'At least one field (status, read_time_minutes, or title) is required' },
        { status: 400 }
      )
    }

    // Validate status if provided
    if (status && !['draft', 'published', 'archived'].includes(status)) {
      return NextResponse.json(
        { error: 'Valid status is required (draft, published, or archived)' },
        { status: 400 }
      )
    }

    // Validate read_time_minutes if provided
    if (read_time_minutes !== undefined && (typeof read_time_minutes !== 'number' || read_time_minutes < 0)) {
      return NextResponse.json(
        { error: 'read_time_minutes must be a non-negative number' },
        { status: 400 }
      )
    }

    // Validate title if provided
    if (title !== undefined && (typeof title !== 'string' || title.trim() === '')) {
      return NextResponse.json(
        { error: 'title must be a non-empty string' },
        { status: 400 }
      )
    }

    const client = await pool.connect()
    
    try {
      // Check if the post exists
      const checkQuery = 'SELECT id, title FROM posts WHERE id = $1'
      const checkResult = await client.query(checkQuery, [postId])
      
      if (checkResult.rows.length === 0) {
        client.release()
        return NextResponse.json(
          { error: 'Post not found' },
          { status: 404 }
        )
      }

      // Build dynamic update query
      const updates = []
      const values = []
      let paramCount = 1

      if (status) {
        updates.push(`status = $${paramCount}`)
        values.push(status)
        paramCount++
      }

      if (read_time_minutes !== undefined) {
        updates.push(`read_time_minutes = $${paramCount}`)
        values.push(read_time_minutes)
        paramCount++
      }

      if (title !== undefined) {
        updates.push(`title = $${paramCount}`)
        values.push(title.trim())
        paramCount++
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`)
      values.push(postId)

      const updateQuery = `UPDATE posts SET ${updates.join(', ')} WHERE id = $${paramCount}`
      await client.query(updateQuery, values)
      
      client.release()
      
      const responseData: any = {
        success: true,
        post: {
          id: postId
        }
      }

      if (status) {
        responseData.message = `Post status updated to ${status}`
        responseData.post.status = status
      }

      if (read_time_minutes !== undefined) {
        responseData.message = status 
          ? `Post status and read time updated` 
          : `Read time updated to ${read_time_minutes} minutes`
        responseData.post.read_time_minutes = read_time_minutes
      }

      if (title !== undefined) {
        const updates = []
        if (status) updates.push('status')
        if (read_time_minutes !== undefined) updates.push('read time')
        updates.push('title')
        
        responseData.message = updates.length > 1 
          ? `Post ${updates.join(' and ')} updated`
          : `Title updated successfully`
        responseData.post.title = title.trim()
      }
      
      return NextResponse.json(responseData)
      
    } catch (error) {
      client.release()
      throw error
    }
    
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json(
      { error: 'Failed to update post status' },
      { status: 500 }
    )
  }
}
