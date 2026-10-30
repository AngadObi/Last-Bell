import { esc, pose, ICON, shelf } from '../ui.js';
import { state, ctx, catName } from '../lib/store.js';
import { dayModel, weekSummary, currentTerm } from '../lib/calc.js';
import { fmtLong, fmtShort, fmtClock, fmtSigned, dayShort, dayLong, dayMonthLong, isoWeek, toMin, addDays, diffDays, nowMinutes, weekStart, parse, monthName } from '../lib/dates.js';
import { pick } from '../lib/lines.js';
import { periodsFor, publicHolidays, getData } from '../lib/holidays.js';

export function nextOff(settings, today) {
  const cands = [];
  for (const p of periodsFor(settings)) if (!p.hidden && p.to >= today && p.kind !== 'pause') cands.push({ name: p.name, from: p.from, to: p.to });
  for (const c of settings.customOff || []) if (c.to >= today) cands.push({ name: c.name, from: c.from, to: c.to });
  const y = Number(today.slice(0, 4));
  for (const yy of [y, y + 1]) for (const h of publicHolidays(settings.region, yy)) if (h.date >= today) cands.push({ name: h.name, from: h.date, to: h.date, pub: true });
  cands.sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0));
  // A public holiday inside a school holiday is not news: skip it.
  const periods = cands.filter((c) => !c.pub);
  const first = cands.find((c) => !(c.pub && periods.some((p) => c.from >= p.from && c.from <= p.to)));
  return first || null;
}

function timeOffStrip(settings, today, tm) {
  const reg = getData().regions[settings.region];
  const cur = tm.off && tm.off.kind !== 'public' ? tm.off : null;
  let title = '', head = 'NEXT TIME OFF', big = '', unit = '';
  const n = nextOff(settings, today);
  if (cur && n && n.from <= today) {
    // Inside a holiday: when is she back?
    let back = addDays(n.to, 1);
    while (true) { const m = dayModel(back, state._ctx); if (m.off || !m.planned) back = addDays(back, 1); else break; if (back > addDays(n.to, 30)) break; }
    head = 'BACK AT SCHOOL'; title = dayLong(back) + ' ' + dayMonthLong(back);
    const d = diffDays(today, back); big = d; unit = d === 1 ? 'day' : 'days';
  } else if (n) {
    title = n.name; head = n.pub ? 'NEXT DAY OFF' : 'NEXT TIME OFF';
    const d = diffDays(today, n.from);
    if (d >= 14) { big = Math.round(d / 7); unit = 'weeks'; } else { big = d; unit = d === 1 ? 'day' : 'days'; }
  } else {
    title = 'Not out yet'; big = ''; unit = '';
  }
  return `<div class="row mx mt16" style="position:relative;height:62px;padding:0 16px 0 92px;background:var(--mist);border:1.5px dashed var(--mist-d);border-radius:18px;margin-top:16px">
    ${pose('cozy', 'position:absolute;left:8px;bottom:0;width:78px;height:60px;object-fit:contain')}
    <div class="grow"><div class="eyebrow" style="color:#4A5B73">${head}</div><div class="title" style="font-size:${title.length > 18 ? 22 : 26}px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(title)}</div></div>
    ${big !== '' ? `<div style="text-align:center;line-height:1"><div class="title" style="font-size:30px">${big}</div><div style="font-size:11px;font-weight:800;color:#4A5B73">${unit}</div></div>` : ''}
  </div>`;
}

