import { esc, pose, ICON, shelf } from '../ui.js';
import { state, ctx, catName } from '../lib/store.js';
import { dayModel, weekSummary, bankSeries, currentTerm, termStats } from '../lib/calc.js';
import { addDays, weekStart, isoWeek, dayShort, dayLong, dayMonth, dayMonthLong, monthName, fmtLong, fmtShort, fmtClock, fmtSigned, parse, ymd, diffDays } from '../lib/dates.js';
import { pick } from '../lib/lines.js';
import { buildTerms } from '../lib/holidays.js';

function rangeFor(mode, offset, c) {
  const s = state.settings;
  const today = c.today;
  if (mode === 'week') {
    const start = addDays(weekStart(today), offset * 7);
    const last = [7, 6, 5].find((n) => n <= 5 || s.plan[n].on) || 5;
    return { from: start, to: addDays(start, 6), label: `WEEK ${isoWeek(start)} · ${dayMonth(start).toUpperCase()} TO ${dayMonthLong(addDays(start, last - 1)).toUpperCase()}`, mode };
  }
  if (mode === 'month') {
    const d = parse(today);
    const first = ymd(new Date(d.getFullYear(), d.getMonth() + offset, 1));
    const last = ymd(new Date(d.getFullYear(), d.getMonth() + offset + 1, 0));
    return { from: first, to: last, label: `${monthName(first).toUpperCase()} ${first.slice(0, 4)}`, mode };
  }
  const terms = buildTerms(s);
  const cur = currentTerm(c);
  let i = terms.findIndex((t) => t.id === cur.id);
  if (i < 0) return { from: cur.from, to: cur.to, label: cur.name.toUpperCase(), mode, term: cur };
  i = Math.max(0, Math.min(terms.length - 1, i + offset));
  const t = terms[i];
  return { from: t.from, to: t.to, label: `${t.name.toUpperCase()} · ${dayMonth(t.from).toUpperCase()} TO ${dayMonth(t.to).toUpperCase()}`, mode, term: t };
}

function aggregate(range, c) {
  const s = state.settings;
  const from = s.startDate && s.startDate > range.from ? s.startDate : range.from;
  const to = range.to > c.today ? c.today : range.to;
  const weeks = [];
  let lessons = 0, other = 0, logged = 0, due = 0, daysOver = 0, daysOnTime = 0, workDays = 0, over = 0;
  const lastDay = range.to;
  for (let w = weekStart(range.from); w <= lastDay; w = addDays(w, 7)) {
    const wk = { start: w, logged: 0, due: 0, lessons: 0, other: 0 };
    for (let i = 0; i < 7; i++) {
      const d = addDays(w, i);
      if (d < range.from || d > range.to || d < from) continue;
      const m = dayModel(d, c);
      wk.due += m.due;
      if (d <= c.today) {
        wk.logged += m.logged; wk.lessons += m.lessons; wk.other += m.other;
        if (m.isOver) daysOver++;
        if (m.isOnTime) daysOnTime++;
        if (m.due > 0) workDays++;
      }
    }
    if (wk.due || wk.logged) weeks.push(wk);
    lessons += wk.lessons; other += wk.other; logged += wk.logged; due += wk.due;
    if (addDays(w, 6) <= c.today || range.mode === 'week') over += Math.max(0, wk.logged - wk.due);
  }
  return { weeks, lessons, other, logged, due, daysOver, daysOnTime, workDays, over, from, to };
}

