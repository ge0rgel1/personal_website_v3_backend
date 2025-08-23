import { NextRequest, NextResponse } from 'next/server'
import pool from '../../../../lib/db'

interface Tag {
  id: number;
  name: string;
  background_color: string;
  text_color: string;
}

interface TagRow {
  collection_id: number;
  tags: Tag[];
}

interface CollectionRow {
  id: number;
  slug: string;
  title: string;
  description: string;
  cover_image_url: string;
  is_public: boolean;
  created_at: Date;
  updated_at: Date;
  post_count: string; // COUNT returns a string
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Get total count for pagination
    const countQuery = 'SELECT COUNT(*) as total FROM collections';
    const countResult = await pool.query(countQuery);
    const totalCollections = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalCollections / limit);

    // First query: Get collections with post counts (with pagination)
    const collectionsQuery = `
      SELECT 
        c.id,
        c.slug,
        c.title,
        c.description,
        c.cover_image_url,
        c.is_public,
        c.created_at,
        c.updated_at,
        COUNT(DISTINCT cp.post_id) as post_count
      FROM collections c
      LEFT JOIN collection_posts cp ON c.id = cp.collection_id
      GROUP BY c.id, c.slug, c.title, c.description, c.cover_image_url, c.is_public, c.created_at, c.updated_at
      ORDER BY c.created_at DESC
      LIMIT $1 OFFSET $2
    `
    
    // Second query: Get tags for current page collections only
    const tagsQuery = `
      SELECT 
        ct.collection_id,
        json_agg(json_build_object(
          'id', t.id,
          'name', t.name,
          'background_color', t.background_color,
          'text_color', t.text_color
        ) ORDER BY t.name) as tags
      FROM collection_tags ct
      JOIN tags t ON ct.tag_id = t.id
      WHERE ct.collection_id IN (
        SELECT c.id FROM collections c
        ORDER BY c.created_at DESC
        LIMIT $1 OFFSET $2
      )
      GROUP BY ct.collection_id
    `
    
    const [collectionsResult, tagsResult] = await Promise.all([
      pool.query(collectionsQuery, [limit, offset]),
      pool.query(tagsQuery, [limit, offset])
    ])
    
    // Create a map of collection_id -> tags
    const tagsMap = new Map<number, Tag[]>()
    tagsResult.rows.forEach((row: TagRow) => {
      tagsMap.set(row.collection_id, row.tags || [])
    })
    
    const collections = collectionsResult.rows.map((row: CollectionRow) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      cover_image_url: row.cover_image_url,
      is_public: row.is_public,
      post_count: parseInt(row.post_count) || 0,
      tags: tagsMap.get(row.id) || [],
      created_at: row.created_at,
      updated_at: row.updated_at
    }))
    
    return NextResponse.json({
      success: true,
      data: collections,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalCollections,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    })
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch collections' 
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, slug, description, cover_image_url, is_public = true } = body;

    if (!title) {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400 }
      );
    }

    // Generate a random slug if not provided
    let finalSlug = slug;
    if (!finalSlug) {
      finalSlug = Math.random().toString(36).substring(2, 15);
    }

    // Ensure slug is unique
    const existingCollection = await pool.query(
      'SELECT id FROM collections WHERE slug = $1',
      [finalSlug]
    );

    if (existingCollection.rows.length > 0) {
      // If slug exists, append a random number
      finalSlug = `${finalSlug}-${Math.random().toString(36).substring(2, 8)}`;
    }

    // Create the collection
    const result = await pool.query(
      `INSERT INTO collections (title, slug, description, cover_image_url, is_public)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [title, finalSlug, description || null, cover_image_url || null, is_public]
    );

    const newCollection = result.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        id: newCollection.id,
        slug: newCollection.slug,
        title: newCollection.title,
        description: newCollection.description,
        cover_image_url: newCollection.cover_image_url,
        is_public: newCollection.is_public,
        post_count: 0,
        tags: [],
        created_at: newCollection.created_at,
        updated_at: newCollection.updated_at
      }
    });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create collection' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Collection ID is required' },
        { status: 400 }
      );
    }

    // Delete the collection (this will cascade to collection_posts and collection_tags)
    const result = await pool.query(
      'DELETE FROM collections WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Collection not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Collection deleted successfully'
    });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete collection' },
      { status: 500 }
    );
  }
}
