import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_DB_PATH = path.join(__dirname, 'data', 'attendance.sqlite3');
const dbPath = process.env.ATTENDANCE_DB_PATH || DEFAULT_DB_PATH;
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS people (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    dept TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS holidays (
    date TEXT PRIMARY KEY,
    name TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS leaves (
    person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    code TEXT NOT NULL,
    PRIMARY KEY (person_id, date)
  );
`);

function getSetting(key, fallback) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  if (!row) return fallback;
  try { return JSON.parse(row.value); } catch { return row.value; }
}
function setSetting(key, value) {
  const json = JSON.stringify(value);
  db.prepare(`INSERT INTO settings (key, value) VALUES (?, ?)
              ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(key, json);
}

// Seed defaults on first run only — never overwrite an existing install.
const seedDefaults = {
  orgName: 'Tsalla Aerospace',
  accentColor: '#4f9cff',
  quotas: { sick: 12, casual: 12 },
  excelPath: path.join(os.homedir(), 'Tsalla', 'Attendance', 'Attendance.xlsx'),
  lanPort: 7700,
};
for (const [key, value] of Object.entries(seedDefaults)) {
  if (getSetting(key, undefined) === undefined) setSetting(key, value);
}
if (getSetting('passwordHash', undefined) === undefined) {
  setSetting('passwordHash', bcrypt.hashSync('tsalla', 10));
}
if (getSetting('sessionSecret', undefined) === undefined) {
  setSetting('sessionSecret', randomBytes(32).toString('hex'));
}

export { getSetting, setSetting };
