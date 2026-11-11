import ExcelJS from 'exceljs';
import fs from 'node:fs';
import path from 'node:path';
import { getSetting } from './db.js';
import {
  listPeople, listHolidaysMap, allLeavesMap, balanceFor, balanceFromLeaves,
  daysInMonth, ds, weekdayOf, monthLabel, monthPrefix, LEAVE_CODES,
} from './calc.js';

const SUN_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEFEF' } };
const HOL_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6E1FA' } };
const HEAD_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2630' } };
const HEAD_FONT = { color: { argb: 'FFFFFFFF' }, bold: true };
const THIN = { style: 'thin', color: { argb: 'FFD9DCE1' } };
const BORDER = { top: THIN, left: THIN, bottom: THIN, right: THIN };

function safeSheetName(name) {
  return name.replace(/[:\\/?*[\]]/g, '-').slice(0, 31);
}

function buildTeamSheet(wb, people, quotas) {
  const sheet = wb.addWorksheet('Team', { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = [
    { header: 'Name', key: 'name', width: 24 },
    { header: 'Department', key: 'dept', width: 18 },
    { header: 'Role', key: 'role', width: 22 },
    { header: 'Sick Quota', key: 'sQuota', width: 12 },
    { header: 'Casual Quota', key: 'cQuota', width: 13 },
    { header: 'Sick Balance', key: 'sRem', width: 13 },
    { header: 'Casual Balance', key: 'cRem', width: 14 },
    { header: 'Comp-off Earned', key: 'comp', width: 16 },
  ];
  sheet.getRow(1).eachCell((c) => { c.fill = HEAD_FILL; c.font = HEAD_FONT; });
  for (const p of people) {
    const b = balanceFor(p.id, quotas);
    sheet.addRow({
      name: p.name, dept: p.dept, role: p.role,
      sQuota: quotas.sick, cQuota: quotas.casual,
      sRem: b.sRem, cRem: b.cRem, comp: b.comp,
    });
  }
  sheet.eachRow((row) => row.eachCell((c) => { c.border = BORDER; }));
}

function buildHolidaysSheet(wb, holidays) {
  const sheet = wb.addWorksheet('Holidays', { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = [
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Day', key: 'day', width: 12 },
    { header: 'Holiday', key: 'name', width: 30 },
  ];
  sheet.getRow(1).eachCell((c) => { c.fill = HEAD_FILL; c.font = HEAD_FONT; });
  for (const date of Object.keys(holidays).sort()) {
    sheet.addRow({ date, day: weekdayOf(date), name: holidays[date] });
  }
  sheet.eachRow((row) => row.eachCell((c) => { c.border = BORDER; }));
}

function buildMonthSheet(wb, year, month, people, holidays, leavesByPerson, quotas) {
  const n = daysInMonth(year, month);
  const sheet = wb.addWorksheet(safeSheetName(`${monthLabel(year, month)}`), { views: [{ state: 'frozen', xSplit: 3, ySplit: 2 }] });

  const fixedCols = ['Member', 'Department', 'Role'];
  const dayCols = Array.from({ length: n }, (_, i) => String(i + 1));
  const summaryCols = ['Present', 'Sick', 'Casual', 'Comp', 'Sick Bal', 'Casual Bal'];
  const header1 = [...fixedCols, ...dayCols, ...summaryCols];
  const header2 = ['', '', '', ...Array.from({ length: n }, (_, i) => weekdayOf(ds(year, month, i + 1)).slice(0, 3)), '', '', '', '', '', ''];
  sheet.addRow(header1);
  sheet.addRow(header2);
  sheet.getColumn(1).width = 22;
  sheet.getColumn(2).width = 16;
  sheet.getColumn(3).width = 18;
  for (let i = 0; i < n; i++) sheet.getColumn(4 + i).width = 4.5;
  for (let i = 0; i < summaryCols.length; i++) sheet.getColumn(4 + n + i).width = 10;

  [1, 2].forEach((r) => sheet.getRow(r).eachCell((c) => { c.fill = HEAD_FILL; c.font = HEAD_FONT; c.alignment = { horizontal: 'center' }; }));

  const prefix = monthPrefix(year, month);
  const workingDays = n - Array.from({ length: n }, (_, i) => ds(year, month, i + 1))
    .filter((d) => new Date(year, month, Number(d.split('-')[2])).getDay() === 0 || holidays[d]).length;

  for (const p of people) {
    const L = leavesByPerson[p.id] || {};
    let sick = 0, casual = 0, comp = 0;
    const dayVals = [];
    for (let d = 1; d <= n; d++) {
      const dateStr = ds(year, month, d);
      const code = L[dateStr];
      if (code) {
        const m = LEAVE_CODES[code];
        if (m.kind === 'sick') sick += m.val;
        else if (m.kind === 'casual') casual += m.val;
        else if (m.kind === 'comp') comp += 1;
        dayVals.push(code);
      } else {
        dayVals.push('');
      }
    }
    const bal = balanceFromLeaves(L, quotas, ds(year, month, 1));
    const row = sheet.addRow([p.name, p.dept, p.role, ...dayVals, workingDays - sick - casual, sick, casual, comp, bal.sRem, bal.cRem]);
    for (let d = 1; d <= n; d++) {
      const dateStr = ds(year, month, d);
      const dow = new Date(year, month, d).getDay();
      const cell = row.getCell(3 + d);
      cell.alignment = { horizontal: 'center' };
      if (holidays[dateStr]) cell.fill = HOL_FILL;
      else if (dow === 0) cell.fill = SUN_FILL;
    }
  }
  sheet.eachRow((row) => row.eachCell((c) => { c.border = BORDER; }));
}

function generateWorkbook() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Tsalla Attendance Console';
  wb.created = new Date();

  const quotas = getSetting('quotas');
  const people = listPeople();
  const holidays = listHolidaysMap();
  const leavesByPerson = allLeavesMap();

  buildTeamSheet(wb, people, quotas);
  buildHolidaysSheet(wb, holidays);

  const months = new Set();
  for (const L of Object.values(leavesByPerson)) {
    for (const date of Object.keys(L)) months.add(date.slice(0, 7));
  }
  for (const date of Object.keys(holidays)) months.add(date.slice(0, 7));
  const today = new Date();
  months.add(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`);

  for (const key of [...months].sort()) {
    const [y, m] = key.split('-').map(Number);
    buildMonthSheet(wb, y, m - 1, people, holidays, leavesByPerson, quotas);
  }

  return wb;
}

async function writeNow() {
  const targetPath = getSetting('excelPath');
  const dir = path.dirname(targetPath);
  fs.mkdirSync(dir, { recursive: true });
  const tmpPath = path.join(dir, `.${path.basename(targetPath)}.tmp-${process.pid}`);
  const wb = generateWorkbook();
  await wb.xlsx.writeFile(tmpPath);
  fs.renameSync(tmpPath, targetPath);
}

let timer = null;
let pending = false;
export function syncExcel() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    pending = true;
    writeNow()
      .catch((err) => console.error('[excel] sync failed:', err.message))
      .finally(() => { pending = false; });
  }, 600);
}

export function syncExcelNow() {
  return writeNow();
}

export function isSyncPending() { return pending; }
