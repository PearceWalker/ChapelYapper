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

  return db;
}
