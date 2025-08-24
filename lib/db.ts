import { Pool } from 'pg';

// Create a connection pool using Neon database URL from environment variables
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  // Don't specify SSL here when using connection string with sslmode parameter
  max: 20, // Maximum number of connections in the pool
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 10000, // Increased timeout for cloud connections
});

export default pool;
