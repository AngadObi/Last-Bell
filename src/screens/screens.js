import { esc, pose, shelf } from '../ui.js';
import { state, ctx, catName } from '../lib/store.js';
import { dayModel, weekSummary, termStats } from '../lib/calc.js';
import { fmtLong, fmtShort, toMin, nowMinutes } from '../lib/dates.js';
import { pick } from '../lib/lines.js';

export function logged(d) {
  const s = state.settings;
  const c = ctx();
  const e = state.entries.find((x) => x.id === d.id) || { cat: d.cat, minutes: d.minutes, date: d.date };
  const tm = dayModel(c.today, c);
  const wk = weekSummary(c);
  const plan = s.plan[tm.wd];
  const end = plan && plan.on ? toMin(plan.end) : 0;
  const left = end - c.now;
  const line = pick({ tone: s.tone, kind: s.kind, heavy: wk.surplus >= 300, moment: 'logged', seed: e.id || '', vars: { dur: fmtLong(e.minutes), cat: catName(e.cat).toLowerCase() } });
  return `<div class="phone"><div class="scroll" style="padding:36px 16px 12px;display:flex;flex-direction:column;align-items:center">
    <span class="stamp">LOGGED</span>
    ${pose('proud', 'width:210px;height:226px;object-fit:contain;margin-top:10px')}
    <div class="note center" style="margin-top:-6px;width:100%;max-width:330px;transform:rotate(-1deg);font-size:15px"><div class="tape" style="left:50%;margin-left:-23px"></div>${esc(line)}</div>
    <div class="card mt20" style="width:100%;padding:4px 16px">
      <div class="lrow" style="min-height:56px"><span class="row grow" style="gap:8px;font-size:14px;font-weight:800"><i class="dot" style="background:var(--prep)"></i>${esc(catName(e.cat))} added</span><span class="title" style="font-size:26px">+${fmtLong(e.minutes)}</span></div>
      <div class="lrow" style="min-height:52px;font-size:13px;font-weight:700"><span class="grow muted">Today</span><span style="font-weight:800">${fmtLong(tm.logged)} of ${fmtLong(tm.planned)}${end && left > 0 ? ` <span style="color:var(--ink2);font-weight:700">· bell in ${fmtLong(left)}</span>` : ''}</span></div>
      <div class="lrow" style="min-height:52px;font-size:13px;font-weight:700"><span class="grow muted">This week</span><span style="font-weight:800">${fmtLong(wk.logged)} of ${fmtLong(wk.dueEff)} <span style="color:var(--ink2);font-weight:700">· ${wk.left > 0 ? fmtLong(wk.left) + ' left' : 'week done'}</span></span></div>
    </div>
  </div>
  <div style="padding:8px 16px calc(18px + env(safe-area-inset-bottom))"><button class="btn" data-a="logged-done">Done</button><button class="btn light" style="margin-top:8px" data-a="logged-again">Log another</button></div></div>`;
}

export function termDone(term) {
  const s = state.settings;
  const c = ctx();
  const st = termStats(c, term);
  const heavy = st.bank >= 300;
  const line = pick({ tone: s.tone, kind: s.kind, heavy, moment: 'term', seed: term.id });
  const tile = (n, l) => `<div class="card" style="padding:10px 14px"><div class="title" style="font-size:34px">${n}</div><div class="label" style="font-size:11px;letter-spacing:.1em;margin-top:2px">${l}</div></div>`;
  return `<div class="phone"><div class="scroll" style="padding:32px 14px 12px;display:flex;flex-direction:column;align-items:center">
    <div class="eyebrow">${esc(term.name)} · ${st.weeks} weeks</div>
    <h1 class="title" style="font-size:52px;margin-top:4px">Term done.</h1>
    ${pose('proud', 'width:170px;height:182px;object-fit:contain;margin-top:8px')}
    <div class="note center" style="margin-top:8px;width:290px;transform:rotate(-1deg);font-size:15px"><div class="tape" style="left:50%;margin-left:-23px"></div>${esc(line)}</div>
    <div class="grid2" style="width:100%;margin-top:18px">${tile(st.bank > 0 ? '+' + fmtShort(st.bank) : '0h', 'FINAL BANK')}${tile(fmtShort(st.takenBack), 'TAKEN BACK')}${tile(st.daysOver, 'DAYS OVER PLAN')}${tile(st.daysOnTime, 'DAYS ON TIME')}</div>
    <p class="sub center mt14" style="font-size:13px;line-height:1.4">Your bank starts the new term at 0h. Everything from this term stays in the Register.</p>
  </div>
  <div style="padding:8px 14px calc(18px + env(safe-area-inset-bottom))"><button class="btn" data-a="term-ack">Start the new term</button><div class="center"><button class="link" data-a="term-ack-reg">See this term in the Register</button></div></div></div>`;
}
