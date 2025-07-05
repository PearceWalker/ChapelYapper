import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import pg from 'pg';


// Top of your file
let cachedDb = null;
let cachedPool = null;

export async function getDbConnection() {
  if (cachedDb) return cachedDb;

  const isProd = process.env.NODE_ENV === 'production';
  // const isProd = true;


  if (isProd) {
    if (!cachedPool) {
      const { Pool } = pg;
      cachedPool = new Pool({
        connectionString: process.env.DATABASE_URL,
      });
    }

    cachedDb = {
      exec: (sql) => cachedPool.query(sql),
      run: (sql, params) => cachedPool.query(sql, params),
      all: (sql, params) => cachedPool.query(sql, params).then(res => res.rows),
      get: (sql, params) => cachedPool.query(sql, params).then(res => res.rows[0]),
      pool: cachedPool,
    };
  } else {
    cachedDb = await open({
      filename: './chap_yapper_stats.db',
      driver: sqlite3.Database,
    });
  }

  return cachedDb;
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
