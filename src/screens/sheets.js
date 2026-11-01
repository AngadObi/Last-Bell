import { esc, ICON, sheetShell, pad2 } from '../ui.js';
import { state, ctx, catName, CATS, draftSettings } from '../lib/store.js';
import { makeCtx, dayModel, weekModel, weekSummary, currentTerm } from '../lib/calc.js';
import { addDays, dayShort, dayMonth, dayLong, dayMonthLong, fmtLong, fmtShort, fmtSigned, toMin, fromMin, weekStart, ymd } from '../lib/dates.js';

const catIcon = (id) => (ICON[id] ? ICON[id]() : ICON.other());
const niceDate = (d, today) => (d === today ? `Today, ${dayShort(d)} ${dayMonth(d)}` : d === addDays(today, -1) ? `Yesterday, ${dayShort(d)} ${dayMonth(d)}` : `${dayShort(d)} ${dayMonth(d)}`);

// ---------- Log hours ----------
export function logInit(entry) {
  const today = ymd(new Date());
  if (entry) return { name: 'log', editId: entry.id, cat: entry.cat, minutes: entry.minutes, mode: entry.start && entry.end ? 'range' : 'duration', start: entry.start || '16:00', end: entry.end || '17:00', date: entry.date, where: entry.where || 'school', note: entry.note || '' };
  return { name: 'log', cat: 'prep', minutes: 60, mode: 'duration', start: '16:00', end: '17:00', date: today, where: 'school', note: '' };
}
export function logMinutes(d) {
  if (d.mode === 'range') { const m = toMin(d.end) - toMin(d.start); return m > 0 ? m : 0; }
  return d.minutes;
}
export function logSheet(d) {
  const s = state.settings;
  const today = ymd(new Date());
  const mins = logMinutes(d);
  const c0 = ctx();
  const others = state.entries.filter((e) => e.id !== d.editId);
  const c1 = makeCtx({ settings: s, days: state.days, entries: [...others, { id: 'x', date: d.date, cat: d.cat, minutes: mins }], today: c0.today, now: c0.now });
  const ws = weekStart(d.date);
  const wk = weekModel(ws, c1, { from: s.startDate });
  const lessons = dayModel(d.date, c1).lessons;
  const left = wk.dueEff - wk.logged;
  const after = `After this: ${fmtLong(wk.logged)} of ${fmtLong(wk.dueEff)} this week, ${left >= 0 ? fmtLong(left) + ' left' : fmtLong(-left) + ' over'}`;
  const tiles = CATS.map((c) => `<button class="tile ${d.cat === c.id ? 'on' : ''}" data-a="log-cat" data-v="${c.id}" style="${d.cat === c.id ? '' : ''}">${catIcon(c.id)}${esc(catName(c.id))}</button>`).join('');
  const chips = [[15, '15 min'], [30, '30 min'], [45, '45 min'], [60, '1h'], [120, '2h']].map(([m, l]) => `<button class="chip" data-a="log-set" data-v="${m}" style="flex:1;min-height:44px;padding:0 4px;${d.mode === 'duration' && d.minutes === m ? 'border:2px solid var(--prep);background:#DDE8F5' : ''}">${l}</button>`).join('');
  const dur = d.mode === 'duration' ? `
    <div class="spread mt4"><button class="round" data-a="log-step" data-v="-15" aria-label="15 minutes less">-</button><div class="title" style="font-size:60px;text-align:center;white-space:nowrap">${fmtShort(d.minutes)}</div><button class="round" data-a="log-step" data-v="15" aria-label="15 minutes more">+</button></div>
    <div class="row mt8" style="gap:8px">${chips}</div>` : `
    <div class="row mt8" style="gap:10px;justify-content:center"><input class="time" type="time" value="${d.start}" data-c="log-time" data-f="start" aria-label="Start"><span class="muted" style="font-weight:700">to</span><input class="time" type="time" value="${d.end}" data-c="log-time" data-f="end" aria-label="End"></div>
    <div class="title center mt8" style="font-size:48px">${mins ? fmtLong(mins) : 'End is before start'}</div>`;
  const body = `
  ${lessons ? `<div class="row mt8" style="width:max-content;max-width:100%;gap:6px;background:#DDE8DD;color:#3F5C48;border-radius:10px;padding:5px 10px;font-size:13px;font-weight:800">${ICON.check(14)}School hours ${d.date === today ? 'today' : 'that day'}, ${fmtShort(lessons)}, are already in</div>` : ''}
  <div class="label mt16">What kind of work</div>
  <div class="grid3 mt8">${tiles}</div>
  <div class="spread mt16"><span class="label">How much</span><div class="seg" style="min-width:210px"><button class="${d.mode === 'duration' ? 'on' : ''}" data-a="log-mode" data-v="duration">Duration</button><button class="${d.mode === 'range' ? 'on' : ''}" data-a="log-mode" data-v="range">Times</button></div></div>
  ${dur}
  <div class="row mt14" style="gap:10px;align-items:flex-start">
    <div class="grow"><div class="label">When</div>
      <label style="position:relative;display:flex;align-items:center;justify-content:space-between;height:48px;margin-top:6px;padding:0 14px;border:1.5px solid var(--line2);border-radius:14px;background:var(--card);font-size:14px;font-weight:800">${niceDate(d.date, today)}<span style="color:var(--ink2)">${ICON.down()}</span>
      <input type="date" value="${d.date}" max="${today}" min="${s.startDate || ''}" data-c="log-date" style="position:absolute;inset:0;opacity:0;width:100%;height:100%" aria-label="Date"></label></div>
    <div class="grow"><div class="label">Where</div><div class="seg" style="margin-top:6px;height:48px"><button class="${d.where === 'school' ? 'on' : ''}" data-a="log-where" data-v="school">School</button><button class="${d.where === 'home' ? 'on' : ''}" data-a="log-where" data-v="home">Home</button></div></div>
  </div>
  <div class="label mt14">Note, if you like</div>
  <input class="field mt6" placeholder="Year 7 worksheets" value="${esc(d.note)}" data-c="log-note" maxlength="120">
  <div class="center mt14" style="font-size:13px;font-weight:700;color:var(--ink3)">${after}</div>`;
  const label = d.editId ? 'Save changes' : `Log ${mins ? fmtLong(mins) : '...'} of ${catName(d.cat).toLowerCase()}`;
  const foot = `<button class="btn" data-a="log-save" ${mins ? '' : 'disabled'}>${esc(label)}</button>${d.editId ? '<div class="center"><button class="link" data-a="log-delete" style="color:var(--over)">Delete this entry</button></div>' : ''}`;
  return sheetShell(d.editId ? 'Edit entry' : 'What did you work on?', '', body, { foot });
}

