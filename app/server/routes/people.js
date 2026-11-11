import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { db, getSetting } from '../db.js';
import { listPeople, balanceFor } from '../calc.js';
import { syncExcel } from '../excelSync.js';

const router = Router();

router.get('/', (req, res) => {
  const quotas = getSetting('quotas');
  const people = listPeople().map((p) => ({ ...p, ...balanceFor(p.id, quotas) }));
  res.json(people);
});

router.post('/', (req, res) => {
  const { name, dept, role } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'Name is required' });
  const id = randomUUID();
  db.prepare('INSERT INTO people (id, name, dept, role) VALUES (?, ?, ?, ?)')
    .run(id, String(name).trim(), String(dept || '').trim() || '—', String(role || '').trim() || '—');
  syncExcel();
  res.status(201).json({ id });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM people WHERE id = ?').run(req.params.id);
  syncExcel();
  res.json({ ok: true });
});

export default router;
