import { NextRequest, NextResponse } from 'next/server'
import pool from '../../../../../../lib/db'

// PUT /api/projects/[id]/tags - Update project tags
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const projectId = parseInt(id)
    const { tagIds } = await request.json()

    if (!Array.isArray(tagIds)) {
      return NextResponse.json(
        { error: 'tagIds must be an array' },
        { status: 400 }
      )
    }

    // Start transaction
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')

      // Remove all existing project-tag relationships for this project
      await client.query(
        'DELETE FROM project_tag WHERE project_id = $1',
        [projectId]
      )

      // Add new project-tag relationships
      if (tagIds.length > 0) {
        const values = tagIds.map((tagId, index) => `($1, $${index + 2})`).join(', ')
        const query = `INSERT INTO project_tag (project_id, tag_id) VALUES ${values}`
        await client.query(query, [projectId, ...tagIds])
      }

      await client.query('COMMIT')

      return NextResponse.json({
        success: true,
        message: 'Project tags updated successfully'
      })

    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }

  } catch (error) {
    console.error('Error updating project tags:', error)
    return NextResponse.json(
      { error: 'Failed to update project tags' },
      { status: 500 }
    )
  }
}

// GET /api/projects/[id]/tags - Get tags for a specific project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const projectId = parseInt(id)

    const result = await pool.query(`
      SELECT t.id, t.name, t.slug, t.description 
      FROM tags t
      JOIN project_tag pt ON t.id = pt.tag_id
      WHERE pt.project_id = $1
      ORDER BY t.name ASC
    `, [projectId])
    
    return NextResponse.json({
      success: true,
      tags: result.rows
    })
  } catch (error) {
    console.error('Error fetching project tags:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project tags' },
      { status: 500 }
    )
  }
}
