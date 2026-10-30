import { addDays, diffDays, nowMinutes, toMin, weekStart, weekdayOf } from './dates.js';
import { buildOffLookup, buildTerms, termFor } from './holidays.js';

// A realistic example week (39h), used by the demo and the tests. New users start from DEFAULT_PLAN (all zero).
export const SAMPLE_PLAN = () => ({
  1: { on: true, start: '07:45', end: '16:45', breakMin: 30, lessonMin: 330 },
  2: { on: true, start: '08:00', end: '16:30', breakMin: 30, lessonMin: 300 },
  3: { on: true, start: '08:00', end: '16:00', breakMin: 30, lessonMin: 270 },
  4: { on: true, start: '08:00', end: '16:30', breakMin: 30, lessonMin: 300 },
  5: { on: true, start: '08:00', end: '15:30', breakMin: 30, lessonMin: 270 },
  6: { on: false, start: '09:00', end: '12:00', breakMin: 0, lessonMin: 0 },
  7: { on: false, start: '09:00', end: '12:00', breakMin: 0, lessonMin: 0 },
});

export const DEFAULT_PLAN = () => {
  const day = (on) => ({ on, start: '08:00', end: '08:00', breakMin: 0, lessonMin: 0 });
  return { 1: day(true), 2: day(true), 3: day(true), 4: day(true), 5: day(true), 6: day(false), 7: day(false) };
};

export const workMin = (p) => (p && p.on ? Math.max(0, toMin(p.end) - toMin(p.start) - (p.breakMin || 0)) : 0);
export const planTotal = (plan) => [1, 2, 3, 4, 5, 6, 7].reduce((s, d) => s + workMin(plan[d]), 0);
export const lessonTotal = (plan) => [1, 2, 3, 4, 5, 6, 7].reduce((s, d) => s + (plan[d] && plan[d].on ? Math.min(plan[d].lessonMin || 0, workMin(plan[d])) : 0), 0);

// ctx = { settings, days, entries, today, now }
//   days:    { [date]: { kind?: 'fewer'|'extra'|'none', lessonMin?, sub?: 'sick'|'event'|'trip', takeback? } }
//   entries: [{ id, date, cat, minutes, start?, end?, where?, note?, source? }]
export function makeCtx({ settings, days = {}, entries = [], today, now = nowMinutes() }) {
  const byDate = new Map();
  for (const e of entries) {
    if (!byDate.has(e.date)) byDate.set(e.date, []);
    byDate.get(e.date).push(e);
  }
  return { settings, days, entries, byDate, today, now, off: buildOffLookup(settings), cache: new Map() };
}

export function dayModel(date, ctx) {
  if (ctx.cache.has(date)) return ctx.cache.get(date);
  const { settings } = ctx;
  const wd = weekdayOf(date);
  const plan = settings.plan[wd];
  const counted = !settings.startDate || date >= settings.startDate;
  const ov = ctx.days[date] || null;
  const off = ctx.off(date);
  const planned = counted ? workMin(plan) : 0;
  const planLessons = plan && plan.on ? Math.min(plan.lessonMin || 0, workMin(plan)) : 0;
  const due = off || !counted ? 0 : planned;
  const entries = ctx.byDate.get(date) || [];
  const manual = entries.reduce((s, e) => s + e.minutes, 0);
  const takeback = ov && ov.takeback ? ov.takeback : 0;

  let lessons = 0;
  let credit = 0;
  if (counted && date <= ctx.today) {
    if (ov && (ov.kind === 'fewer' || ov.kind === 'extra')) {
      lessons = ov.lessonMin || 0;
    } else if (ov && ov.kind === 'none') {
      // Sick days, trips and school events count as planned hours.
      lessons = planLessons;
      credit = Math.max(0, planned - planLessons);
    } else if (!off && planLessons > 0) {
      if (date < ctx.today) lessons = planLessons;
      else {
        const s = toMin(plan.start);
        const e = toMin(plan.end);
        const f = e > s ? Math.min(1, Math.max(0, (ctx.now - s) / (e - s))) : 1;
        lessons = Math.round(planLessons * f);
      }
    }
  }
  const logged = lessons + credit + manual;
  const dueEff = Math.max(0, due - takeback);
  const other = credit + manual;
  const over = Math.max(0, logged - planned);
  const m = {
    date, wd, counted, off, planned, due, dueEff, planLessons, lessons, credit, manual, other,
    logged, over, takeback, override: ov, entries,
    isOver: due > 0 && logged > due,
    isOnTime: due > 0 && logged > 0 && logged <= due && date <= ctx.today,
  };
  ctx.cache.set(date, m);
  return m;
}

