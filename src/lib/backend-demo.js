// In-memory backend for ?demo=1 and for screenshots. Nothing leaves the browser.
import { addDays, ymd, weekStart } from './dates.js';

export function makeDemoSeed(today) {
  const mon = weekStart(today);
  const entries = [];
  let n = 0;
  const e = (date, cat, minutes, where = 'school', note = '', start = '', end = '') => entries.push({ id: 'd' + n++, date, cat, minutes, where, note, start, end });
  // Previous weeks: a lot of extra prep so the bank has something in it
  for (let w = 5; w >= 1; w--) {
    const m = addDays(mon, -7 * w);
    for (let i = 0; i < 5; i++) e(addDays(m, i), 'prep', 120 + ((i + w) % 3) * 30, i % 2 ? 'home' : 'school');
  }
  e(mon, 'prep', 90); e(addDays(mon, 1), 'admin', 120, 'home'); e(addDays(mon, 2), 'prep', 60);
  e(addDays(mon, 3), 'marking', 95, 'home', 'Year 7 worksheets', '20:15', '21:50');
  e(today, 'prep', 80);
  return entries;
}

export function makeDemoBackend({ seeded = true, today, initialDoc = null }) {
  let cb = null;
  let onUserCb = null;
  let doc = null;
  let entries = [];
  const fire = () => cb && (cb.onDoc(doc ? JSON.parse(JSON.stringify(doc)) : null, { fromCache: false }), cb.onEntries(entries.map((x) => ({ ...x }))));
  return {
    name: 'demo',
    start(onUser) { onUserCb = onUser; setTimeout(() => onUser(seeded ? { uid: 'demo', email: 'you@school.de' } : null), 0); return () => {}; },
    async signIn() { onUserCb({ uid: 'demo', email: 'you@school.de' }); },
    async signOut() { onUserCb(null); },
    attach(uid, h) {
      cb = h;
      if (seeded && !doc) { entries = makeDemoSeed(today); doc = initialDoc; }
      setTimeout(fire, 0);
      return () => { cb = null; };
    },
    async createUser(uid, data) { doc = data; fire(); },
    async saveSettings(uid, s) { doc = { ...doc, settings: s }; fire(); },
    async setDay(uid, date, obj) { doc = { ...doc, days: { ...(doc.days || {}) } }; if (obj) doc.days[date] = obj; else delete doc.days[date]; fire(); },
    async setAck(uid, id) { doc = { ...doc, ackTerms: { ...(doc.ackTerms || {}), [id]: true } }; fire(); },
    async addEntry(uid, e) { entries = [...entries, e]; fire(); },
    async updateEntry(uid, e) { entries = entries.map((x) => (x.id === e.id ? e : x)); fire(); },
    async deleteEntry(uid, id) { entries = entries.filter((x) => x.id !== id); fire(); },
    async resetAll() { doc = null; entries = []; fire(); },
  };
}
export const _ymd = ymd;
