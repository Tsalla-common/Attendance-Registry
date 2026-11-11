import express from 'express';
import session from 'express-session';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getSetting } from './db.js';
import { requireAuth, login, logout, me, changePassword } from './auth.js';
import peopleRouter from './routes/people.js';
import leavesRouter from './routes/leaves.js';
import holidaysRouter from './routes/holidays.js';
import settingsRouter from './routes/settings.js';
import reportRouter from './routes/report.js';
import { syncExcelNow } from './excelSync.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();
  app.use(express.json());
  app.use(session({
    secret: getSetting('sessionSecret'),
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 12 },
  }));

  app.get('/api/health', (req, res) => res.json({ ok: true }));

  app.post('/api/auth/login', login);
  app.post('/api/auth/logout', logout);
  app.get('/api/auth/me', me);
  app.post('/api/auth/password', requireAuth, changePassword);

  app.use('/api/people', requireAuth, peopleRouter);
  app.use('/api/leaves', requireAuth, leavesRouter);
  app.use('/api/holidays', requireAuth, holidaysRouter);
  app.use('/api/settings', requireAuth, settingsRouter);
  app.use('/api/report', requireAuth, reportRouter);

  // In production the client is pre-built into client/dist and served as static files
  // so the whole app — including LAN clients — is a single origin with no CORS needed.
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get(/^(?!\/api).*/, (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
  }

  return app;
}

export function startServer() {
  const app = createApp();
  const port = getSetting('lanPort') || 7700;
  syncExcelNow().catch((err) => console.error('[excel] initial sync failed:', err.message));
  return app.listen(port, '0.0.0.0', () => {
    console.log(`Tsalla Attendance Console listening on http://0.0.0.0:${port}`);
  });
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) startServer();