export function weekModel(start, ctx, { from = null } = {}) {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(start, i);
    days.push(dayModel(d, ctx));
  }
  const use = from ? days.filter((d) => d.date >= from) : days;
  const due = use.reduce((s, d) => s + d.due, 0);
  const takeback = use.reduce((s, d) => s + d.takeback, 0);
  const logged = use.reduce((s, d) => s + d.logged, 0);
  const dueEff = Math.max(0, due - takeback);
  return {
    start, days, due, takeback, logged, dueEff,
    left: Math.max(0, dueEff - logged),
    surplus: logged - dueEff,
    lessons: use.reduce((s, d) => s + d.lessons, 0),
    other: use.reduce((s, d) => s + d.other, 0),
    daysOver: use.filter((d) => d.isOver && d.date <= ctx.today).length,
    daysOnTime: use.filter((d) => d.isOnTime).length,
    workDays: use.filter((d) => d.due > 0).length,
  };
}

// The term the user is in. If the calendar has none yet, the term starts the day she began.
export function currentTerm(ctx) {
  const t = termFor(ctx.settings, ctx.today);
  if (t) return t;
  const from = ctx.settings.startDate || ctx.today;
  return { id: 'start', name: 'First term', from, to: addDays(from, 100), edited: false, synthetic: true };
}

// Bank at the start of the week `start`: sum of finished weeks of this term,
// never below zero. Working less than due takes hours off; it never goes negative.
export function bankBefore(start, ctx, term) {
  const t = term || currentTerm(ctx);
  const from = ctx.settings.startDate && ctx.settings.startDate > t.from ? ctx.settings.startDate : t.from;
  let bank = 0;
  let w = weekStart(from);
  while (w < start && w <= t.to) {
    const wm = weekModel(w, ctx, { from });
    const wDays = wm.days.filter((d) => d.date >= from && d.date <= t.to);
    const due = wDays.reduce((s, d) => s + d.due, 0);
    const logged = wDays.reduce((s, d) => s + d.logged, 0);
    bank = Math.max(0, bank + logged - due);
    w = addDays(w, 7);
  }
  return bank;
}

// Live view of the current week: the bank grows once the week's due hours are exceeded.
export function weekSummary(ctx, term) {
  const t = term || currentTerm(ctx);
  const start = weekStart(ctx.today);
  const from = ctx.settings.startDate && ctx.settings.startDate > t.from ? ctx.settings.startDate : t.from;
  const wm = weekModel(start, ctx, { from });
  const before = bankBefore(start, ctx, t);
  const bank = Math.max(0, before - wm.takeback + Math.max(0, wm.surplus));
  return { ...wm, bankBefore: before, bank, term: t };
}

// Bank at the end of each of the last n weeks (current week = live value), for the chart.
export function bankSeries(ctx, n = 8) {
  const t = currentTerm(ctx);
  const out = [];
  const cur = weekStart(ctx.today);
  for (let i = n - 1; i >= 0; i--) {
    const s = addDays(cur, -7 * i);
    if (i === 0) out.push({ start: s, bank: weekSummary(ctx, t).bank });
    else out.push({ start: s, bank: bankBefore(addDays(s, 7), ctx, t) });
  }
  return out;
}

export function termStats(ctx, term) {
  const t = term;
  const from = ctx.settings.startDate && ctx.settings.startDate > t.from ? ctx.settings.startDate : t.from;
  const end = t.to < ctx.today ? t.to : ctx.today;
  let daysOver = 0, daysOnTime = 0, takenBack = 0, logged = 0, due = 0, lessons = 0, other = 0;
  for (let d = from; d <= end; d = addDays(d, 1)) {
    const m = dayModel(d, ctx);
    if (m.isOver) daysOver++;
    if (m.isOnTime) daysOnTime++;
    takenBack += m.takeback;
    logged += m.logged; due += m.due; lessons += m.lessons; other += m.other;
  }
  const bank = bankBefore(addDays(weekStart(end), 7), ctx, t);
  const weeks = Math.max(1, Math.round(diffDays(weekStart(from), weekStart(end)) / 7) + 1);
  return { daysOver, daysOnTime, takenBack, logged, due, lessons, other, bank, weeks, from, to: end };
}

export const termsList = (settings) => buildTerms(settings);
