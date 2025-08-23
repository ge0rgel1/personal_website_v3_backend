import { NextRequest, NextResponse } from 'next/server'
import { uploadImageToR2 } from '@/lib/r2'
import pool from '@/../lib/db'

export async function POST(request: NextRequest) {
  try {
    // Get folder from query parameters, default to 'posts'
    const { searchParams } = new URL(request.url)
    const folder = searchParams.get('folder') || 'posts'
    
    // Validate folder parameter
    const allowedFolders = ['posts', 'collections', 'projects', 'reviews', 'general']
    if (!allowedFolders.includes(folder)) {
      return NextResponse.json(
        { error: `Invalid folder. Allowed folders: ${allowedFolders.join(', ')}` },
        { status: 400 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      )
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024 // 10MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      )
    }

    // Upload to R2 with specified folder
    const uploadResult = await uploadImageToR2(file, file.name, file.type, folder)

    // Store in database
    const dbResult = await pool.query(
      `INSERT INTO images (storage_key, mime_type, size_bytes, alt, created_at) 
       VALUES ($1, $2, $3, $4, NOW()) 
       RETURNING id, storage_key`,
      [uploadResult.url, file.type, file.size, uploadResult.filename.split('.')[0]]
    )

    const imageRecord = dbResult.rows[0]

    return NextResponse.json({
      success: true,
      image: {
        id: imageRecord.id,
        url: uploadResult.url,
        filename: uploadResult.filename,
        alt: uploadResult.filename.split('.')[0], // Use filename without extension as default alt text
      }
    })

  } catch (error) {
    console.error('Image upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    )
  }
}

// Handle OPTIONS for CORS if needed
export async function OPTIONS() {
  return new NextResponse(null, { status: 200 })
}
