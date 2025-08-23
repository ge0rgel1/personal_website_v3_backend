import { NextRequest, NextResponse } from 'next/server'
import pool from '../../../../lib/db'

// Define the Project interface to match our database schema
interface Project {
  id: number
  slug: string
  title: string
  year: number | null
  description: string | null
  github_url: string | null
  live_demo_url: string | null
  created_at: string
  updated_at: string
  // Additional fields from joins
  status?: string
  status_description?: string
  tags?: Array<{
    id: number
    name: string
    slug: string
    description: string | null
    background_color: string | null
    text_color: string | null
  }>
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const year = searchParams.get('year')
    const tag = searchParams.get('tag')

    // Base query to get projects with their latest status
    let query = `
      SELECT DISTINCT
        p.id,
        p.slug,
        p.title,
        p.year,
        p.description,
        p.github_url,
        p.live_demo_url,
        p.created_at,
        p.updated_at,
        s.status,
        s.description as status_description
      FROM projects p
      LEFT JOIN LATERAL (
        SELECT ps.status_id, s.status, s.description
        FROM project_status ps
        JOIN statuses s ON ps.status_id = s.id
        WHERE ps.project_id = p.id
        ORDER BY ps.created_at DESC
        LIMIT 1
      ) s ON true
    `

    const queryParams: (string | number)[] = []
    const conditions: string[] = []

    // Add status filter
    if (status && status !== 'all') {
      conditions.push('s.status = $' + (queryParams.length + 1))
      queryParams.push(status)
    }

    // Add year filter
    if (year) {
      conditions.push('p.year = $' + (queryParams.length + 1))
      queryParams.push(parseInt(year))
    }

    // Add tag filter
    if (tag) {
      query += `
        JOIN project_tag pt ON p.id = pt.project_id
        JOIN tags t ON pt.tag_id = t.id
      `
      conditions.push('t.slug = $' + (queryParams.length + 1))
      queryParams.push(tag)
    }

    // Add WHERE clause if there are conditions
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ')
    }

    // Order by created_at DESC
    query += ' ORDER BY p.created_at DESC'

    const result = await pool.query(query, queryParams)
    const projects: Project[] = result.rows

    // Fetch tags for each project
    for (const project of projects) {
      const tagsResult = await pool.query(`
        SELECT t.id, t.name, t.slug, t.description, t.background_color, t.text_color
        FROM tags t
        JOIN project_tag pt ON t.id = pt.tag_id
        WHERE pt.project_id = $1
        ORDER BY t.name
      `, [project.id])
      
      project.tags = tagsResult.rows
    }

    return NextResponse.json({ projects }, { status: 200 })

  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { slug, title, year, description, github_url, live_demo_url, status, tags } = body

    // Validate required fields
    if (!slug || !title) {
      return NextResponse.json(
        { error: 'Slug and title are required' },
        { status: 400 }
      )
    }

    // Start transaction
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')

      // Insert project
      const projectResult = await client.query(`
        INSERT INTO projects (slug, title, year, description, github_url, live_demo_url)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [slug, title, year, description, github_url, live_demo_url])

      const project = projectResult.rows[0]

      // Add status if provided
      if (status) {
        // Get or create status
        let statusResult = await client.query(
          'SELECT id FROM statuses WHERE status = $1',
          [status]
        )
        
        if (statusResult.rows.length === 0) {
          statusResult = await client.query(`
            INSERT INTO statuses (status)
            VALUES ($1)
            RETURNING id
          `, [status])
        }

        const statusId = statusResult.rows[0].id

        // Add project status
        await client.query(`
          INSERT INTO project_status (project_id, status_id)
          VALUES ($1, $2)
        `, [project.id, statusId])
      }

      // Add tags if provided
      if (tags && Array.isArray(tags)) {
        for (const tagId of tags) {
          await client.query(`
            INSERT INTO project_tag (project_id, tag_id)
            VALUES ($1, $2)
            ON CONFLICT (project_id, tag_id) DO NOTHING
          `, [project.id, tagId])
        }
      }

      await client.query('COMMIT')

      return NextResponse.json({ project }, { status: 201 })

    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }

  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    )
  }
}
