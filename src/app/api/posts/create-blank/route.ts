import { NextResponse } from 'next/server'
import pool from '../../../../../lib/db'

function generateRandomSlug(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

export async function POST() {
  let client
  try {
    // Get database connection
    client = await pool.connect()
    
    // Generate random slug (with conflict retry logic)
    let slug = generateRandomSlug()
    let slugAttempts = 0
    const maxSlugAttempts = 5
    
    while (slugAttempts < maxSlugAttempts) {
      try {
        // Check if slug exists
        const existingPost = await client.query(
          'SELECT id FROM posts WHERE slug = $1',
          [slug]
        )
        
        if (existingPost.rows.length === 0) {
          break // Slug is unique
        }
        
        // Generate new slug
        slug = generateRandomSlug()
        slugAttempts++
      } catch (error) {
        console.error('Error checking slug uniqueness:', error)
        break
      }
    }
    
    // Insert new blank post
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
        slug,
        'Title', // Default title
        null, // excerpt - empty
        '', // content_md - empty
        'draft',
        'Chuangji Li',
        1, // read_time_minutes - default to 1
        null, // cover_image_url - null
        null  // published_at - null for draft
      ]
    )
    
    const newPost = insertResult.rows[0]
    
    return NextResponse.json({
      success: true,
      message: 'Blank post created successfully',
      post: newPost
    })
    
  } catch (error) {
    console.error('Error creating blank post:', error)
    return NextResponse.json(
      { error: 'Failed to create blank post' },
      { status: 500 }
    )
  } finally {
    if (client) {
      client.release()
    }
  }
}
