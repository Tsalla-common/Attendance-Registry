import { Router } from 'express';
import { db } from '../db.js';
import { allLeavesMap, listHolidaysMap, LEAVE_CODES } from '../calc.js';
import { syncExcel } from '../excelSync.js';

const router = Router();

router.get('/', (req, res) => {
  res.json(allLeavesMap());
});

router.put('/:personId/:date', (req, res) => {
  const { personId, date } = req.params;
  const { code } = req.body || {};

  if (code === null || code === undefined) {
    db.prepare('DELETE FROM leaves WHERE person_id = ? AND date = ?').run(personId, date);
    syncExcel();
    return res.json({ ok: true });
  }

  if (!LEAVE_CODES[code]) return res.status(400).json({ error: 'Unknown leave code' });
  if (code === 'HW' && !listHolidaysMap()[date]) {
    return res.status(400).json({ error: '"Worked on holiday" is only valid on an official holiday' });
  }
  const person = db.prepare('SELECT id FROM people WHERE id = ?').get(personId);
  if (!person) return res.status(404).json({ error: 'Member not found' });

  db.prepare(`INSERT INTO leaves (person_id, date, code) VALUES (?, ?, ?)
              ON CONFLICT(person_id, date) DO UPDATE SET code = excluded.code`)
    .run(personId, date, code);
  syncExcel();
  res.json({ ok: true });
});

export default router;
