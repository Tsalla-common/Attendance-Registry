# Tsalla Attendance Console — Run It Locally

Complete, self-contained guide to running the Attendance Console on your own PC,
plus all the project context (architecture, data model, rules, troubleshooting).
If you hand this file to Claude Code locally, it has enough context to continue
development without anything else.

> **State of this repo (11 Nov 2026):** the original source zip was lost, so
> `app/` was recovered from the packaged Windows app. That means:
> - `app/client/dist` is the **compiled** UI — there is no React source
>   (`client/src`), so `npm run dev`, `npm run build`, `npm run dev:electron`
>   and `npm run package:win` (sections 2d and 6) **do not exist here**.
> - What works: `cd app`, `npm install`, `npm start` → <http://localhost:7700>.
>   Server, Electron shell and `shared/` logic are real, editable source.
> - `better-sqlite3` was bumped 11 → 12 so it installs on Node 24 without a compiler.
> - `npm start` uses its own empty database (`app\server\data\`), wants port
>   7700 (close the desktop app first) and rewrites the Excel workbook at the
>   default path. To run against your real data instead, close the desktop app and:
>   `set ATTENDANCE_DB_PATH=%APPDATA%\Tsalla Attendance Console\data\attendance.sqlite3`

---

## Contents

- [0. Which files do you have?](#0-which-files-do-you-have)
- [1. Fastest path — just run the Windows app](#1-fastest-path--just-run-the-windows-app)
- [2. Run from source (for development)](#2-run-from-source-for-development)
- [3. Logging in](#3-logging-in)
- [4. Sharing it over your office network (LAN)](#4-sharing-it-over-your-office-network-lan)
- [5. Where your data is stored](#5-where-your-data-is-stored)
- [6. Rebuild the Windows .exe](#6-rebuild-the-windows-exe)
- [7. Forgot the password](#7-forgot-the-password)
- [8. Push the code to GitHub](#8-push-the-code-to-github)
- [9. Troubleshooting](#9-troubleshooting)
- [10. Project context (architecture & rules)](#10-project-context-architecture--rules)
- [11. Leave year](#11-leave-year)

---

## 0. Which files do you have?

| File you downloaded | What it is | Use it for |
|---|---|---|
| `Attendance-Registry-project.zip` (~800 KB) | The **source code** | Development, rebuilding, pushing to GitHub → [Section 2](#2-run-from-source-for-development) |
| `AttendanceApp-Windows.zip.part00…part06` | The **ready-to-run Windows app**, split into parts | Just using the tool → [Section 1](#1-fastest-path--just-run-the-windows-app) |

You don't need both. If you only want to *use* the tool, Section 1 is enough.

---

## 1. Fastest path — just run the Windows app

**No Node.js, no installation, no internet.**

### 1a. If you still have the 7 split parts

Put all 7 in one folder, open Command Prompt there (type `cmd` in the Explorer
address bar), and join them:

```bat
copy /b AttendanceApp-Windows.zip.part* AttendanceApp-Windows.zip
```

Then right-click the resulting `AttendanceApp-Windows.zip` → **Extract All**.

> Verify it joined correctly (optional). This should print the matching hash:
> ```bat
> certutil -hashfile AttendanceApp-Windows.zip SHA256
> ```
> Expected: `ab6cd29b59927404798616c430d7670377d8ebf031eb5b8f165a362c45ef5b1d`

### 1b. Run it

Open the extracted folder `Tsalla Attendance Console-win32-x64` and double-click:

```
Tsalla Attendance Console.exe
```

Windows SmartScreen will warn (the app isn't code-signed) → **More info** →
**Run anyway**. This is expected and only happens the first time.

> Keep the whole folder together — the `.exe` needs the files beside it.

---

## 2. Run from source (for development)

Use this if you want to change the code, or rebuild the Windows app.

### 2a. Install Node.js (one time)

Download the **LTS** version from <https://nodejs.org> and install it (accept the
defaults). Then confirm in a **new** Command Prompt:

```bat
node -v
npm -v
```

You need **Node 18 or newer** (v20 or v22 LTS is ideal).

### 2b. Unzip the source

Extract `Attendance-Registry-project.zip`. You'll get a folder
`Attendance-Registry` containing `app/`, `project/`, `chats/`, `docs/`.

### 2c. Install dependencies (one time, needs internet)

```bat
cd "path\to\Attendance-Registry\app"
npm install
```

This downloads the libraries into `node_modules` (a few hundred MB). This is the
**only** step that needs internet — the app itself never goes online.

### 2d. Run it

```bat
npm run dev
```
Then open <http://127.0.0.1:5173> in your browser.

Or launch the full desktop app:
```bat
npm run dev:electron
```

**Production mode** (one process, serves the built UI, this is what LAN users hit):
```bat
npm run build
npm start
```
Then open <http://localhost:7700>.

Stop any of these with `Ctrl + C` in the terminal.

---

## 3. Logging in

Default password: **`tsalla`**

Change it immediately in **Settings → Security**. There is one shared password
for everyone (including LAN users) — that was the original requirement.

---

## 4. Sharing it over your office network (LAN)

The server listens on all network interfaces at port **7700**, so another PC on
the same network can use it through a normal browser — still with **no internet**.

1. Run the app on the "host" PC (the desktop app, or `npm start`).
2. On that PC go to **Settings → LAN access** and copy the address shown, e.g.
   `http://192.168.1.50:7700`.
3. On the second PC, open that address in any browser and log in with the same
   password.

**If it won't connect:** allow the app through Windows Firewall on the host PC
(choose **Private networks**), or manually allow inbound TCP port **7700**. Both
PCs must be on the same network, and the host PC must stay running.

---

## 5. Where your data is stored

| What | Where |
|---|---|
| **Database** (the real data) | `%APPDATA%\Tsalla Attendance Console\data\attendance.sqlite3` |
| **Excel workbook** | Path set in **Settings → Workbook storage**<br>(default `C:\Users\<you>\Tsalla\Attendance\Attendance.xlsx`) |
| Database when run from source | `app\server\data\attendance.sqlite3` |

Paste `%APPDATA%\Tsalla Attendance Console\data` into the Explorer address bar to
open the data folder.

**Important:** the SQLite database is the source of truth. The Excel workbook is
a **mirror** the app rewrites after every change (one sheet per month, plus Team
and Holidays sheets). Editing the `.xlsx` by hand does **not** feed data back in
— your edits will be overwritten.

**Backup** = close the app and copy `attendance.sqlite3` somewhere safe.

---

## 6. Rebuild the Windows .exe

From the source folder (after `npm install`):

```bat
cd app
npm run package:win
```

Output lands in `Releases\`:
- `Tsalla Attendance Console-win32-x64\` — the runnable app
- `Attendance-Console-Windows-x64-v1.0.0.zip` — zipped for sharing

The script builds the UI, assembles a production-only copy, fetches the correct
**Windows + Electron** build of the native `better-sqlite3` module, and packages
it. It needs internet (to download the Electron and sqlite binaries).

---

## 7. Forgot the password

It **cannot be recovered** — only a one-way bcrypt hash is stored, never the
text. Reset it instead:

**Keep your data** — put `reset-password.mjs` in the app's `resources\app\`
folder, open Command Prompt in the folder containing the `.exe`, and run:

```bat
set ELECTRON_RUN_AS_NODE=1
"Tsalla Attendance Console.exe" resources\app\reset-password.mjs MyNewPassword
```

**Or start fresh (deletes everything)** — close the app, delete
`%APPDATA%\Tsalla Attendance Console\data\attendance.sqlite3`, reopen. Password
returns to `tsalla`.

See `PASSWORD-RESET-GUIDE.md` for the full version with troubleshooting.

---

## 8. Push the code to GitHub

Repo: <https://github.com/Tsalla-common/Attendance-Registry> (currently empty —
it only has a README; the code was never pushed).

From the unzipped `Attendance-Registry` folder on your PC:

```bat
git init
git add -A
git commit -m "Implement Tsalla Attendance Console"
git branch -M main
git remote add origin https://github.com/Tsalla-common/Attendance-Registry.git
git push -u origin main
```

If it refuses because the repo already has a commit (the README):
```bat
git pull origin main --allow-unrelated-histories
git push -u origin main
```

`node_modules/` and `Releases/` are excluded automatically by `.gitignore` —
don't commit the 100+ MB build. Share the built app as a **GitHub Release**
instead (repo → Releases → Draft a new release → attach the zip).

> **Do this.** Right now the code exists only on your PC. Pushing it means a lost
> laptop or a wiped folder doesn't lose the project.

---

## 9. Troubleshooting

**`'node' is not recognized`** — Node.js isn't installed, or you didn't open a
*new* Command Prompt after installing. Close and reopen the terminal.

**`npm install` fails compiling `better-sqlite3`** — it normally downloads a
prebuilt binary and compiles nothing. If it tries to compile, you're likely on an
unusual Node version; install the current **LTS** from nodejs.org. As a fallback,
install the C++ build tools:
`npm install --global windows-build-tools` (run as Administrator).

**Port 7700 already in use** — another copy is running. Close it, or change the
port in **Settings**. Find the culprit with `netstat -ano | findstr :7700`.

**Blank window / white screen in dev** — the UI dev server wasn't ready yet. Stop
with `Ctrl+C` and re-run `npm run dev`.

**SmartScreen blocks the .exe** — expected (unsigned app). **More info** → **Run
anyway**.

**LAN PC can't connect** — Windows Firewall on the host; allow the app on
**Private networks**, or open TCP 7700. Confirm both machines are on the same
subnet.

**"database is locked"** — two copies of the app are running. Close all of them
(check Task Manager).

---

## 10. Project context (architecture & rules)

### What it is
An offline-first internal tool for attendance, leave and holidays. An Electron
desktop app that also runs an HTTP server on the LAN so others can use it in a
browser. **It never connects to the internet.**

### Stack
Electron · Express · better-sqlite3 · exceljs · bcryptjs · React 18 + Vite ·
self-hosted fonts (Space Grotesk, IBM Plex Sans/Mono). npm workspaces monorepo.

### Layout
```
app/
├── electron/     main.cjs (boots server + window), preload.cjs
├── server/       index.js, db.js, auth.js, excelSync.js, routes/
├── client/       React UI (src/views, src/components, src/styles)
└── shared/       leaveCodes.js, calc.js  ← pure logic used by BOTH sides
```
`shared/` is the single source of truth for leave math, imported by the server
(over DB rows) and the browser (over fetched data), so they can't disagree.

### Database (SQLite)
```sql
settings (key PRIMARY KEY, value)        -- JSON-encoded values
people   (id PK, name, dept, role, created_at)
holidays (date PK, name)                 -- 'YYYY-MM-DD'
leaves   (person_id, date, code, PRIMARY KEY (person_id, date))
```

### Leave codes
| Code | Meaning | Counts as |
|---|---|---|
| `SF` | Sick — full day | 1.0 sick |
| `SH` | Sick — half day | 0.5 sick |
| `CF` | Casual — full day | 1.0 casual |
| `CH` | Casual — half day | 0.5 casual |
| `HW` | Worked on a holiday | **+1 comp-off** (only allowed on an official holiday) |

### Rules
- Work week **Mon–Sat**; **Sunday** is weekly-off.
- Working an official holiday earns a **comp-off** (bonus leave day).
- Working days in a month = days − Sundays − official holidays.
- `present = workingDays − sick − casual`.
- Default quotas: **12 sick, 12 casual** (editable in Settings).
- Dates displayed DD/MM/YYYY (India).

### API (all under `/api`, session-cookie auth)
`auth/login`, `auth/logout`, `auth/me`, `auth/password` ·
`people` (GET/POST/DELETE) · `leaves` (GET, PUT `/:personId/:date`) ·
`holidays` (GET, PUT/DELETE `/:date`) · `settings` (GET/PUT) ·
`report?year=&month=&scope=&personId=`

Every change triggers a debounced (~600 ms) atomic rewrite of the Excel workbook.

### Reports
PDF is produced via the browser's print dialog (**Save as PDF**), styled with
`@media print` rules. Org-wide or per-person, for the selected month.

---

## 11. Leave year

Balances (Sick bal / Casual bal / Comp) count only the current **leave year,
1 April – 31 March**, and reset every 1 April. Reports and the roster show the
balance for the leave year of the month being viewed.

- Nothing carries forward; unused days and comp-offs lapse at year-end.
- Everyone gets the full quota (no pro-rating for mid-year joiners).
- **Month-wise sick leave** (Settings → Leave entitlements checkbox, off by
  default): each month allows the yearly sick figure ÷ 12, counted against that
  month only, so unused sick leave does not carry over to the next month.
  Casual leave stays yearly. Stored as `quotas.sickMonthly`.
- To use a calendar year, change `LEAVE_YEAR_START_MONTH` in `app/shared/calc.js`
  **and** the matching `b>=4` in the compiled UI bundle (`function Hl`).
- Tests: `cd app` then `npm test`.

---

*Built from the Claude Design prototype `project/Attendance Console.dc.html`.
The original requirements conversation is in `chats/`.*
