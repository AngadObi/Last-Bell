import { esc, pose, ICON, sw, sheetShell } from '../ui.js';
import { state, draftSettings, CATS } from '../lib/store.js';
import { fmtLong, fmtShort, dayMonthLong, dayMonth, addDays, ymd, toMin } from '../lib/dates.js';
import { workMin, planTotal } from '../lib/calc.js';
import { TONES } from '../lib/lines.js';
import { COUNTRIES, REGIONS, upcomingPublic, periodsFor, getData, regionLabel } from '../lib/holidays.js';

const DAYS = [['Mon', 1], ['Tue', 2], ['Wed', 3], ['Thu', 4], ['Fri', 5], ['Sat', 6], ['Sun', 7]];

export const wrap = (inner, { foot = '' } = {}) => `
<div class="phone"><div class="scroll" style="padding:40px 14px 12px;display:flex;flex-direction:column">${inner}</div>${foot ? `<div style="padding:8px 14px calc(18px + env(safe-area-inset-bottom))">${foot}</div>` : ''}</div>`;

export function intro() {
  return wrap(`
  <div style="display:flex;flex-direction:column;align-items:center;flex:1">
    <div class="eyebrow" style="margin-bottom:6px">Last Bell</div>
    ${pose('cheeky', 'width:210px;height:230px;object-fit:contain')}
    <h1 class="title t48 center mt4" style="margin-top:6px">Hello. I'm Madam Chonk.</h1>
    <p class="center" style="margin:10px 24px 0;font-size:16px;line-height:1.4;font-weight:700;color:var(--ink3)">I will be supervising your working hours. Please do not take it personally.</p>
    <div class="card flat mt20" style="width:100%;padding-top:4px;padding-bottom:4px">
      ${[
        ['#DDE8DD', '#3F5C48', ICON.monitor(), 'Lessons log themselves from your timetable.'],
        ['#DDE8F5', '#3E5F8F', ICON.pencil(24), "Prep, marking and admin, you log yourself. I will notice if you don't."],
        ['#FBF1D6', '#3B2F24', ICON.bell(24), 'I count the overtime. And I will mention it.'],
      ].map(([bg, c, i, t]) => `<div class="lrow" style="gap:14px;min-height:64px"><span style="flex-shrink:0;width:40px;height:40px;border-radius:12px;background:${bg};color:${c};display:flex;align-items:center;justify-content:center">${i}</span><span style="font-size:15px;line-height:1.3;font-weight:700">${t}</span></div>`).join('')}
    </div>
  </div>`, { foot: `<button class="btn" data-a="step" data-v="1">Let's set up your week</button><div class="center"><button class="link" data-a="signin-screen">I already have an account</button></div>` });
}

const stepHead = (n, title, sub, poseName) => `
  <div class="hdr tight" style="align-items:flex-end;gap:4px;padding:0 6px">
    <div class="grow" style="padding-bottom:8px">
      <div class="eyebrow">First day · Step ${n} of 4</div>
      <h1 class="title t40" style="margin:4px 0 ${sub ? 10 : 0}px;line-height:1.05">${title}</h1>
      ${sub ? `<p class="sub">${sub}</p>` : ''}
    </div>
    ${pose(poseName, 'width:88px;height:94px;object-fit:contain;flex-shrink:0')}
  </div>`;

const nextFoot = (label, to, disabled = false, back = '') => `<button class="btn" data-a="step" data-v="${to}" ${disabled ? 'disabled' : ''}>${label}</button>${back ? `<div class="center"><button class="link" data-a="step" data-v="${back}">Back</button></div>` : ''}`;

