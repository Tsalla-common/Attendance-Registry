// Electron main process. Boots the embedded Express server (bound to 0.0.0.0 so
// other LAN devices can reach the console in a browser) and opens a desktop
// window pointing at it. In dev the window loads the Vite dev server; in
// production Express serves the pre-built client, so the window loads the
// server's own origin.
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

// Persist the SQLite database inside Electron's per-user data directory so it
// survives app updates and lives outside the app bundle. Must be set before the
// server module (which opens the DB at import time) is loaded.
const userDataDir = app.getPath('userData');
const dataDir = path.join(userDataDir, 'data');
fs.mkdirSync(dataDir, { recursive: true });
process.env.ATTENDANCE_DB_PATH = path.join(dataDir, 'attendance.sqlite3');

let mainWindow = null;
let serverHandle = null;

async function boot() {
  const startUrl = process.env.ELECTRON_START_URL; // set in dev by the npm script
  let url = startUrl;

  if (!startUrl) {
    // Production: start the bundled server and load its origin.
    const serverEntry = path.join(__dirname, '..', 'server', 'index.js');
    const { startServer } = await import(pathToFileURL(serverEntry));
    const { getSetting } = await import(pathToFileURL(path.join(__dirname, '..', 'server', 'db.js')));
    serverHandle = startServer();
    const port = getSetting('lanPort') || 7700;
    url = `http://localhost:${port}`;
  }

  mainWindow = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: '#0a0b0e',
    title: 'Tsalla Attendance Console',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Open external links (if any) in the system browser, never inside the app.
  mainWindow.webContents.setWindowOpenHandler(({ url: target }) => {
    shell.openExternal(target);
    return { action: 'deny' };
  });

  mainWindow.loadURL(url);
  mainWindow.on('closed', () => { mainWindow = null; });
}

function pathToFileURL(p) {
  return require('node:url').pathToFileURL(p).href;
}

// Native "Browse…" for the Excel workbook location.
ipcMain.handle('pick-excel-path', async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Choose workbook location',
    defaultPath: 'Attendance.xlsx',
    filters: [{ name: 'Excel Workbook', extensions: ['xlsx'] }],
  });
  return result.canceled ? null : result.filePath;
});

app.whenReady().then(boot);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) boot();
});

app.on('before-quit', () => {
  if (serverHandle) { try { serverHandle.close(); } catch { /* noop */ } }
});