export function register() {
  const s = state.settings;
  const c = ctx();
  const mode = state.ui.regMode;
  const off = state.ui.regOffset;
  const range = rangeFor(mode, off, c);
  const agg = aggregate(range, c);
  const today = c.today;

  // Madam Chonk's report line
  let moment = 'reportOk';
  if (agg.logged === 0) moment = 'reportEmpty';
  else if (agg.daysOver >= 2 || agg.over > 0) moment = 'reportOver';
  const heavy = agg.over >= 300;
  const line = pick({ tone: s.tone, kind: s.kind, heavy, moment, seed: range.from + mode });
  const nWork = agg.workDays || 0;

  // Bars
  let bars = '';
  if (mode === 'week') {
    const days = [];
    for (let i = 0; i < 7; i++) { const m = dayModel(addDays(range.from, i), c); if (m.wd <= 5 || m.planned > 0 || m.logged > 0) days.push(m); }
    const maxH = Math.max(1, ...days.map((d) => Math.max(d.planned, d.logged))) / 60;
    const ppH = Math.min(13, 112 / maxH);
    bars = `<div class="dayrow mt12" style="padding:0 4px">${days.map((d) => {
      const over = Math.min(d.over, d.other);
      const l = d.lessons * ppH / 60, p = Math.max(0, d.other - over) * ppH / 60, o = over * ppH / 60;
      return `<div class="daycol" style="width:48px"><div class="bar" style="height:${Math.ceil(maxH * ppH) + 6}px;width:44px"><div class="stack" style="width:34px;border-radius:6px"><div style="height:${l}px;background:var(--lesson)"></div><div style="height:${p}px;background:var(--prep)"></div><div style="height:${o}px;background:var(--over)"></div></div>${d.planned && !d.off ? `<div class="plan" style="bottom:${d.planned * ppH / 60}px;width:44px"></div>` : ''}</div>
        <div style="margin-top:6px;font-size:13px;font-weight:800">${dayShort(d.date)}</div><div style="font-size:12px;font-weight:700;color:var(--ink2)">${d.off ? 'off' : d.date > today ? '' : fmtClock(d.logged)}</div></div>`;
    }).join('')}</div>`;
  } else {
    const maxH = Math.max(1, ...agg.weeks.map((w) => Math.max(w.due, w.logged))) / 60;
    const ppH = Math.min(4.5, 112 / maxH);
    const many = agg.weeks.length > 8;
    bars = `<div class="mt12" style="display:flex;align-items:flex-end;gap:${many ? 3 : 6}px;height:${Math.ceil(maxH * ppH) + 8}px;padding:0 2px">${agg.weeks.map((w) => {
      const ov = Math.max(0, w.logged - w.due);
      const l = w.lessons * ppH / 60, p = Math.max(0, w.other - ov) * ppH / 60, o = Math.min(ov, w.other) * ppH / 60;
      return `<div style="flex:1;min-width:0;position:relative;display:flex;flex-direction:column-reverse;align-items:stretch;height:100%;justify-content:flex-start"><div style="display:flex;flex-direction:column-reverse;border-radius:4px;overflow:hidden"><div style="height:${l}px;background:var(--lesson)"></div><div style="height:${p}px;background:var(--prep)"></div><div style="height:${o}px;background:var(--over)"></div></div><div style="position:absolute;left:-1px;right:-1px;bottom:${w.due * ppH / 60}px;border-top:2px dashed var(--ink)"></div></div>`;
    }).join('')}</div>
    <div class="spread mt4" style="font-size:11px;font-weight:700;color:var(--ink2)"><span>${agg.weeks.length ? 'Week ' + isoWeek(agg.weeks[0].start) : ''}</span><span>${agg.weeks.length ? 'Week ' + isoWeek(agg.weeks[agg.weeks.length - 1].start) : ''}</span></div>`;
  }

  // Bank chart
  const series = bankSeries(c, 8);
  const maxB = Math.max(60, ...series.map((x) => x.bank));
  const wsum = weekSummary(c);
  const delta = series.length > 1 ? (series[series.length - 1].bank - series[0].bank) / (series.length - 1) : 0;
  const bankNote = delta > 5 ? `Growing by about ${fmtLong(Math.round(delta / 5) * 5)} a week.` : delta < -5 ? 'Shrinking. Good.' : 'Holding steady.';
  const chart = series.map((x, i) => `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:5px"><div style="width:100%;max-width:30px;height:${Math.max(4, x.bank / maxB * 56)}px;border-radius:6px 6px 3px 3px;background:${i === series.length - 1 ? '#E8B93D' : '#DDCFAD'}"></div><div style="font-size:11px;font-weight:700;color:var(--ink2)">W${isoWeek(x.start)}</div></div>`).join('');

  // Entries
  const list = [];
  for (let d = range.to > today ? today : range.to; d >= range.from && list.length < 14; d = addDays(d, -1)) {
    const m = dayModel(d, c);
    if (!m.counted) continue;
    if (m.lessons || m.credit || m.entries.length || (m.override && m.override.kind)) list.push(m);
  }
  const ovLabel = (m) => { const o = m.override; if (!o || !o.kind) return 'From your timetable'; if (o.kind === 'none') return { sick: 'Sick day, counted as planned', trip: 'Trip, counted as worked', event: 'School event, counted as worked' }[o.sub || 'sick']; return o.kind === 'extra' ? 'Extra lessons, changed by you' : 'Changed from your timetable'; };
  const entries = list.map((m) => `
    <div class="title" style="font-size:22px;margin-top:12px">${m.date === today ? 'Today, ' + dayShort(m.date) + ' ' + dayMonth(m.date) : dayLong(m.date) + ' ' + dayMonth(m.date)}</div>
    ${m.lessons || m.credit ? `<button class="lrow" data-a="sheet" data-v="notplanned" data-d="${m.date}" style="min-height:56px"><i class="dot" style="background:var(--lesson);width:12px;height:12px"></i><span class="grow"><span style="display:block;font-size:15px;font-weight:800">Lessons</span><span class="sub2">${esc(ovLabel(m))}</span></span><span style="font-size:15px;font-weight:800">${fmtLong(m.lessons + m.credit)}</span>${ICON.chev()}</button>` : ''}
    ${m.entries.map((e) => `<button class="lrow" data-a="edit-entry" data-v="${e.id}" style="min-height:56px"><i class="dot" style="background:var(--prep);width:12px;height:12px"></i><span class="grow"><span style="display:block;font-size:15px;font-weight:800">${esc(catName(e.cat))}</span><span class="sub2">${e.source === 'bell' ? 'Focus timer' : e.where === 'home' ? 'Home' : 'School'}${e.start && e.end ? `, ${e.start} to ${e.end}` : ''}${e.note ? ' · ' + esc(e.note) : ''}</span></span><span style="font-size:15px;font-weight:800">${fmtLong(e.minutes)}</span>${ICON.chev()}</button>`).join('')}`).join('');

  const navDisabled = off >= 0;
  const poseBox = pose('smug', 'position:absolute;right:14px;top:-64px;width:78px;height:90px;object-fit:contain');

  return `<div class="phone"><div class="scroll" style="padding-top:16px">
    <div style="padding:0 20px"><div class="eyebrow">${esc(range.label)}</div><h1 class="title t36" style="margin-top:2px">Register</h1></div>
    <div class="row mx mt8" style="gap:10px"><div class="seg grow">${[['week', 'Week'], ['month', 'Month'], ['term', 'Term']].map(([k, l]) => `<button class="${mode === k ? 'on' : ''}" data-a="reg-mode" data-v="${k}">${l}</button>`).join('')}</div>
      <button class="round sm" data-a="reg-nav" data-v="-1" aria-label="Earlier">${ICON.left()}</button><button class="round sm" data-a="reg-nav" data-v="1" aria-label="Later" ${navDisabled ? 'disabled style="opacity:.35"' : ''}>${ICON.right()}</button></div>
    <div class="card mx" style="position:relative;margin-top:72px;padding:14px 16px">${poseBox}
      <div class="eyebrow">${mode === 'week' ? "This week's" : mode === 'month' ? "This month's" : "This term's"} report card</div>
      <div class="title" style="font-size:30px;line-height:1.1;margin-top:8px">${esc(line)}</div>
      <div class="row mt12" style="gap:8px;flex-wrap:wrap"><span class="pill gold">Over plan ${agg.daysOver} of ${nWork} days</span><span class="pill green">On time ${agg.daysOnTime} days</span></div></div>
    <div class="card mx mt12" style="padding:14px 16px 12px"><div class="eyebrow">${mode === 'week' ? 'Day by day' : 'Week by week'}</div>${bars}
      <div class="row mt12" style="gap:14px;font-size:12px;font-weight:700;color:var(--ink3);flex-wrap:wrap"><span class="row" style="gap:6px"><i class="dot" style="background:var(--lesson)"></i>Lessons</span><span class="row" style="gap:6px"><i class="dot" style="background:var(--prep)"></i>Outside class</span><span class="row" style="gap:6px"><i class="dot" style="background:var(--over)"></i>Over plan</span></div></div>
    <div class="row mx mt12" style="gap:8px;align-items:stretch">
      <div class="card grow" style="padding:10px 12px"><div class="title" style="font-size:30px">${fmtShort(agg.lessons)}</div><div class="label" style="font-size:10px;letter-spacing:.1em">Lessons</div></div>
      <div class="card grow" style="padding:10px 12px"><div class="title" style="font-size:30px">${fmtShort(agg.other)}</div><div class="label" style="font-size:10px;letter-spacing:.1em">Outside class</div></div>
      <button class="grow" data-a="sheet" data-v="takeback" style="border:0;border-radius:18px;background:var(--board);color:#FBF6EA;padding:10px 12px;text-align:left"><div class="title" style="font-size:30px;color:#FFD98A">${agg.over > 0 ? '+' + fmtShort(agg.over) : '0h'}</div><div class="label" style="font-size:10px;letter-spacing:.1em;color:#F2EBDA">Overtime</div></button></div>
    <div class="card mx mt12" style="padding:14px 16px 12px"><div class="eyebrow">Overtime bank, last 8 weeks</div>
      <div class="row mt12" style="gap:6px;align-items:flex-end;height:80px">${chart}</div>
      <div class="sub mt8" style="font-size:13px;font-weight:700">${bankNote} Now ${wsum.bank > 0 ? fmtSigned(wsum.bank) : '0h'}.</div></div>
    <div class="card mx mt12" style="padding:14px 16px 6px"><div class="eyebrow">Entries</div>${entries || '<p class="sub mt8" style="padding-bottom:10px">Nothing logged in this period yet.</p>'}
      <p class="sub" style="font-size:12px;padding:10px 0 6px">Tap an entry to change it. Tap lessons if the day was not as planned.</p></div>
  </div>${shelf('register')}</div>`;
}
