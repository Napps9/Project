import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(__dirname, '..', 'universa.db');

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS portfolio (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT DEFAULT 'My Portfolio',
    initial_cash REAL NOT NULL,
    current_cash REAL NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS positions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    portfolio_id INTEGER NOT NULL REFERENCES portfolio(id),
    type TEXT NOT NULL CHECK(type IN ('SPY', 'PUT')),
    quantity REAL NOT NULL,
    entry_price REAL NOT NULL,
    strike REAL,
    expiry TEXT,
    opened_at TEXT DEFAULT (datetime('now')),
    closed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    portfolio_id INTEGER NOT NULL REFERENCES portfolio(id),
    action TEXT NOT NULL,
    quantity REAL,
    price REAL,
    total REAL,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

export default db;
