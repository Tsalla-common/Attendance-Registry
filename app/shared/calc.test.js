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
