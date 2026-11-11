// Single source of truth for leave codes, shared by server (balance/report calc)
// and client (picker UI, colors are added client-side via CSS variables).
export const LEAVE_CODES = {
  SF: { label: 'Sick leave', sub: 'Full day', short: 'S', kind: 'sick', val: 1, half: false },
  SH: { label: 'Sick leave', sub: 'Half day', short: 'S½', kind: 'sick', val: 0.5, half: true },
  CF: { label: 'Casual leave', sub: 'Full day', short: 'C', kind: 'casual', val: 1, half: false },
  CH: { label: 'Casual leave', sub: 'Half day', short: 'C½', kind: 'casual', val: 0.5, half: true },
  HW: { label: 'Worked on holiday', sub: 'Earns +1 comp-off', short: '★', kind: 'comp', val: 0, half: false },
};

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
