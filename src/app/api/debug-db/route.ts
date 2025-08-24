import { NextRequest, NextResponse } from 'next/server'
import pool from '../../../../lib/db'

export async function GET() {
  try {
    // Check existing posts
    const postsQuery = 'SELECT id, title FROM posts ORDER BY id'
    const postsResult = await pool.query(postsQuery)

    // Check foreign key constraints
    const constraintsQuery = `
      SELECT 
        tc.constraint_name, 
        tc.table_name, 
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name='collection_posts'
    `
    const constraintsResult = await pool.query(constraintsQuery)

    return NextResponse.json({
      posts: postsResult.rows,
      constraints: constraintsResult.rows
    })
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json(
      { error: 'Database error', details: error },
      { status: 500 }
    )
  }
}
