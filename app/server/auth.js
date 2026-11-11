import bcrypt from 'bcryptjs';
import { getSetting, setSetting } from './db.js';

export function requireAuth(req, res, next) {
  if (req.session && req.session.authed) return next();
  return res.status(401).json({ error: 'Not authenticated' });
}

export function login(req, res) {
  const { password } = req.body || {};
  const hash = getSetting('passwordHash');
  if (typeof password !== 'string' || !hash || !bcrypt.compareSync(password, hash)) {
    return res.status(401).json({ error: 'Incorrect password' });
  }
  req.session.authed = true;
  res.json({ ok: true });
}

export function logout(req, res) {
  req.session.destroy(() => res.json({ ok: true }));
}

export function me(req, res) {
  res.json({ authed: !!(req.session && req.session.authed) });
}

export function changePassword(req, res) {
  const { newPassword } = req.body || {};
  if (typeof newPassword !== 'string' || !newPassword.trim()) {
    return res.status(400).json({ error: 'New password is required' });
  }
  setSetting('passwordHash', bcrypt.hashSync(newPassword.trim(), 10));
  res.json({ ok: true });
}
