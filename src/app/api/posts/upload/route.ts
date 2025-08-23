import { NextRequest, NextResponse } from 'next/server'
import pool from '../../../../../lib/db'

function generateRandomSlug(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

function extractTitleFromFilename(filename: string): string {
  // Remove .md or .markdown extension and replace hyphens/underscores with spaces
  return filename
    .replace(/\.(md|markdown)$/i, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase()) // Capitalize first letter of each word
}

function estimateReadTime(content: string): number {
  // Average reading speed is ~200 words per minute
  const wordsPerMinute = 200
  const wordCount = content.trim().split(/\s+/).length
  return Math.max(1, Math.ceil(wordCount / wordsPerMinute))
}

export async function POST(request: NextRequest) {
  let client
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!file.type.includes('markdown') && !file.name.endsWith('.md') && !file.name.endsWith('.markdown')) {
      return NextResponse.json({ error: 'Invalid file type. Please upload a markdown file.' }, { status: 400 })
    }

    // Get database connection
    client = await pool.connect()

    // Read file content
    const content = await file.text()
    
    // Extract title from filename
    const title = extractTitleFromFilename(file.name)
    
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
    
    // Calculate read time
    const readTimeMinutes = estimateReadTime(content)
    
    // Insert new post
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
        title,
        null, // excerpt - empty for now
        content,
        'draft',
        'Chuangji Li',
        readTimeMinutes,
        null, // cover_image_url - null for now
        null  // published_at - null for draft
      ]
    )
    
    const newPost = insertResult.rows[0]
    
    return NextResponse.json({
      success: true,
      message: 'Post created successfully',
      post: newPost
    })
    
  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json(
      { error: 'Failed to upload file and create post' },
      { status: 500 }
    )
  } finally {
    if (client) {
      client.release()
    }
  }
}