// ---------- Not as planned ----------
export function npInit(date) {
  const c = ctx();
  const m = dayModel(date, c);
  const ov = state.days[date];
  const P = m.planLessons;
  if (ov && ov.kind) return { name: 'notplanned', date, mode: ov.kind, lessonMin: ov.lessonMin != null ? ov.lessonMin : P, sub: ov.sub || 'sick', planned: P, had: true };
  return { name: 'notplanned', date, mode: 'fewer', lessonMin: Math.max(0, P - 60), sub: 'sick', planned: P, had: false };
}
export function npSheet(d) {
  const today = ymd(new Date());
  const opt = (id, t, s) => `<button class="opt ${d.mode === id ? 'on' : ''}" data-a="np-mode" data-v="${id}"><span class="grow"><span style="display:block;font-size:15px;font-weight:800">${t}</span><span style="display:block;margin-top:2px;font-size:13px;font-weight:700;color:var(--ink3)">${s}</span></span><span class="r"></span></button>`;
  const diff = d.lessonMin - d.planned;
  const body = `
  <div class="spread mt14" style="background:#DDE8DD;border-radius:16px;padding:10px 14px"><span style="font-size:14px;font-weight:700;color:#3F5C48">Planned for ${d.date === today ? 'today' : dayLong(d.date)}</span><span class="title" style="font-size:26px">School hours ${fmtShort(d.planned)}</span></div>
  <div class="label mt16">What happened</div>
  <div class="mt8" style="display:flex;flex-direction:column;gap:8px">
    ${opt('fewer', 'Fewer school hours than planned', 'Cancelled, swapped or dropped')}
    ${opt('extra', 'Extra school hours', 'Cover for someone, or an added class')}
    ${opt('none', 'No school hours that day', 'Sick, trip or school event')}</div>
  ${d.mode === 'none' ? `<div class="seg mt12">${[['sick', 'Sick'], ['trip', 'Trip'], ['event', 'School event']].map(([k, l]) => `<button class="${d.sub === k ? 'on' : ''}" data-a="np-sub" data-v="${k}">${l}</button>`).join('')}</div>` : `
  <div class="label mt16">School hours taught</div>
  <div class="spread mt4"><button class="round" data-a="np-step" data-v="-15" aria-label="15 minutes less">-</button><div class="title" style="font-size:60px;white-space:nowrap">${fmtShort(d.lessonMin)}</div><button class="round" data-a="np-step" data-v="15" aria-label="15 minutes more">+</button></div>
  <div class="center mt4" style="font-size:13px;font-weight:700;color:var(--ink2)">${diff === 0 ? 'Same as planned' : diff < 0 ? fmtLong(-diff) + ' fewer than planned' : fmtLong(diff) + ' more than planned'}</div>`}
  <div class="mt14" style="background:var(--cream);border-radius:14px;padding:10px 14px;font-size:13px;line-height:1.35;font-weight:700;color:var(--ink3)">A trip or school event counts as worked time. A sick day counts as planned hours, so it never shrinks your bank.</div>`;
  const foot = `<button class="btn" data-a="np-save">Update ${d.date === today ? "today's" : dayLong(d.date) + "'s"} school hours</button>${d.had ? '<div class="center"><button class="link" data-a="np-reset">Back to my timetable</button></div>' : ''}`;
  return sheetShell('Not as planned?', 'School hours log themselves. Tell me what was different.', body, { foot });
}

