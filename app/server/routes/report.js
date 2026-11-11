import { Router } from 'express';
import { getSetting } from '../db.js';
import { listPeople, listHolidaysMap, buildReportRows, daysInMonth, ds } from '../calc.js';

const router = Router();

router.get('/', (req, res) => {
  const year = Number(req.query.year);
  const month = Number(req.query.month);
  const scope = req.query.scope === 'one' ? 'one' : 'all';
  const personId = req.query.personId;
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 0 || month > 11) {
    return res.status(400).json({ error: 'Valid year and month are required' });
  }

  const quotas = getSetting('quotas');
  const allPeople = listPeople();
  const people = scope === 'one' ? allPeople.filter((p) => p.id === personId) : allPeople;
  const { workingDays, totalLeaves, comp, rows } = buildReportRows({ people, year, month, quotas });

  const holidays = listHolidaysMap();
  const n = daysInMonth(year, month);
  let holCount = 0;
  for (let d = 1; d <= n; d++) if (holidays[ds(year, month, d)]) holCount++;

  res.json({ workingDays, totalLeaves, holidays: holCount, comp, rows });
});

export default router;
