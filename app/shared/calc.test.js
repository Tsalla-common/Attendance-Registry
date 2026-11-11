import test from 'node:test';
import assert from 'node:assert/strict';
import { balanceFromLeaves, buildReportRows, leaveYearOf } from './calc.js';

const q = { sick: 12, casual: 12 };
const leaves = {
  '2026-03-31': 'CF', // FY 2025
  '2026-04-01': 'CF', // FY 2026
  '2026-12-10': 'SH', // FY 2026
  '2027-03-31': 'SF', // FY 2026
  '2027-04-01': 'CF', // FY 2027
};

test('leave year starts 1 April', () => {
  assert.equal(leaveYearOf('2026-03-31'), 2025);
  assert.equal(leaveYearOf('2026-04-01'), 2026);
});

test('balance counts only the leave year of the reference date', () => {
  assert.deepEqual(balanceFromLeaves(leaves, q, '2026-11-11'), { sick: 1.5, casual: 1, comp: 0, sRem: 10.5, cRem: 11 });
  assert.deepEqual(balanceFromLeaves(leaves, q, '2027-04-02'), { sick: 0, casual: 1, comp: 0, sRem: 12, cRem: 11 });
  assert.equal(balanceFromLeaves(leaves, q, '2028-06-01').cRem, 12); // fully reset
});

test('report balance uses the leave year of the report month', () => {
  const args = { people: [{ id: 'a', name: 'A', dept: '' }], leavesByPerson: { a: leaves }, holidays: {}, quotas: q };
  assert.equal(buildReportRows({ ...args, year: 2026, month: 2 }).rows[0].cRem, 11);  // Mar 2026 → FY25
  assert.equal(buildReportRows({ ...args, year: 2027, month: 2 }).rows[0].sRem, 10.5); // Mar 2027 → FY26
});

test('month-wise sick leave: yearly / 12 per month, nothing carries over', () => {
  const m = { sick: 12, casual: 12, sickMonthly: true };
  // Dec 2026: half a day used of 1
  assert.deepEqual(balanceFromLeaves(leaves, m, '2026-12-20'), { sick: 0.5, casual: 1, comp: 0, sRem: 0.5, cRem: 11 });
  // Jan 2027: fresh 1, December's unused half is gone; casual stays yearly
  assert.deepEqual(balanceFromLeaves(leaves, m, '2027-01-05'), { sick: 0, casual: 1, comp: 0, sRem: 1, cRem: 11 });
  // over-use in a month goes negative rather than borrowing from other months
  assert.equal(balanceFromLeaves({ '2026-06-01': 'SF', '2026-06-02': 'SF' }, m, '2026-06-15').sRem, -1);
  assert.equal(balanceFromLeaves({}, { sick: 10, casual: 12, sickMonthly: true }, '2026-06-15').sRem, 0.83);
});