// ---------- Take it back ----------
export function bankAvailable(date) {
  const c = ctx();
  const wk = weekSummary(c);
  const t = currentTerm(c);
  const endOfWeek = addDays(wk.start, 6);
  let pending = 0;
  for (const [dd, o] of Object.entries(state.days)) if (o.takeback && dd > endOfWeek && dd <= t.to && dd !== date) pending += o.takeback;
  const own = state.days[date] && state.days[date].takeback && date >= wk.start && date <= endOfWeek ? state.days[date].takeback : 0;
  return Math.max(0, wk.bank + own - pending);
}
export function tbInit(date) {
  const c = ctx();
  let d = date || c.today;
  const m = dayModel(d, c);
  if (!date && (m.due === 0 || c.now >= toMin(state.settings.plan[m.wd].end || '00:00') && m.due > 0)) {
    let n = addDays(d, 1);
    for (let i = 0; i < 30; i++) { if (dayModel(n, c).due > 0) break; n = addDays(n, 1); }
    d = n;
  }
  return { name: 'takeback', date: d, minutes: 120 };
}
export function tbSheet(d) {
  const c = ctx();
  const today = c.today;
  const avail = bankAvailable(d.date);
  const bank = weekSummary(c).bank;
  const m = dayModel(d.date, c);
  const plan = state.settings.plan[m.wd];
  const opts = [];
  const add = (x) => { if (!opts.includes(x)) opts.push(x); };
  if (m.due > 0 && d.date === today) add(today);
  let n = addDays(today, 1);
  for (let i = 0; i < 30 && opts.length < 3; i++) { if (dayModel(n, c).due > 0) add(n); n = addDays(n, 1); }
  const dayBtn = (x) => `<button class="chip ${d.date === x ? 'on' : ''}" data-a="tb-date" data-v="${x}" style="flex:1;line-height:1.2;padding:6px 4px;min-height:56px">${x === today ? 'Today' : dayShort(x)}<br><span style="font-weight:700;color:var(--ink3)">${x === today ? dayShort(x) + ' ' + dayMonth(x) : dayMonth(x)}</span></button>`;
  const isPicked = !opts.includes(d.date);
  const minutes = Math.min(d.minutes, avail);
  const work = m.due;
  const presets = [[60, '1h'], [120, '2h'], [Math.round(work / 2 / 15) * 15, 'Half a day'], [work, 'All day']].filter(([v]) => v > 0);
  const after = Math.max(0, avail - minutes);
  let result = '';
  if (m.due === 0) result = `${dayLong(d.date)} has nothing planned. Pick a school day.`;
  else if (avail < 30) result = 'Your bank has less than 30 min in it. Nothing to take back yet.';
  else if (minutes >= work) result = `${dayLong(d.date)} becomes a day off.<br>Bank after: <b>${after > 0 ? fmtSigned(after) : '0h'}</b>`;
  else result = `${dayLong(d.date)}'s planned end moves from ${plan.end} to ${fromMin(toMin(plan.end) - minutes)}.<br>Bank after: <b>${after > 0 ? fmtSigned(after) : '0h'}</b>`;
  const body = `
  <div class="board spread" style="margin-top:14px;border-width:0;border-radius:16px;box-shadow:none;padding:12px 16px"><span style="font-size:11px;font-weight:800;letter-spacing:.14em;color:#F2EBDA">YOUR OVERTIME BANK</span><span class="title" style="font-size:36px;color:#FFD98A">${bank > 0 ? fmtSigned(bank) : '0h'}</span></div>
  <div class="label mt16">Which day</div>
  <div class="row mt8" style="gap:8px;align-items:stretch">${opts.map(dayBtn).join('')}
    <label class="chip ${isPicked ? 'on' : ''}" style="flex:1;position:relative;display:flex;align-items:center;justify-content:center;text-align:center;line-height:1.2;padding:6px 4px;min-height:56px">${isPicked ? dayShort(d.date) + '<br>' + dayMonth(d.date) : 'Pick<br>a date'}<input type="date" min="${today}" value="${d.date}" data-c="tb-date" style="position:absolute;inset:0;opacity:0;width:100%;height:100%" aria-label="Pick a date"></label></div>
  <div class="label mt16">How much</div>
  <div class="spread mt4"><button class="round" data-a="tb-step" data-v="-30" aria-label="30 minutes less">-</button><div class="title" style="font-size:60px;white-space:nowrap">${fmtShort(minutes)}</div><button class="round" data-a="tb-step" data-v="30" aria-label="30 minutes more">+</button></div>
  <div class="row mt8" style="gap:8px">${presets.map(([v, l]) => `<button class="chip" data-a="tb-set" data-v="${v}" style="flex:1;padding:0 4px;min-height:44px">${l}</button>`).join('')}</div>
  <div class="mt14" style="background:var(--cream);border-radius:14px;padding:10px 14px;font-size:14px;line-height:1.4;font-weight:700">${result}</div>`;
  const ok = m.due > 0 && avail >= 30 && minutes > 0;
  const foot = `<button class="btn" data-a="tb-save" ${ok ? '' : 'disabled'}>Take ${fmtLong(minutes)} back</button>${state.days[d.date] && state.days[d.date].takeback ? '<div class="center"><button class="link" data-a="tb-undo">Cancel the time I took back for this day</button></div>' : ''}`;
  return sheetShell('Take it back', 'Spend some of your overtime on actual time off.', body, { foot });
}

