import { Router } from 'express';
import os from 'node:os';
import { getSetting, setSetting } from '../db.js';
import { syncExcel } from '../excelSync.js';

const router = Router();

function lanIp() {
  const ifaces = os.networkInterfaces();
  for (const list of Object.values(ifaces)) {
    for (const iface of list || []) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return '127.0.0.1';
}

router.get('/', (req, res) => {
  const port = getSetting('lanPort');
  res.json({
    orgName: getSetting('orgName'),
    accentColor: getSetting('accentColor'),
    quotas: getSetting('quotas'),
    excelPath: getSetting('excelPath'),
    lanPort: port,
    lanUrl: `http://${lanIp()}:${port}`,
  });
});

router.put('/', (req, res) => {
  const { orgName, accentColor, quotas, excelPath } = req.body || {};
  if (orgName !== undefined) setSetting('orgName', String(orgName));
  if (accentColor !== undefined) setSetting('accentColor', String(accentColor));
  if (excelPath !== undefined) setSetting('excelPath', String(excelPath));
  if (quotas !== undefined) {
    const current = getSetting('quotas');
    setSetting('quotas', {
      sick: Math.max(0, Number(quotas.sick ?? current.sick) || 0),
      casual: Math.max(0, Number(quotas.casual ?? current.casual) || 0),
      sickMonthly: Boolean(quotas.sickMonthly ?? current.sickMonthly),
    });
  }
  syncExcel();
  res.json({ ok: true });
});

export default router;
