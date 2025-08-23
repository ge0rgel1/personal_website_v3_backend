import { NextRequest, NextResponse } from 'next/server'
import pool from '../../../../../lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = parseInt(id);

    if (isNaN(projectId)) {
      return NextResponse.json(
        { error: 'Invalid project ID' },
        { status: 400 }
      )
    }

    // Get project with latest status
    const projectResult = await pool.query(`
      SELECT 
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
      WHERE p.id = $1
    `, [projectId])

    if (projectResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    const project = projectResult.rows[0]

    // Get project tags
    const tagsResult = await pool.query(`
      SELECT t.id, t.name, t.slug, t.description, t.background_color, t.text_color
      FROM tags t
      JOIN project_tag pt ON t.id = pt.tag_id
      WHERE pt.project_id = $1
      ORDER BY t.name
    `, [projectId])

    project.tags = tagsResult.rows

    // Get status history
    const statusHistoryResult = await pool.query(`
      SELECT 
        ps.id,
        ps.created_at,
        s.status,
        s.description
      FROM project_status ps
      JOIN statuses s ON ps.status_id = s.id
      WHERE ps.project_id = $1
      ORDER BY ps.created_at DESC
    `, [projectId])

    project.status_history = statusHistoryResult.rows

    return NextResponse.json({ project }, { status: 200 })

  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = parseInt(id);
    const body = await request.json()
    const { slug, title, year, description, github_url, live_demo_url, status, tags } = body

    if (isNaN(projectId)) {
      return NextResponse.json(
        { error: 'Invalid project ID' },
        { status: 400 }
      )
    }

    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')

      // Update project
      const projectResult = await client.query(`
        UPDATE projects 
        SET slug = $1, title = $2, year = $3, description = $4, 
            github_url = $5, live_demo_url = $6, updated_at = now()
        WHERE id = $7
        RETURNING *
      `, [slug, title, year, description, github_url, live_demo_url, projectId])

      if (projectResult.rows.length === 0) {
        await client.query('ROLLBACK')
        return NextResponse.json(
          { error: 'Project not found' },
          { status: 404 }
        )
      }

      const project = projectResult.rows[0]

      // Update status if provided
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

        // Add new project status entry
        await client.query(`
          INSERT INTO project_status (project_id, status_id)
          VALUES ($1, $2)
        `, [projectId, statusId])
      }

      // Update tags if provided
      if (tags && Array.isArray(tags)) {
        // Remove existing tags
        await client.query('DELETE FROM project_tag WHERE project_id = $1', [projectId])
        
        // Add new tags
        for (const tagId of tags) {
          await client.query(`
            INSERT INTO project_tag (project_id, tag_id)
            VALUES ($1, $2)
          `, [projectId, tagId])
        }
      }

      await client.query('COMMIT')

      return NextResponse.json({ project }, { status: 200 })

    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }

  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = parseInt(id);

    if (isNaN(projectId)) {
      return NextResponse.json(
        { error: 'Invalid project ID' },
        { status: 400 }
      )
    }

    const result = await pool.query(
      'DELETE FROM projects WHERE id = $1 RETURNING id',
      [projectId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ message: 'Project deleted successfully' }, { status: 200 })

  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    )
  }
}