// ---------- Add a day off (vacation, sick day, trip) ----------
export function aoInit() { const t = ymd(new Date()); return { name: 'addoff', type: 'vacation', from: t, to: t, label: '' }; }
export function aoSheet(d) {
  const app = state.phase === 'app';
  const types = app ? [['vacation', 'Vacation'], ['sick', 'Sick day'], ['trip', 'Trip or event']] : [['vacation', 'Vacation']];
  const body = `
  <div class="seg mt14">${types.map(([k, l]) => `<button class="${d.type === k ? 'on' : ''}" data-a="ao-type" data-v="${k}">${l}</button>`).join('')}</div>
  ${d.type === 'vacation' ? `<div class="label mt14">Name</div><input class="field mt6" placeholder="Skiing trip" value="${esc(d.label)}" data-c="ao-label" maxlength="40">` : ''}
  <div class="row mt14" style="gap:10px"><div class="grow"><div class="label">From</div><input class="field mt6" type="date" value="${d.from}" data-c="ao-from"></div><div class="grow"><div class="label">To</div><input class="field mt6" type="date" value="${d.to}" min="${d.from}" data-c="ao-to"></div></div>
  <p class="sub mt12" style="font-size:13px">${d.type === 'vacation' ? 'Vacation days have no hours due and no school hours.' : d.type === 'sick' ? 'A sick day counts as planned hours, so it never shrinks your bank.' : 'A trip or school event counts as worked time.'}</p>`;
  return sheetShell('Add a day off', '', body, { foot: `<button class="btn" data-a="ao-save">Add</button>` });
}
