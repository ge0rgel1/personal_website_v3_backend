import { NextResponse } from 'next/server'
import pool from '../../../../lib/db'

export async function GET() {
  try {
    const client = await pool.connect()
    
    // Get counts for all content types
    const queries = [
      'SELECT COUNT(*) as count FROM posts',
      'SELECT COUNT(*) as count FROM projects',
      'SELECT COUNT(*) as count FROM reviews',
      'SELECT COUNT(*) as count FROM friends',
      'SELECT COUNT(*) as count FROM collections'
    ]
    
    const results = await Promise.all(
      queries.map(query => client.query(query))
    )
    
    client.release()
    
    const stats = {
      postsCount: parseInt(results[0].rows[0].count),
      projectsCount: parseInt(results[1].rows[0].count),
      reviewsCount: parseInt(results[2].rows[0].count),
      friendsCount: parseInt(results[3].rows[0].count),
      collectionsCount: parseInt(results[4].rows[0].count)
    }
    
    return NextResponse.json({
      stats
    })
    
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}
