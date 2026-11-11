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

// Leave year runs 1 April – 31 March (Indian financial year). Change this one
// number to 1 for a calendar year. The compiled UI (client/dist) carries its own
// copy of this logic — keep the two in step.
export const LEAVE_YEAR_START_MONTH = 4;
export function leaveYearOf(dateStr) {
  const [y, m] = dateStr.split('-').map(Number);
  return m >= LEAVE_YEAR_START_MONTH ? y : y - 1;
}
function today() {
  const d = new Date();
  return ds(d.getFullYear(), d.getMonth(), d.getDate());
}

// Balances count only leaves in the leave year containing refDate (default: today),
// so quotas reset each year. Nothing carries forward, comp-offs included.
export function balanceFromLeaves(leaveMap, quotas, refDate = today()) {
  const year = leaveYearOf(refDate);
  let sick = 0, casual = 0, comp = 0;
  for (const [date, code] of Object.entries(leaveMap || {})) {
    if (leaveYearOf(date) !== year) continue;
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
    const bal = balanceFromLeaves(L, quotas, ds(year, month, 1));
    return {
      id: p.id, name: p.name, dept: p.dept,
      present: workingDays - sick - casual,
      sick, casual, comp,
      sRem: bal.sRem, cRem: bal.cRem,
    };
  });
  return { workingDays, totalLeaves: repTotal, comp: repComp, rows };
}
