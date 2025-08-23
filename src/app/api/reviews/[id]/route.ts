import { NextRequest, NextResponse } from 'next/server'
import pool from '../../../../../lib/db'

// GET /api/reviews/[id] - Get a specific review
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const reviewId = parseInt(id)

    if (isNaN(reviewId)) {
      return NextResponse.json(
        { error: 'Invalid review ID' },
        { status: 400 }
      )
    }

    // Get review details
    const reviewQuery = `
      SELECT id, object, author, score, review_text, thumbnail, created_at
      FROM reviews
      WHERE id = $1
    `
    const reviewResult = await pool.query(reviewQuery, [reviewId])

    if (reviewResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      )
    }

    // Get tags for this review
    const tagsQuery = `
      SELECT t.id, t.name, t.slug, t.description
      FROM review_tags rt
      JOIN tags t ON rt.tag_id = t.id
      WHERE rt.review_id = $1
      ORDER BY t.name ASC
    `
    const tagsResult = await pool.query(tagsQuery, [reviewId])

    const review = {
      ...reviewResult.rows[0],
      score: parseFloat(reviewResult.rows[0].score),
      tags: tagsResult.rows
    }

    return NextResponse.json({
      success: true,
      review
    })

  } catch (error) {
    console.error('Error fetching review:', error)
    return NextResponse.json(
      { error: 'Failed to fetch review' },
      { status: 500 }
    )
  }
}

// PUT /api/reviews/[id] - Update a review
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const reviewId = parseInt(id)

    if (isNaN(reviewId)) {
      return NextResponse.json(
        { error: 'Invalid review ID' },
        { status: 400 }
      )
    }

    const { object, author, score, review_text, thumbnail } = await request.json()

    // Validation
    if (!object || !review_text) {
      return NextResponse.json(
        { error: 'Object and review text are required' },
        { status: 400 }
      )
    }

    if (score === undefined || score === null || score < 0 || score > 10) {
      return NextResponse.json(
        { error: 'Score must be between 0 and 10' },
        { status: 400 }
      )
    }

    // Update the review
    const updateQuery = `
      UPDATE reviews 
      SET object = $1, author = $2, score = $3, review_text = $4, thumbnail = $5
      WHERE id = $6
      RETURNING id, object, author, score, review_text, thumbnail, created_at
    `
    const result = await pool.query(updateQuery, [
      object.trim(),
      author?.trim() || null,
      score,
      review_text.trim(),
      thumbnail?.trim() || null,
      reviewId
    ])

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      review: {
        ...result.rows[0],
        score: parseFloat(result.rows[0].score)
      }
    })

  } catch (error) {
    console.error('Error updating review:', error)
    return NextResponse.json(
      { error: 'Failed to update review' },
      { status: 500 }
    )
  }
}

// DELETE /api/reviews/[id] - Delete a review
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const reviewId = parseInt(id)

    if (isNaN(reviewId)) {
      return NextResponse.json(
        { error: 'Invalid review ID' },
        { status: 400 }
      )
    }

    // Delete the review (tags will be deleted automatically due to CASCADE)
    const deleteQuery = 'DELETE FROM reviews WHERE id = $1 RETURNING id'
    const result = await pool.query(deleteQuery, [reviewId])

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Review deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting review:', error)
    return NextResponse.json(
      { error: 'Failed to delete review' },
      { status: 500 }
    )
  }
}
