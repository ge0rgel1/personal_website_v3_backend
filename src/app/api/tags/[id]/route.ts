import { NextRequest, NextResponse } from 'next/server'
import pool from '../../../../../lib/db'

// GET /api/tags/[id] - Get a specific tag
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const tagId = parseInt(id)
    
    if (isNaN(tagId)) {
      return NextResponse.json(
        { error: 'Invalid tag ID' },
        { status: 400 }
      )
    }

    const result = await pool.query(
      'SELECT id, name, slug, description FROM tags WHERE id = $1',
      [tagId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Tag not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      tag: result.rows[0]
    })
  } catch (error) {
    console.error('Error fetching tag:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tag' },
      { status: 500 }
    )
  }
}

// PUT /api/tags/[id] - Update a tag
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tagId = parseInt(id, 10);

    if (isNaN(tagId)) {
      return NextResponse.json({ error: 'Invalid tag ID' }, { status: 400 });
    }

    const { name, description, background_color, text_color } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    
    // Basic color format validation
    const colorRegex = /^#([0-9a-f]{3}){1,2}$/i;
    if (!colorRegex.test(background_color) || !colorRegex.test(text_color)) {
        return NextResponse.json({ error: 'Invalid color format. Use hex colors like #RRGGBB.' }, { status: 400 });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const result = await pool.query(
      `UPDATE tags 
       SET name = $1, slug = $2, description = $3, background_color = $4, text_color = $5
       WHERE id = $6
       RETURNING *`,
      [name, slug, description, background_color, text_color, tagId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, tag: result.rows[0] });
  } catch (error) {
    // We can't reliably get the id if `await params` fails, so we log a generic error.
    console.error(`Error updating tag:`, error);
    return NextResponse.json(
      { error: `Failed to update tag.` },
      { status: 500 }
    );
  }
}

// DELETE /api/tags/[id] - Delete a tag
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const tagId = parseInt(id)
    
    if (isNaN(tagId)) {
      return NextResponse.json(
        { error: 'Invalid tag ID' },
        { status: 400 }
      )
    }

    // Check if tag is used by any posts
    const usageCheck = await pool.query(
      'SELECT COUNT(*) as count FROM post_tags WHERE tag_id = $1',
      [tagId]
    )

    if (parseInt(usageCheck.rows[0].count) > 0) {
      return NextResponse.json(
        { error: 'Cannot delete tag that is used by posts' },
        { status: 409 }
      )
    }

    // Delete the tag
    const result = await pool.query(
      'DELETE FROM tags WHERE id = $1 RETURNING id',
      [tagId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Tag not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Tag deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting tag:', error)
    return NextResponse.json(
      { error: 'Failed to delete tag' },
      { status: 500 }
    )
  }
}
