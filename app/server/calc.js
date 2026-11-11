import { db } from './db.js';
import { LEAVE_CODES } from '../shared/leaveCodes.js';
import * as Calc from '../shared/calc.js';

export const { pad, ds, daysInMonth, weekdayOf, monthLabel, monthPrefix, balanceFromLeaves, buildReportRows: buildReportRowsPure } = Calc;

export function listPeople() {
  return db.prepare('SELECT id, name, dept, role FROM people ORDER BY created_at ASC').all();
}

export function listHolidaysMap() {
  const rows = db.prepare('SELECT date, name FROM holidays').all();
  const map = {};
  for (const r of rows) map[r.date] = r.name;
  return map;
}

export function leavesForPerson(personId) {
  const rows = db.prepare('SELECT date, code FROM leaves WHERE person_id = ?').all(personId);
  const map = {};
  for (const r of rows) map[r.date] = r.code;
  return map;
}

export function allLeavesMap() {
  const rows = db.prepare('SELECT person_id, date, code FROM leaves').all();
  const map = {};
  for (const r of rows) {
    (map[r.person_id] ||= {})[r.date] = r.code;
  }
  return map;
}

export function balanceFor(personId, quotas) {
  return Calc.balanceFromLeaves(leavesForPerson(personId), quotas);
}

export function buildReportRows({ people, year, month, quotas }) {
  return Calc.buildReportRows({ people, leavesByPerson: allLeavesMap(), holidays: listHolidaysMap(), year, month, quotas });
}

export { LEAVE_CODES };
