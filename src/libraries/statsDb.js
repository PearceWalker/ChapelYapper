import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import pg from 'pg';

const isProd = process.env.NODE_ENV === 'production';

export async function getDbConnection() {
  if (isProd) {
    const { Pool } = pg;

    console.log("🔍 NODE_ENV:", process.env.NODE_ENV);
    console.log("🔍 Connecting to PostgreSQL:", process.env.DATABASE_URL);

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: true, // More compatible than { rejectUnauthorized: false }
    });

    try {
      await pool.query("SELECT 1");
      console.log("✅ PostgreSQL connection successful");
    } catch (err) {
      console.error("❌ PostgreSQL connection failed:", err);
      throw err;
    }

    return {
      exec: (sql) => pool.query(sql),
      run: (sql, params) => pool.query(sql, params),
      all: (sql, params) => pool.query(sql, params).then(res => res.rows),
      get: (sql, params) => pool.query(sql, params).then(res => res.rows[0]),
      pool,
    };
  } else {
    const db = await open({
      filename: './chap_yapper_stats.db',
      driver: sqlite3.Database,
    });

    return {
      exec: (sql) => db.exec(sql),
      run: (sql, params) => db.run(sql, params),
      all: (sql, params) => db.all(sql, params),
      get: (sql, params) => db.get(sql, params),
      db,
    };
  }
}

export async function initDb() {
  const db = await getDbConnection();

  const statements = [
    `CREATE TABLE IF NOT EXISTS message_counts (
      username TEXT PRIMARY KEY,
      count INTEGER DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS room_joins (
      username TEXT PRIMARY KEY,
      count INTEGER DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS post_counter (
      email TEXT PRIMARY KEY,
      count INTEGER DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS pulse_posts (
      id TEXT PRIMARY KEY,
      message TEXT,
      timestamp BIGINT,
      votes INTEGER DEFAULT 0,
      image_url TEXT,
      replied_to TEXT,
      email TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS pulse_comments (
      id TEXT PRIMARY KEY,
      post_id TEXT,
      parent_id TEXT,
      message TEXT,
      timestamp BIGINT,
      votes INTEGER DEFAULT 0,
      email TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS pulse_reports (
      id TEXT PRIMARY KEY,
      post_id TEXT,
      reporter_email TEXT,
      reason TEXT,
      timestamp BIGINT
    )`,
    `CREATE TABLE IF NOT EXISTS pulse_commenters (
      post_id TEXT NOT NULL,
      commenter_email TEXT NOT NULL,
      commenter_index INTEGER NOT NULL,
      PRIMARY KEY (post_id, commenter_email)
    )`,
  ];

  for (const stmt of statements) {
    await db.exec(stmt);
  }

  return db;
}
