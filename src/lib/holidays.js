import { addDays, ymd, parse } from './dates.js';
import bundled from '../data/holidays.json' with { type: 'json' };

let data = bundled;
export const getData = () => data;
export const setData = (d) => { if (d && d.regions) data = d; };

export const REGIONS = {
  DE: [{ key: 'DE-HH', label: 'Hamburg' }],
  NL: [
    { key: 'NL-noord', label: 'North' },
    { key: 'NL-midden', label: 'Central' },
    { key: 'NL-zuid', label: 'South' },
  ],
};
export const COUNTRIES = { DE: 'Germany', NL: 'Netherlands' };
export const regionLabel = (key) => {
  const r = data.regions[key];
  if (!r) return key;
  return r.country === 'NL' ? `${r.label}, Netherlands` : `${r.label}, Germany`;
};

export function easter(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// Public holidays that are fixed by law and computed from Easter.
export function publicHolidays(regionKey, year) {
  const E = easter(year);
  const out = [];
  const add = (date, name) => out.push({ date, name });
  add(`${year}-01-01`, 'New Year');
  if (regionKey.startsWith('DE')) {
    add(addDays(E, -2), 'Good Friday');
    add(addDays(E, 1), 'Easter Monday');
    add(`${year}-05-01`, 'Labour Day');
    add(addDays(E, 39), 'Ascension Day');
    add(addDays(E, 50), 'Whit Monday');
    add(`${year}-10-03`, 'German Unity Day');
    if (regionKey === 'DE-HH') add(`${year}-10-31`, 'Reformation Day');
  } else {
    add(addDays(E, -2), 'Good Friday');
    add(addDays(E, 1), 'Easter Monday');
    let k = new Date(year, 3, 27);
    if (k.getDay() === 0) k = new Date(year, 3, 26);
    add(ymd(k), "King's Day");
    add(addDays(E, 39), 'Ascension Day');
    add(addDays(E, 50), 'Whit Monday');
  }
  add(`${year}-12-25`, 'Christmas Day');
  add(`${year}-12-26`, 'Boxing Day');
  return out;
}

// Official periods for a region with the user's edits laid on top.
// Edits never overwrite the official list: they sit in settings.periodEdits.
export function periodsFor(settings) {
  const reg = data.regions[settings.region];
  if (!reg) return [];
  const edits = settings.periodEdits || {};
  const hidden = new Set(settings.hiddenPeriods || []);
  return reg.periods.map((p) => ({
    ...p,
    ...(edits[p.id] ? { from: edits[p.id].from, to: edits[p.id].to, edited: true } : {}),
    official: true,
    hidden: hidden.has(p.id),
  }));
}

export function buildOffLookup(settings) {
  const periods = periodsFor(settings).filter((p) => !p.hidden);
  const custom = (settings.customOff || []).map((c) => ({ ...c, official: false }));
  const pubCache = new Map();
  const pub = (year) => {
    if (!pubCache.has(year)) pubCache.set(year, new Map(publicHolidays(settings.region, year).map((h) => [h.date, h.name])));
    return pubCache.get(year);
  };
  return (date) => {
    for (const c of custom) if (date >= c.from && date <= c.to) return { kind: c.kind || 'vacation', name: c.name };
    for (const p of periods) if (date >= p.from && date <= p.to) return { kind: p.kind === 'bridge' || p.kind === 'pause' ? 'holiday' : 'holiday', name: p.name };
    const n = pub(Number(date.slice(0, 4))).get(date);
    if (n) return { kind: 'public', name: n };
    return null;
  };
}

// Terms are cut from the holiday calendar and can be edited (settings.termEdits).
export function buildTerms(settings) {
  const reg = data.regions[settings.region];
  if (!reg) return [];
  const periods = [...reg.periods].sort((a, b) => (a.from < b.from ? -1 : 1));
  const isDE = reg.country === 'DE';
  const bounds = periods.filter((p) => p.name === 'Summer holidays' || (isDE ? p.name === 'Mid-year break' : p.name === 'Christmas holidays'));
  const terms = [];
  for (let i = 0; i + 1 < bounds.length; i++) {
    const a = bounds[i], b = bounds[i + 1];
    const first = a.name === 'Summer holidays';
    const from = addDays(a.to, 1);
    const to = isDE && b.name === 'Mid-year break' ? b.from : addDays(b.from, -1);
    const id = `${from}`;
    const e = (settings.termEdits || {})[id];
    terms.push({
      id,
      name: first ? 'Autumn term' : 'Spring term',
      from: e ? e.from : from,
      to: e ? e.to : to,
      edited: !!e,
    });
  }
  return terms;
}

// The current term runs from its start until the next term starts (holidays included).
export function termFor(settings, date) {
  const terms = buildTerms(settings);
  let cur = null;
  for (const t of terms) if (t.from <= date) cur = t;
  return cur;
}

// Public holidays from `from` onwards (next two years), weekdays only, sorted.
export function upcomingPublic(regionKey, from, limit = 99, untilDate = null) {
  const y = Number(from.slice(0, 4));
  const out = [];
  for (const yy of [y, y + 1]) for (const h of publicHolidays(regionKey, yy)) {
    const wd = parse(h.date).getDay();
    if (h.date >= from && wd !== 0 && wd !== 6 && (!untilDate || h.date <= untilDate)) out.push(h);
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : 1)).slice(0, limit);
}
