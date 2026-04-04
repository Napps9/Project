import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(__dirname, '..', 'food-scoring.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initTables();
  }
  return db;
}

function initTables(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      is_drink INTEGER NOT NULL DEFAULT 0,
      energy_kj REAL NOT NULL,
      saturated_fat_g REAL NOT NULL,
      total_sugar_g REAL NOT NULL,
      sodium_mg REAL NOT NULL,
      fibre_aoac_g REAL NOT NULL DEFAULT 0,
      protein_g REAL NOT NULL,
      fvn_percentage REAL NOT NULL DEFAULT 0,
      npm_score INTEGER,
      is_hfss INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      proportion REAL NOT NULL,
      is_fvn INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}
