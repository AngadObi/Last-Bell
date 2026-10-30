import { test } from 'node:test';
import assert from 'node:assert';
import { DEFAULT_PLAN, makeCtx, dayModel, weekModel, weekSummary, bankBefore, planTotal, currentTerm } from '../src/lib/calc.js';
import { easter, publicHolidays, buildTerms, buildOffLookup } from '../src/lib/holidays.js';
import { fmtLong, fmtShort, weekStart, addDays } from '../src/lib/dates.js';

const settings = () => ({
  contractMin: 2340, region: 'DE-HH', plan: DEFAULT_PLAN(), startDate: '2026-08-20',
  customOff: [], hiddenPeriods: [], periodEdits: {}, termEdits: {},
});

test('plan adds up to the 39h contract', () => {
  assert.strictEqual(planTotal(DEFAULT_PLAN()), 2340);
});

test('formatting follows the "3h" style', () => {
  assert.strictEqual(fmtLong(180), '3h');
  assert.strictEqual(fmtLong(260), '4h 20 min');
  assert.strictEqual(fmtLong(35), '35 min');
  assert.strictEqual(fmtShort(510), '8h 30');
});

test('easter and Hamburg public holidays', () => {
  assert.strictEqual(easter(2027), '2027-03-28');
  const h = publicHolidays('DE-HH', 2027).map((x) => x.date);
  assert.ok(h.includes('2027-03-26')); // Good Friday
  assert.ok(h.includes('2027-10-31')); // Reformation Day
});

test('terms are cut from the Hamburg calendar', () => {
  const t = buildTerms(settings());
  const autumn = t.find((x) => x.from === '2026-08-20');
  assert.ok(autumn);
  assert.strictEqual(autumn.to, '2027-01-29');
  assert.strictEqual(autumn.name, 'Autumn term');
});

test('lessons auto-log from the plan on past days, pro rata today', () => {
  const ctx = makeCtx({ settings: settings(), today: '2026-11-06', now: 12 * 60 + 30 });
  // Thursday 5 Nov is past: full lessons (5h)
  assert.strictEqual(dayModel('2026-11-05', ctx).lessons, 300);
  // Friday 6 Nov, 12:30 is part way through 08:00-15:30
  const f = dayModel('2026-11-06', ctx);
  assert.ok(f.lessons > 0 && f.lessons < 270);
  assert.strictEqual(f.due, 420); // 07:30 less 30 min break
  // The autumn holidays (19 to 30 Oct) are off: nothing due, no lessons
  const h = dayModel('2026-10-29', ctx);
  assert.strictEqual(h.due, 0);
  assert.strictEqual(h.lessons, 0);
});

test('school holidays and public holidays shrink due hours', () => {
  const ctx = makeCtx({ settings: settings(), today: '2026-11-20' });
  assert.strictEqual(dayModel('2026-10-26', ctx).due, 0); // autumn holidays
  assert.strictEqual(dayModel('2026-11-02', ctx).due, 510); // normal Monday: 07:45-16:45 less 30 min
  assert.strictEqual(dayModel('2027-03-26', makeCtx({ settings: settings(), today: '2027-04-01' })).due, 0); // Good Friday
});

test('bank never goes negative and grows with surplus weeks', () => {
  const s = settings();
  const entries = [];
  // A week with 6h of extra prep every day in week of 2 Nov 2026
  for (let i = 0; i < 5; i++) entries.push({ id: 'e' + i, date: addDays('2026-11-02', i), cat: 'prep', minutes: 6 * 60 });
  // And a short week the next week (nothing logged beyond lessons)
  const ctx = makeCtx({ settings: s, entries, today: '2026-11-18', now: 17 * 60 });
  const wk1 = weekModel('2026-11-02', ctx);
  assert.ok(wk1.logged > wk1.due);
  const b1 = bankBefore('2026-11-09', ctx);
  assert.ok(b1 > 0);
  // Weeks with only lessons logged do not take the bank below zero
  const b2 = bankBefore('2026-11-16', ctx);
  assert.ok(b2 >= 0);
});

test('take it back reduces what is left and spends bank', () => {
  const s = settings();
  const entries = [];
  for (let i = 0; i < 5; i++) entries.push({ id: 'e' + i, date: addDays('2026-11-02', i), cat: 'prep', minutes: 8 * 60 });
  const days = { '2026-11-13': { takeback: 120 } };
  const ctx = makeCtx({ settings: s, days, entries, today: '2026-11-11', now: 12 * 60 });
  const w = weekSummary(ctx);
  assert.strictEqual(w.start, weekStart('2026-11-11'));
  assert.strictEqual(w.takeback, 120);
});

test('sick days count as planned hours', () => {
  const s = settings();
  const days = { '2026-11-03': { kind: 'none', sub: 'sick' } };
  const ctx = makeCtx({ settings: s, days, today: '2026-11-04', now: 600 });
  const d = dayModel('2026-11-03', ctx);
  assert.strictEqual(d.logged, d.planned);
});

test('current term for Hamburg is the autumn term', () => {
  const ctx = makeCtx({ settings: settings(), today: '2026-11-04' });
  assert.strictEqual(currentTerm(ctx).from, '2026-08-20');
});

test('off lookup finds Christmas holidays', () => {
  const off = buildOffLookup(settings());
  assert.ok(off('2026-12-23'));
  assert.strictEqual(off('2026-11-10'), null);
});
