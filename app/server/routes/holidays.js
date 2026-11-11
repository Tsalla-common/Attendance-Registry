import { Router } from 'express';
import { db } from '../db.js';
import { listHolidaysMap } from '../calc.js';
import { syncExcel } from '../excelSync.js';

const router = Router();

router.get('/', (req, res) => {
  res.json(listHolidaysMap());
});

router.put('/:date', (req, res) => {
  const { date } = req.params;
  const { name } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'Holiday name is required' });
  db.prepare(`INSERT INTO holidays (date, name) VALUES (?, ?)
              ON CONFLICT(date) DO UPDATE SET name = excluded.name`)
    .run(date, String(name).trim());
  syncExcel();
  res.json({ ok: true });
});

router.delete('/:date', (req, res) => {
  db.prepare('DELETE FROM holidays WHERE date = ?').run(req.params.date);
  syncExcel();
  res.json({ ok: true });
});

export default router;
