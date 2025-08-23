import { NextRequest, NextResponse } from 'next/server'
import pool from '../../../../../lib/db'

function generateRandomSlug(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

export async function POST(request: NextRequest) {
  let client
  try {
    const { templateId } = await request.json()
    
    if (!templateId) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 })
    }

    // Get database connection
    client = await pool.connect()
    
    // Fetch the template post
    const templateResult = await client.query(
      'SELECT * FROM posts WHERE id = $1',
      [templateId]
    )
    
    if (templateResult.rows.length === 0) {
      return NextResponse.json({ error: 'Template post not found' }, { status: 404 })
    }
    
    const template = templateResult.rows[0]
    
    // Create new title and slug with "(Copy)"
    const newTitle = template.title + ' (Copy)'
    let newSlug = template.slug + '-copy'
    
    // Ensure slug uniqueness (with conflict retry logic)
    let slugAttempts = 0
    const maxSlugAttempts = 10
    
    while (slugAttempts < maxSlugAttempts) {
      try {
        const existingPost = await client.query(
          'SELECT id FROM posts WHERE slug = $1',
          [newSlug]
        )
        
        if (existingPost.rows.length === 0) {
          break // Slug is unique
        }
        
        // Add random suffix to make it unique
        newSlug = template.slug + '-copy-' + generateRandomSlug().substring(0, 8)
        slugAttempts++
      } catch (error) {
        console.error('Error checking slug uniqueness:', error)
        break
      }
    }
    
    // Insert new post copying all fields from template
    const insertResult = await client.query(
      `INSERT INTO posts (
        slug, 
        title, 
        excerpt, 
        content_md, 
        status, 
        author, 
        read_time_minutes, 
        cover_image_url,
        published_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
      RETURNING id, slug, title`,
      [
        newSlug,
        newTitle,
        template.excerpt, // Copy excerpt
        template.content_md, // Copy content
        'draft', // Always draft status
        template.author, // Copy author
        template.read_time_minutes, // Copy read time
        template.cover_image_url, // Copy cover image
        null // published_at - null for draft
      ]
    )
    
    const newPost = insertResult.rows[0]
    
    // Copy tags from template post
    const templateTagsResult = await client.query(
      'SELECT tag_id FROM post_tags WHERE post_id = $1',
      [templateId]
    )
    
    if (templateTagsResult.rows.length > 0) {
      // Insert tag associations for the new post
      const tagValues = templateTagsResult.rows.map((_, index) => 
        `($1, $${index + 2})`
      ).join(', ')
      
      const tagParams = [newPost.id, ...templateTagsResult.rows.map(row => row.tag_id)]
      
      await client.query(
        `INSERT INTO post_tags (post_id, tag_id) VALUES ${tagValues}`,
        tagParams
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'Post created from template successfully',
      post: newPost
    })
    
  } catch (error) {
    console.error('Error creating post from template:', error)
    return NextResponse.json(
      { error: 'Failed to create post from template' },
      { status: 500 }
    )
  } finally {
    if (client) {
      client.release()
    }
  }
}
