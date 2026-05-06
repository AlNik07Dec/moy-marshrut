import * as SQLite from 'expo-sqlite';

export interface WalkSession {
  id: number;
  date: number; // Unix timestamp ms
  mode: string; // 'fast' | 'slow' | 'parkGame'
  distanceMeters: number;
  durationSeconds: number;
  stepCount: number;
  routeCoordinates: string; // JSON string of Coordinate[]
  startLat: number | null;
  startLng: number | null;
  endLat: number | null;
  endLng: number | null;
}

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('walkandpaw.db');
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS walk_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date INTEGER NOT NULL,
      mode TEXT NOT NULL,
      distanceMeters REAL NOT NULL DEFAULT 0,
      durationSeconds INTEGER NOT NULL DEFAULT 0,
      stepCount INTEGER NOT NULL DEFAULT 0,
      routeCoordinates TEXT NOT NULL DEFAULT '[]',
      startLat REAL,
      startLng REAL,
      endLat REAL,
      endLng REAL
    );
  `);
  // Migration: add stepCount column if it doesn't exist yet
  try {
    await db.execAsync(`ALTER TABLE walk_sessions ADD COLUMN stepCount INTEGER NOT NULL DEFAULT 0;`);
  } catch {
    // Column already exists — safe to ignore
  }
  return db;
}

export async function insertSession(
  session: Omit<WalkSession, 'id'>
): Promise<number> {
  const database = await getDatabase();
  const result = await database.runAsync(
    `INSERT INTO walk_sessions
      (date, mode, distanceMeters, durationSeconds, stepCount, routeCoordinates, startLat, startLng, endLat, endLng)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      session.date,
      session.mode,
      session.distanceMeters,
      session.durationSeconds,
      session.stepCount,
      session.routeCoordinates,
      session.startLat,
      session.startLng,
      session.endLat,
      session.endLng,
    ]
  );
  return result.lastInsertRowId;
}

export async function fetchSessions(): Promise<WalkSession[]> {
  const database = await getDatabase();
  return database.getAllAsync<WalkSession>(
    'SELECT * FROM walk_sessions ORDER BY date DESC'
  );
}
