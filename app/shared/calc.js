// Pure calculation functions shared between the server (operates on DB rows)
// and the client (operates on already-fetched in-memory data). No I/O here.
import { LEAVE_CODES, MONTHS, WEEKDAYS } from './leaveCodes.js';

export function pad(n) { return String(n).padStart(2, '0'); }
export function ds(y, m, d) { return `${y}-${pad(m + 1)}-${pad(d)}`; }
export function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
export function weekdayOf(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return WEEKDAYS[new Date(y, m - 1, d).getDay()];
}
export function monthLabel(y, m) { return `${MONTHS[m]} ${y}`; }
export function monthPrefix(y, m) { return ds(y, m, 1).slice(0, 7); }

export function balanceFromLeaves(leaveMap, quotas) {
  let sick = 0, casual = 0, comp = 0;
  for (const code of Object.values(leaveMap || {})) {
    const m = LEAVE_CODES[code];
    if (!m) continue;
    if (m.kind === 'sick') sick += m.val;
    else if (m.kind === 'casual') casual += m.val;
    else if (m.kind === 'comp') comp += 1;
  }
  return { sick, casual, comp, sRem: quotas.sick - sick, cRem: quotas.casual - casual };
}

export function countWeeklyOffAndHolidays(year, month, holidays) {
  const n = daysInMonth(year, month);
  let count = 0;
  for (let d = 1; d <= n; d++) {
    const dateStr = ds(year, month, d);
    const dow = new Date(year, month, d).getDay();
    if (dow === 0 || holidays[dateStr]) count++;
  }
  return count;
}

// people: [{id,name,dept,role}], leavesByPerson: {personId:{date:code}}
export function buildReportRows({ people, leavesByPerson, holidays, year, month, quotas }) {
  const prefix = monthPrefix(year, month);
  const workingDays = daysInMonth(year, month) - countWeeklyOffAndHolidays(year, month, holidays);
  let repTotal = 0, repComp = 0;
  const rows = people.map((p) => {
    const L = leavesByPerson[p.id] || {};
    let sick = 0, casual = 0, comp = 0;
    for (const [date, code] of Object.entries(L)) {
      if (!date.startsWith(prefix)) continue;
      const m = LEAVE_CODES[code];
      if (!m) continue;
      if (m.kind === 'sick') sick += m.val;
      else if (m.kind === 'casual') casual += m.val;
      else if (m.kind === 'comp') comp += 1;
    }
    repTotal += sick + casual;
    repComp += comp;
    const bal = balanceFromLeaves(L, quotas);
    return {
      id: p.id, name: p.name, dept: p.dept,
      present: workingDays - sick - casual,
      sick, casual, comp,
      sRem: bal.sRem, cRem: bal.cRem,
    };
  });
  return { workingDays, totalLeaves: repTotal, comp: repComp, rows };
}