export function step1() {
  const s = draftSettings();
  const regs = REGIONS[s.country];
  return wrap(`
  ${stepHead(1, 'Your contract', '', 'smug')}
  <div class="note" style="margin:12px 6px 0;transform:rotate(-1deg)">Contract says ${fmtShort(s.contractMin)}? Brave of them.</div>
  <div class="card mt14" style="padding:14px 16px 16px">
    <div class="eyebrow">Hours per week</div>
    <div class="spread mt8"><button class="round" data-a="contract" data-v="-30" aria-label="30 minutes less">-</button><div class="title" style="font-size:68px;white-space:nowrap">${fmtShort(s.contractMin)}</div><button class="round" data-a="contract" data-v="30" aria-label="30 minutes more">+</button></div>
    <p class="sub center mt8" style="font-size:13px">In steps of 30 min. You can change it later in the staffroom.</p>
  </div>
  <div class="card mt12" style="padding:14px 16px 16px">
    <div class="eyebrow">Where you teach</div>
    <div class="seg mt8">${Object.entries(COUNTRIES).map(([k, v]) => `<button class="${s.country === k ? 'on' : ''}" data-a="country" data-v="${k}">${v}</button>`).join('')}</div>
    <select class="field mt10" data-c="region" aria-label="Region">${regs.map((r) => `<option value="${r.key}" ${s.region === r.key ? 'selected' : ''}>${r.label}${s.country === 'NL' ? ' (' + (r.label === 'North' ? 'Noord' : r.label === 'Central' ? 'Midden' : 'Zuid') + ')' : ''}</option>`).join('')}</select>
    <p class="sub mt10" style="font-size:13px">${s.country === 'DE' ? "Hamburg's school holidays and public holidays get filled in for you. Other German states are not added yet." : 'Dutch school holidays and public holidays get filled in for your region.'}</p>
  </div>`, { foot: nextFoot('Next: your real week', 2, false, 'intro') });
}

// ---- weekly plan editor (setup and staffroom) ----
export function weekEditor(plan, contractMin, openDay) {
  const total = planTotal(plan);
  const ok = total === contractMin;
  const diff = contractMin - total;
  const days = DAYS.filter(([, n]) => n <= 5 || plan[n].on);
  const rows = days.map(([lab, n]) => {
    const p = plan[n];
    const w = workMin(p);
    const les = Math.min(p.lessonMin || 0, w);
    const prep = w - les;
    const open = openDay === n;
    const step = (f, v, label, val, w) => `<div class="spread" style="min-height:48px"><span style="font-size:14px;font-weight:800;display:flex;align-items:center;gap:6px">${label}</span><span class="row"><button class="round sm" data-a="plan-step" data-day="${n}" data-f="${f}" data-v="${-v}" aria-label="less ${f}">-</button><b style="width:${w || 84}px;text-align:center">${val}</b><button class="round sm" data-a="plan-step" data-day="${n}" data-f="${f}" data-v="${v}" aria-label="more ${f}">+</button></span></div>`;
    return `<div class="card mt8" style="padding:10px 14px 6px">
      <div class="spread"><div class="title" style="font-size:30px">${lab}</div><div class="title" style="font-size:24px;white-space:nowrap">${fmtShort(w)}</div></div>
      <div style="display:flex;height:10px;border-radius:5px;overflow:hidden;margin-top:6px;background:#F3E2B8">
        <div style="width:${w ? les / w * 100 : 0}%;background:var(--lesson)"></div><div style="width:${w ? prep / w * 100 : 0}%;background:var(--prep)"></div></div>
      ${step('lessonMin', 15, '<i class="dot" style="background:var(--lesson)"></i> Lessons', fmtLong(les))}
      ${step('prepMin', 15, '<i class="dot" style="background:var(--prep)"></i> Outside class', fmtLong(prep))}
      <button data-a="open-day" data-v="${n}" style="display:flex;justify-content:space-between;width:100%;min-height:40px;align-items:center;border:0;border-top:1px solid var(--hair);background:transparent;padding:0;font-size:12px;font-weight:700;color:var(--ink3)" aria-expanded="${open}"><span>${p.start} to ${p.end} · break ${p.breakMin} min</span><span style="text-decoration:underline">${open ? 'Done' : 'Times and break'}</span></button>
      ${open ? `<div style="padding:4px 0 10px">
        <div class="spread" style="min-height:48px"><span style="font-size:14px;font-weight:800">Starts at</span><input class="time" type="time" value="${p.start}" data-c="plan" data-day="${n}" data-f="start" aria-label="${lab} start"></div>
        ${step('breakMin', 5, 'Break', p.breakMin + ' min')}
        <div class="spread" style="min-height:40px"><span style="font-size:14px;font-weight:800">Ends at</span><b style="margin-right:8px">${p.end}</b></div>
        ${n > 5 ? `<button class="link" data-a="plan-off" data-day="${n}" style="color:var(--over)">Remove this day</button>` : ''}
      </div>` : ''}
    </div>`;
  }).join('');
  const addWk = [6, 7].filter((n) => !plan[n].on);
  return `
  <div class="board sm mt12" style="display:flex;align-items:center;justify-content:space-between">
    <div class="grow">
      <div style="display:flex;align-items:baseline;gap:8px;font-family:'Caveat Brush',cursive;line-height:1"><span style="font-size:30px">${fmtShort(total)} of ${fmtShort(contractMin)}</span><span style="font-size:22px;color:#F4CC55">${ok ? 'all hours placed' : diff > 0 ? fmtShort(diff) + ' to place' : fmtShort(-diff) + ' too many'}</span></div>
      <div class="chalk-bar mt8" style="height:10px;border-radius:8px"><div style="width:${Math.min(100, total / contractMin * 100)}%"></div></div>
    </div>
    ${ok ? `<div style="margin-left:14px;width:34px;height:34px;border-radius:50%;background:#F4CC55;color:var(--ink);display:flex;align-items:center;justify-content:center;flex-shrink:0">${ICON.check(20)}</div>` : ''}
  </div>
  ${rows}
  ${addWk.length ? `<button class="chip mt10" style="width:100%;border-style:dashed;box-shadow:none;color:var(--ink3)" data-a="plan-add" data-v="${addWk[0]}">+ Add a ${addWk[0] === 6 ? 'Saturday' : 'Sunday'}</button>` : ''}`;
}

