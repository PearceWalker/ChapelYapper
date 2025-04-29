import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

export async function getDbConnection() {
  return open({
    filename: './chap_yapper_stats.db',
    driver: sqlite3.Database
  });
}

export async function initDb() {
  const db = await getDbConnection();

  await db.exec(`
    CREATE TABLE IF NOT EXISTS message_counts (
      username TEXT PRIMARY KEY,
      count INTEGER DEFAULT 0
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS room_joins (
      username TEXT PRIMARY KEY,
      count INTEGER DEFAULT 0
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS pulse_posts (
      id          TEXT PRIMARY KEY,
      message     TEXT,
      timestamp   INTEGER,
      votes       INTEGER DEFAULT 0,
      image_url   TEXT,
      replied_to  TEXT,
      email       TEXT
    );
  `);
  

  await db.exec(`
    CREATE TABLE IF NOT EXISTS pulse_comments (
      id          TEXT PRIMARY KEY,
      post_id     TEXT,
      parent_id   TEXT,
      message     TEXT,
      timestamp   INTEGER,
      votes       INTEGER DEFAULT 0,
      email       TEXT
    );
  `);

  await db.exec(`
   CREATE TABLE IF NOT EXISTS pulse_reports (
  id TEXT PRIMARY KEY,
  post_id TEXT,
  reporter_email TEXT,
  reason TEXT,
  timestamp INTEGER
    )

  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS pulse_commenters (
      post_id TEXT NOT NULL,
      commenter_email TEXT NOT NULL,
      commenter_index INTEGER NOT NULL,
      PRIMARY KEY (post_id, commenter_email)
    );
  `);
  
  


  return db;
}
