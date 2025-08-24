import { NextRequest, NextResponse } from 'next/server'
import pool from '../../../../lib/db'

interface Review {
  id: number
  object: string
  author?: string
  score: number
  review_text: string
  thumbnail?: string
  created_at: string
  tags: Array<{
    id: number
    name: string
    slug: string
    description: string | null
    background_color: string
    text_color: string
  }>
}

// GET /api/reviews - Get all reviews with tags
export async function GET(request: NextRequest) {
  try {
    // console.log('Reviews API: Starting request...')
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const tag = searchParams.get('tag') || ''
    const type = searchParams.get('type') || ''
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // console.log('Reviews API: Parameters:', { page, limit, search, tag, type, sortBy, sortOrder })

    const offset = (page - 1) * limit

    // Build the base query for reviews
    const whereConditions = []
    const queryParams: (string | number)[] = []
    let paramIndex = 1

    // Search functionality
    if (search) {
      whereConditions.push(`(r.object ILIKE $${paramIndex} OR r.review_text ILIKE $${paramIndex + 1})`)
      queryParams.push(`%${search}%`, `%${search}%`)
      paramIndex += 2
    }

    // Author filter (instead of review type)
    if (type) {
      whereConditions.push(`r.author ILIKE $${paramIndex}`)
      queryParams.push(`%${type}%`)
      paramIndex++
    }

    // Tag filter
    if (tag) {
      whereConditions.push(`r.id IN (
        SELECT rt.review_id 
        FROM review_tags rt 
        JOIN tags t ON rt.tag_id = t.id 
        WHERE t.slug = $${paramIndex}
      )`)
      queryParams.push(tag)
      paramIndex++
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''

    // Validate sort parameters
    const allowedSortColumns = ['created_at', 'object', 'author', 'score']
    const validSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at'
    const validSortOrder = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC'

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(DISTINCT r.id) as total
      FROM reviews r
      ${whereClause}
    `
    // console.log('Reviews API: Count query:', countQuery, 'Params:', queryParams)
    const countResult = await pool.query(countQuery, queryParams)
    // console.log('Reviews API: Count result:', countResult.rows)
    const totalItems = parseInt(countResult.rows[0].total)
    const totalPages = Math.ceil(totalItems / limit)

    // Get reviews with pagination
    const reviewsQuery = `
      SELECT r.id, r.object, r.author, r.score, r.review_text, r.thumbnail, r.created_at
      FROM reviews r
      ${whereClause}
      ORDER BY r.${validSortBy} ${validSortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `
    const finalQueryParams = [...queryParams, limit, offset];

    const reviewsResult = await pool.query(reviewsQuery, finalQueryParams)

    if (reviewsResult.rows.length === 0) {
      return NextResponse.json({
        success: true,
        reviews: [],
        totalCount: 0,
        totalPages: 0,
        currentPage: page
      })
    }

    // Get all tags for these reviews
    const reviewIds = reviewsResult.rows.map((review: Review) => review.id)
    const tagsQuery = `
      SELECT rt.review_id, t.id, t.name, t.slug, t.description, t.background_color, t.text_color
      FROM review_tags rt
      JOIN tags t ON rt.tag_id = t.id
      WHERE rt.review_id = ANY($1)
      ORDER BY t.name ASC
    `
    const tagsResult = await pool.query(tagsQuery, [reviewIds])

    // Create tags lookup map
    const tagsMap = new Map<number, Review['tags']>()
    tagsResult.rows.forEach((row: { review_id: number } & Review['tags'][0]) => {
      if (!tagsMap.has(row.review_id)) {
        tagsMap.set(row.review_id, [])
      }
      tagsMap.get(row.review_id)?.push({
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        background_color: row.background_color,
        text_color: row.text_color
      })
    })

    // Combine reviews with tags
    const reviews: Review[] = reviewsResult.rows.map((review: Review) => ({
      id: review.id,
      object: review.object,
      author: review.author,
      score: review.score,
      review_text: review.review_text,
      thumbnail: review.thumbnail,
      created_at: review.created_at,
      tags: tagsMap.get(review.id) || []
    }))

    return NextResponse.json({
      success: true,
      reviews: reviews,
      totalCount: totalItems,
      totalPages,
      currentPage: page
    })

  } catch (error) {
    console.error('Reviews API Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reviews', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

// POST /api/reviews - Create a new review
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { object, author, score, review_text, thumbnail, tag_ids = [] }: {
      object: string;
      author?: string;
      score: number;
      review_text: string;
      thumbnail?: string;
      tag_ids: number[];
    } = body

    // Validation
    if (!object || !review_text) {
      return NextResponse.json(
        { error: 'Object and review_text are required' },
        { status: 400 }
      )
    }

    if (score !== null && score !== undefined && (score < 0 || score > 10)) {
      return NextResponse.json(
        { error: 'Score must be between 0 and 10' },
        { status: 400 }
      )
    }

    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')

      // Insert the review
      const insertQuery = `
        INSERT INTO reviews (object, author, score, review_text, thumbnail)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, object, author, score, review_text, thumbnail, created_at
      `
      const result = await client.query(insertQuery, [
        object.trim(),
        author?.trim() || null,
        score,
        review_text.trim(),
        thumbnail?.trim() || null
      ])

      const newReview: Review = result.rows[0]

      // Add tags if provided
      if (tag_ids.length > 0) {
        const tagValues = tag_ids.map((_, index: number) => `($1, $${index + 2})`).join(', ')
        const tagQuery = `INSERT INTO review_tags (review_id, tag_id) VALUES ${tagValues}`
        await client.query(tagQuery, [newReview.id, ...tag_ids])
      }

      await client.query('COMMIT')

      return NextResponse.json({
        success: true,
        review: newReview
      })

    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }

  } catch (error) {
    console.error('Error creating review:', error)
    return NextResponse.json(
      { error: 'Failed to create review' },
      { status: 500 }
    )
  }
}