export function step2() {
  const s = draftSettings();
  const ok = planTotal(s.plan) === s.contractMin;
  return wrap(`
  <div class="hdr tight" style="align-items:flex-end;padding:0 6px">
    <div class="grow" style="padding-bottom:6px"><div class="eyebrow">First day · Step 2 of 4</div>
      <h1 class="title t40" style="margin:4px 0 6px">Your real week</h1>
      <p class="sub">Per day: hours of lessons and hours of work outside class. The break and start time are secondary. The week has to add up to your contract.</p></div>
    ${pose('planning', 'width:84px;height:90px;object-fit:contain;flex-shrink:0')}
  </div>
  ${weekEditor(s.plan, s.contractMin, state.ui.openDay)}`, { foot: nextFoot('Next: time off', 3, !ok, 1) });
}

export function step3() {
  const s = draftSettings();
  const reg = getData().regions[s.region];
  const today = ymd(new Date());
  const list = periodsFor(s).filter((p) => p.to >= today && p.kind !== 'pause').slice(0, 4);
  const pub = upcomingPublic(s.region, today, 4);
  const until = reg ? reg.coveredUntil : '';
  const mon = until ? new Date(until).toLocaleString('en-GB', { month: 'long', year: 'numeric' }) : '';
  return wrap(`
  ${stepHead(3, 'Time off', `School and public holidays are already in for ${esc(regionLabel(s.region))}. Check them, change them, or add your own.`, 'cozy')}
  <div class="label mt14" style="padding:0 6px">School holidays</div>
  <div class="card flat mt6">
    ${list.map((p) => `<div class="lrow" style="min-height:60px"><div class="grow"><div class="name" style="font-size:16px">${esc(p.name)}</div><span class="sub2">${p.from === p.to ? dayMonthLong(p.from) : dayMonth(p.from) + ' to ' + dayMonthLong(p.to)}</span></div><span class="pill green">Official</span></div>`).join('')}
    <div class="lrow" style="min-height:60px"><div class="grow"><div class="name" style="font-size:16px">Later years</div><span class="sub2">Official dates run until ${mon}</span></div><span class="pill sand">Not out yet</span></div>
    <p class="sub" style="font-size:13px;padding:10px 0 12px">Anything not published yet is marked, not guessed. Dates come from ${esc(reg ? reg.source : 'the official calendar')}.</p>
  </div>
  <div class="label mt14" style="padding:0 6px">Public holidays, always off</div>
  <div class="card flat mt6">
    ${pub.map((h) => `<div class="lrow" style="min-height:56px"><div class="grow"><div class="name" style="font-size:16px">${esc(h.name)}</div><span class="sub2">${dayMonthLong(h.date)}</span></div><span class="pill green">Official</span></div>`).join('')}
    <p class="sub" style="font-size:13px;padding:10px 0 12px">The next few are shown. The rest of the year is in too.</p>
  </div>
  <button class="chip mt12" style="width:100%;border-style:dashed;box-shadow:none;color:var(--ink3);min-height:48px" data-a="sheet" data-v="addoff">+ Add your own holiday or vacation</button>
  <p class="sub center mt14" style="font-size:13px">Moving countries? Switch region any time in the staffroom.</p>`, { foot: nextFoot('Next: how I should talk to you', 4, false, 2) });
}