export function home() {
  const s = state.settings;
  const c = ctx();
  state._ctx = c;
  const today = c.today;
  const tm = dayModel(today, c);
  const wk = weekSummary(c);
  const now = c.now;
  const plan = s.plan[tm.wd];
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning.' : hour < 18 ? 'Good afternoon.' : 'Good evening.';
  const dt = `${dayLong(today)} · ${dayMonthLong(today)}`.toUpperCase();

  // Madam Chonk's note
  const working = tm.planned > 0 && !tm.off;
  const start = working ? toMin(plan.start) : 0;
  const end = working ? toMin(plan.end) : 0;
  let moment = 'morning', poseName = 'planning';
  if (tm.off) { moment = 'off'; poseName = 'cozy'; }
  else if (!working) { moment = 'weekend'; poseName = 'napping'; }
  else if (now < start) { moment = 'morning'; poseName = 'planning'; }
  else if (now <= end) { moment = 'lessons'; poseName = 'teaching'; }
  else if (tm.isOver) { moment = 'over'; poseName = 'overwhelmed'; }
  else { moment = 'after'; poseName = 'smug'; }
  const heavy = wk.surplus >= 300 || (tm.planned && tm.logged >= tm.planned + 90);
  const line = pick({ tone: s.tone, kind: s.kind, heavy, moment, seed: today });
  if (heavy && s.kind && moment === 'over') poseName = 'loving';

  // Board
  const hrs = Math.floor(wk.logged / 60);
  const mins = Math.round(wk.logged % 60);
  const pct = wk.dueEff ? Math.min(100, (wk.logged / wk.dueEff) * 100) : 0;
  const bankTxt = wk.bank > 0 ? fmtSigned(wk.bank) : '0h';

  // Today card
  let todayCard = '';
  if (working) {
    const left = end - now;
    const status = now < start ? `Starts at ${plan.start}` : left > 0 ? `${fmtLong(left)} until the bell` : 'The bell has gone';
    const scale = Math.max(8, Math.ceil(Math.max(tm.planned, tm.logged) / 60));
    const sc = scale * 60;
    const ticks = [];
    for (let i = 0; i <= scale * 2; i++) ticks.push(`<div style="position:absolute;top:0;left:${(i * 100 / (scale * 2)).toFixed(3)}%;width:1.5px;height:${i % 2 === 0 ? 14 : 8}px;background:rgba(59,47,36,.75)"></div>`);
    const labels = [];
    for (let i = 0; i <= scale; i += scale > 10 ? 2 : 1) labels.push(`<div style="position:absolute;top:30px;left:${(i * 100 / scale).toFixed(3)}%;transform:translateX(-50%);font-size:11px;font-weight:700;color:var(--ink2);line-height:1">${i}</div>`);
    const mark = (tm.planned / sc) * 100;
    todayCard = `<div class="card mx mt12" style="padding:11px 16px 10px">
      <div class="spread" style="font-size:11px;font-weight:800;letter-spacing:.14em;color:var(--ink2)"><span>TODAY</span>
        <span class="row" style="gap:5px;font-weight:700;letter-spacing:.04em;font-size:13px;color:var(--ink3)">${ICON.bell(16)}${status}</span></div>
      <div class="title" style="font-size:42px;line-height:1.05">${fmtLong(tm.logged)}</div>
      <div style="position:relative;height:46px;margin-top:6px">
        <div style="position:absolute;left:0;right:0;top:0;height:26px;border-radius:6px;background:#F3E2B8;overflow:hidden">
          <div style="position:absolute;left:0;top:0;bottom:0;width:${Math.min(100, tm.lessons / sc * 100)}%;background:var(--lesson)"></div>
          <div style="position:absolute;left:${Math.min(100, tm.lessons / sc * 100)}%;top:0;bottom:0;width:${Math.min(100 - tm.lessons / sc * 100, tm.other / sc * 100)}%;background:var(--prep)"></div>
          ${ticks.join('')}</div>
        <div style="position:absolute;left:${Math.min(99.5, mark)}%;top:-3px;width:2.5px;height:32px;margin-left:-1px;background:var(--ink);border-radius:2px"></div>
        <div style="position:absolute;left:${Math.min(99.5, mark)}%;top:-7px;width:10px;height:10px;margin-left:-5px;background:var(--ink);border-radius:50%"></div>
        ${labels.join('')}</div>
      <div class="spread mt8" style="font-size:12px;font-weight:700;color:var(--ink3);flex-wrap:wrap;row-gap:0;white-space:nowrap">
        <span class="row" style="gap:12px;white-space:nowrap"><span class="row" style="gap:5px"><i class="dot" style="background:var(--lesson)"></i>Lessons ${fmtShort(tm.lessons)}</span><span class="row" style="gap:6px"><i class="dot" style="background:var(--prep)"></i>Outside class ${fmtShort(tm.other)}</span></span>
        <button data-a="sheet" data-v="notplanned" data-d="${today}" style="margin-left:auto;border:0;background:transparent;font-size:12px;font-weight:800;color:var(--ink3);text-decoration:underline;min-height:32px;padding:0">Not as planned?</button></div>
    </div>`;
  } else {
    const why = tm.off ? tm.off.name : 'No school planned';
    todayCard = `<div class="card mx mt12" style="padding:12px 16px"><div class="eyebrow">TODAY</div><div class="title" style="font-size:34px">${tm.off ? 'Day off' : 'A free day'}</div><div class="sub">${esc(why)}${tm.logged ? ' · ' + fmtLong(tm.logged) + ' logged anyway' : ''}</div></div>`;
  }

  // Forgotten prep nudge (same evening)
  const rt = toMin(s.reminderTime || '19:00');
  const nudge = s.reminder && working && now >= Math.max(rt, end) && tm.manual === 0
    ? `<div class="note mx mt12" style="transform:rotate(.6deg);display:flex;align-items:center;gap:10px"><div class="grow">No prep or admin logged today. Anything to add before you forget?</div><button class="chip" style="min-height:44px" data-a="sheet" data-v="log">Add</button></div>` : '';

  // Day by day
  const days = wk.days.filter((d) => (d.wd <= 5) || d.planned > 0 || d.logged > 0);
  const maxH = Math.max(1, ...days.map((d) => Math.max(d.planned, d.logged))) / 60;
  const ppH = Math.min(7, 62 / maxH);
  const cols = days.map((d) => {
    const over = Math.min(d.over, d.other);
    const l = d.lessons * ppH / 60, p = Math.max(0, d.other - over) * ppH / 60, o = over * ppH / 60;
    const future = d.date > today;
    return `<div class="daycol"><div class="bar" style="height:62px"><div class="stack"><div style="height:${l}px;background:var(--lesson)"></div><div style="height:${p}px;background:var(--prep)"></div><div style="height:${o}px;background:var(--over)"></div></div>${d.planned && !d.off ? `<div class="plan" style="bottom:${d.planned * ppH / 60}px"></div>` : ''}</div>
      <div style="margin-top:5px;font-size:12px;font-weight:${d.date === today ? 800 : 800};line-height:1.1;${d.date === today ? 'text-decoration:underline;text-underline-offset:3px' : ''}">${dayShort(d.date)}</div>
      <div style="font-size:11px;font-weight:700;line-height:1.2;color:var(--ink2)">${d.off ? 'off' : future ? '' : fmtClock(d.logged)}</div></div>`;
  }).join('');

  return `<div class="phone">
  <div class="scroll" style="padding-top:16px">
    <div class="hdr"><div><div class="eyebrow">${esc(dt)}</div><h1 class="title t36" style="margin-top:2px">${greet}</h1></div>
      <button data-a="stars" aria-label="${wk.daysOnTime} gold stars this week" class="row" style="gap:6px;height:44px;padding:0 14px 0 10px;border:1.5px solid var(--line);border-radius:22px;background:var(--card);font-size:16px;font-weight:800;box-shadow:0 2px 0 var(--line)">${ICON.star()}${wk.daysOnTime}</button></div>
    <div style="position:relative;height:130px;margin-top:8px">
      <div class="note" style="position:absolute;left:20px;top:26px;width:206px;transform:rotate(-1.5deg)"><div class="tape"></div><div style="position:absolute;right:-6px;top:34px;width:14px;height:14px;background:var(--note);transform:rotate(45deg)"></div>${esc(line)}</div>
      ${pose(poseName, 'position:absolute;right:18px;top:0;width:128px;height:118px;object-fit:contain')}
    </div>
    <div class="board mx" style="margin:0 14px;z-index:2">
      <div class="spread" style="font-size:11px;font-weight:800;letter-spacing:.14em;color:#F2EBDA"><span>THIS WEEK · WEEK ${isoWeek(today)}</span><span style="font-weight:700;color:#E3DCC8">CONTRACT ${fmtShort(s.contractMin).toUpperCase()}</span></div>
      <div class="spread mt4" style="align-items:flex-end;margin-top:2px">
        <div style="display:flex;align-items:baseline;gap:2px;font-family:'Caveat Brush',cursive;color:#FBF6EA"><span style="font-size:76px;line-height:.95">${hrs}</span><span style="font-size:30px">h${mins ? ' ' + mins : ''} logged</span></div>
        <div style="text-align:right;font-family:'Caveat Brush',cursive;line-height:1"><div style="font-size:24px;color:#FBF6EA">of ${fmtShort(wk.dueEff)}</div><div style="font-size:36px;color:#F4CC55;margin-top:2px">${wk.dueEff === 0 ? 'free week' : wk.left > 0 ? fmtShort(wk.left) + ' left' : 'week done'}</div></div></div>
      <div class="chalk-bar" style="margin-top:8px"><div style="width:${pct}%"></div></div>
      <div class="spread" style="margin-top:9px"><span style="font-size:11px;font-weight:800;letter-spacing:.14em;color:#F2EBDA">OVERTIME BANK</span>
        <button data-a="sheet" data-v="takeback" class="stamp-sm" style="background:transparent;cursor:pointer" aria-label="Overtime bank ${bankTxt}. Take it back">${bankTxt}</button></div>
    </div>
    ${todayCard}${nudge}
    <div class="row mx mt12" style="gap:10px">
      <button class="btn" data-a="sheet" data-v="log" style="flex:1;min-width:0;gap:12px">${ICON.pencil()}<span style="display:flex;flex-direction:column;align-items:flex-start;line-height:1.1"><span style="font-size:18px">Log hours</span><span style="font-size:12px;font-weight:700;opacity:.9">prep, admin, parents</span></span></button>
      <button class="chip" data-a="focus" aria-label="Start a ${s.bell.focus} minute focus session" style="width:92px;height:58px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;font-size:12px;border-radius:18px">${ICON.bell(22)}Focus ${s.bell.focus}</button>
    </div>
    <div class="card mx mt12 row" style="gap:10px;padding:10px 14px 8px;align-items:stretch">
      <div style="width:96px;flex-shrink:0;display:flex;flex-direction:column;justify-content:center;gap:8px"><div class="eyebrow">Day by day</div>
        <div style="display:flex;flex-direction:column;gap:3px;font-size:12px;font-weight:700;line-height:1.2;color:var(--ink2);padding-bottom:2px">
          <span class="row" style="gap:6px"><i style="width:14px;height:9px;border-radius:2px;background:var(--lesson)"></i>lessons</span>
          <span class="row" style="gap:6px"><i style="width:14px;height:9px;border-radius:2px;background:var(--prep)"></i>outside class</span>
          <span class="row" style="gap:6px"><i style="width:14px;height:9px;border-radius:2px;background:var(--over)"></i>over plan</span></div></div>
      <div class="grow dayrow">${cols}</div>
    </div>
    ${timeOffStrip(s, today, tm)}
  </div>
  ${shelf('desk')}</div>`;
}
