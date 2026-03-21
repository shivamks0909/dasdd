import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

let databaseUrl = process.env.DATABASE_URL;
if (databaseUrl?.startsWith("postgres://")) {
  databaseUrl = databaseUrl.replace("postgres://", "postgresql://");
}

if (!databaseUrl) {
  console.warn("DATABASE_URL must be set. Database operations will fail.");
} else {
  console.log("DATABASE_URL Protocol Check:", databaseUrl.slice(0, 15) + "...");
}

export const pool = new pg.Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl?.includes('sslmode=require') || !databaseUrl?.includes('localhost') 
    ? { rejectUnauthorized: false } 
    : false,
  // Reduce pool size for serverless functions to avoid exhausting Supabase connections
  max: process.env.NODE_ENV === "production" ? 10 : 2, 
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
});


export const db = drizzle(pool, { schema });