export function step4() {
  const s = draftSettings();
  return wrap(`
  <div style="padding:0 6px"><div class="eyebrow">First day · Step 4 of 4</div>
    <h1 class="title t40" style="margin:4px 0 10px;line-height:1.05">How should I talk to you?</h1>
    <p class="sub">Same teacher, three levels of strictness. You can change this any time.</p></div>
  <div class="mt14" style="display:flex;flex-direction:column;gap:10px">
    ${TONES.map((t) => `<button class="card" data-a="tone" data-v="${t.id}" style="display:flex;align-items:center;gap:12px;text-align:left;padding:10px 14px 10px 10px;${s.tone === t.id ? 'border:2px solid #E8B93D;background:#FBF1D6' : ''}">
      ${pose(t.pose, 'width:84px;height:84px;object-fit:contain;flex-shrink:0')}
      <span class="grow"><span class="title" style="font-size:28px;display:flex;align-items:center;gap:8px">${t.name}${s.tone === t.id ? '<span style="font-family:Nunito;font-size:10px;font-weight:800;letter-spacing:.1em;background:#E8B93D;border-radius:8px;padding:3px 8px">PICKED</span>' : ''}</span><span style="display:block;font-size:14px;line-height:1.3;font-weight:700;margin-top:4px">${t.quote}</span></span></button>`).join('')}
  </div>
  <div class="card mt12 row" style="padding:10px 12px 10px 16px"><div class="grow"><b style="font-size:15px">Kind mode in heavy weeks</b><div class="sub" style="font-size:13px">I stop the teasing when you are well over plan.</div></div>${sw(s.kind, 'kind')}</div>`, { foot: nextFoot('Next: save my register', 'account', false, 3) });
}

const answerChips = (s) => {
  const on = [1, 2, 3, 4, 5, 6, 7].filter((n) => s.plan[n].on);
  const label = on.length === 5 ? 'Mon to Fri plan' : `${on.length}-day plan`;
  return [fmtShort(s.contractMin) + ' per week', regionLabel(s.region).split(',')[0], label, 'Holidays', (TONES.find((t) => t.id === s.tone) || {}).name + ' tone'];
};

export function account() {
  const s = draftSettings();
  return wrap(`
  <div class="hdr tight" style="align-items:flex-end;padding:0 6px">
    <div class="grow" style="padding-bottom:8px"><div class="eyebrow">One last thing</div>
      <h1 class="title t40" style="margin:4px 0 6px">Save your register</h1>
      <p class="sub">So your hours and everything you just told me follow you to every device.</p></div>
    ${pose('planning', 'width:88px;height:94px;object-fit:contain;flex-shrink:0')}
  </div>
  <div class="card mt12" style="background:#FBF1D6;border-color:#EBD9A6">
    <div class="eyebrow">Your answers</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">${answerChips(s).map((c) => `<span class="row" style="gap:6px;background:var(--card);border-radius:10px;padding:6px 10px;font-size:13px;font-weight:800;color:var(--ink)"><span style="color:#3F5C48;display:flex">${ICON.check(14)}</span>${esc(c)}</span>`).join('')}</div>
  </div>
  <p class="sub mt16" style="padding:0 6px">Sign in with your Google account. There is no password to remember.</p>`, {
    foot: `<button class="btn" data-a="google">Continue with Google</button><div class="center"><button class="link" data-a="step" data-v="4">Back</button></div><p class="center muted" style="font-size:12px;font-weight:700">Only you can see your hours.</p>`,
  });
}

export function signinScreen() {
  return wrap(`
  <div style="display:flex;flex-direction:column;align-items:center;flex:1;justify-content:center">
    ${pose('cheeky', 'width:190px;height:208px;object-fit:contain')}
    <h1 class="title t48 center" style="margin-top:6px">Welcome back.</h1>
    <p class="center sub mt10" style="padding:0 30px;font-size:16px">Sign in with the Google account you used to set up Last Bell.</p>
  </div>`, { foot: `<button class="btn" data-a="google">Continue with Google</button><div class="center"><button class="link" data-a="step" data-v="intro">Back</button></div>` });
}

export function splash(msg = '') {
  return `<div class="phone"><div class="splash">${pose('cheeky', 'width:150px;height:164px;object-fit:contain', 'pulse')}<div class="title" style="font-size:44px">Last Bell</div>${msg ? `<p class="sub center" style="padding:0 30px">${msg}</p>` : ''}</div></div>`;
}
export const offlineScreen = () => `<div class="phone"><div class="splash">${pose('alarmed', 'width:150px;height:164px;object-fit:contain')}<div class="title" style="font-size:38px">I cannot reach your register</div><p class="sub center" style="padding:0 30px">Check your connection, then try again. Nothing has been lost.</p><button class="btn" style="width:auto;padding:0 28px;margin-top:10px" data-a="retry">Try again</button></div></div>`;
