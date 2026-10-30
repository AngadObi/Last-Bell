// Date helpers. All dates are local "YYYY-MM-DD" strings, weeks start on Monday.
export const pad = (n) => String(n).padStart(2, '0');
export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parse = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (s, n) => {
  const d = parse(s);
  d.setDate(d.getDate() + n);
  return ymd(d);
};
export const diffDays = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);
export const weekdayOf = (s) => ((parse(s).getDay() + 6) % 7) + 1; // 1 = Mon ... 7 = Sun
export const weekStart = (s) => addDays(s, -(weekdayOf(s) - 1));
export const isoWeek = (s) => {
  const d = parse(s);
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t - y0) / 86400000 + 1) / 7);
};
export const toMin = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
export const fromMin = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
export const nowMinutes = (d = new Date()) => d.getHours() * 60 + d.getMinutes();

const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const dayShort = (s) => DAY[parse(s).getDay()];
export const dayLong = (s) => DAY_LONG[parse(s).getDay()];
export const monthName = (s) => MONTH[parse(s).getMonth()];
export const dayMonth = (s) => `${parse(s).getDate()} ${monthName(s).slice(0, 3)}`;
export const dayMonthLong = (s) => `${parse(s).getDate()} ${monthName(s)}`;

// "4h 20 min", "3h", "35 min"
export function fmtLong(m) {
  m = Math.round(m);
  const sign = m < 0 ? '-' : '';
  m = Math.abs(m);
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${sign}${r} min`;
  if (r === 0) return `${sign}${h}h`;
  return `${sign}${h}h ${r} min`;
}
// "8h 30", "8h", "35 min" (for tight lists)
export function fmtShort(m) {
  m = Math.round(m);
  const sign = m < 0 ? '-' : '';
  m = Math.abs(m);
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${sign}${r} min`;
  if (r === 0) return `${sign}${h}h`;
  return `${sign}${h}h ${r}`;
}
// "7:50" clock style for under day bars
export const fmtClock = (m) => `${Math.floor(Math.round(m) / 60)}:${pad(Math.round(m) % 60)}`;
export const fmtSigned = (m) => (m >= 0 ? '+' : '-') + fmtLong(Math.abs(m));
