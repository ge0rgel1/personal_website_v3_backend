import { NextResponse } from 'next/server'
import pool from '../../../../lib/db'

export async function GET() {
  try {
    // Test basic database connection
    const result = await pool.query('SELECT NOW() as current_time')
    
    // Test if projects table exists and get count
    const projectsResult = await pool.query('SELECT COUNT(*) as count FROM projects')
    
    return NextResponse.json({ 
      success: true,
      database_time: result.rows[0].current_time,
      projects_count: projectsResult.rows[0].count 
    })
  } catch (error) {
    console.error('Database connection error:', error)
    return NextResponse.json(
      { 
        error: 'Database connection failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
