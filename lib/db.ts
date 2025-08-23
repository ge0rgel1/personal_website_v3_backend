import { Pool } from 'pg';

// Create a connection pool using Neon database
const pool = new Pool({
  host: 'ep-green-credit-ads0h4ly-pooler.c-2.us-east-1.aws.neon.tech',
  port: 5432,
  user: 'neondb_owner',
  password: 'npg_3IuaBKM6OqxP',
  database: 'neondb',
  ssl: { rejectUnauthorized: false }, // Required for Neon
  max: 20, // Maximum number of connections in the pool
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 2000, // Return error after 2 seconds if connection could not be established
});

export default pool;
