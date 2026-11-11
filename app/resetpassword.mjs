// Reset the Tsalla Attendance Console password WITHOUT losing any data.
//
// Your people, leave records, holidays and settings are all kept — this only
// replaces the stored password hash. (The old password cannot be recovered:
// it is stored as a one-way bcrypt hash, never as text.)
//
// HOW TO RUN (Windows, no Node.js install needed):
//   1. Put this file inside the packaged app's "resources\app" folder, i.e.
//        Tsalla Attendance Console-win32-x64\resources\app\reset-password.mjs
//   2. Open Command Prompt in the folder that contains the .exe:
//        Tsalla Attendance Console-win32-x64
//   3. Run these two lines:
//        set ELECTRON_RUN_AS_NODE=1
//        "Tsalla Attendance Console.exe" resources\app\reset-password.mjs MyNewPassword
//
//   Replace MyNewPassword with whatever you want. If you leave it out, the
//   password becomes: tsalla
//
// Then close the app completely and start it again, and log in with the new
// password. Change it afterwards in Settings -> Security if you like.

import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const newPassword = process.argv[2] || 'tsalla';

// Find the database the packaged app uses (Electron's per-user data folder).
const candidates = [];
if (process.platform === 'win32' && process.env.APPDATA) {
  candidates.push(path.join(process.env.APPDATA, 'Tsalla Attendance Console', 'data', 'attendance.sqlite3'));
} else if (process.platform === 'darwin') {
  candidates.push(path.join(os.homedir(), 'Library', 'Application Support', 'Tsalla Attendance Console', 'data', 'attendance.sqlite3'));
} else {
  candidates.push(path.join(os.homedir(), '.config', 'Tsalla Attendance Console', 'data', 'attendance.sqlite3'));
}
// Also allow an explicit path: ... reset-password.mjs MyNewPassword "C:\path\to\attendance.sqlite3"
if (process.argv[3]) candidates.unshift(process.argv[3]);

const dbPath = candidates.find((p) => fs.existsSync(p));

if (!dbPath) {
  console.error('\nCould not find the database. Looked in:');
  for (const c of candidates) console.error('  ' + c);
  console.error('\nIf it lives elsewhere, pass the full path as a second argument:');
  console.error('  "Tsalla Attendance Console.exe" resources\\app\\reset-password.mjs MyNewPassword "C:\\full\\path\\attendance.sqlite3"\n');
  process.exit(1);
}

console.log('Using database: ' + dbPath);

const db = new Database(dbPath);

// Sanity check: make sure this really is the app's database before writing.
const hasSettings = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='settings'").get();
if (!hasSettings) {
  console.error('That file does not look like the Attendance Console database (no settings table). Aborting; nothing was changed.');
  process.exit(1);
}

const people = db.prepare('SELECT COUNT(*) AS n FROM people').get().n;
const leaves = db.prepare('SELECT COUNT(*) AS n FROM leaves').get().n;

// settings values are JSON-encoded (see server/db.js), so the hash is stored as JSON.
const hash = bcrypt.hashSync(newPassword, 10);
db.prepare(
  `INSERT INTO settings (key, value) VALUES ('passwordHash', ?)
   ON CONFLICT(key) DO UPDATE SET value = excluded.value`
).run(JSON.stringify(hash));
db.close();

console.log('');
console.log('  Password reset successfully.');
console.log('  New password: ' + newPassword);
console.log('  Your data is intact: ' + people + ' people, ' + leaves + ' leave records.');
console.log('');
console.log('  Now fully close the app and reopen it, then log in.');
