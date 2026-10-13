import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export async function testDatabaseConnection() {
  const result = await pool.query('SELECT NOW()');
  console.log('PostgreSQL connected:', result.rows[0]);
}