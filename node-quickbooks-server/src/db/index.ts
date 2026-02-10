import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/quickbooks';

// For NeonDB, you might need specific connection options (like ssl: 'require')
const client = postgres(connectionString);

export const db = drizzle(client, { schema });
