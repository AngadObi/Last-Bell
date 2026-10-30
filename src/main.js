import './style.css';
import { state, boot, setRenderer, ui, render, toast, openSheet, closeSheet, setStep, saveDraft, draftSettings, saveSettings, setDay, clearDayOverride, addEntry, updateEntry, deleteEntry, ackTerm, signIn, signOut, retry, resetAll, catName, CATS, ctx } from './lib/store.js';
import { addDays, ymd, weekdayOf, toMin, fromMin } from './lib/dates.js';
import { workMin } from './lib/calc.js';
import { REGIONS, buildTerms, setData, getData } from './lib/holidays.js';
import { intro, step1, step2, step3, step4, account, signinScreen, splash, offlineScreen } from './screens/onboarding.js';
import { home } from './screens/home.js';
import { register } from './screens/register.js';
import { bell, bellSheet, bellSet, tick as bellTick, toggle as bellToggle, stop as bellStop, skip as bellSkip, setCat as bellCat, quickStart } from './screens/bell.js';
import { staffroom, contractSheet, planSheet, regionSheet, holidaysSheet, schoolDatesSheet, termsSheet, toneSheet, reminderSheet, catsSheet, resetSheet } from './screens/staffroom.js';
import { logInit, logSheet, logMinutes, npInit, npSheet, tbInit, tbSheet, aoInit, aoSheet, bankAvailable } from './screens/sheets.js';
import { logged, termDone } from './screens/screens.js';

const root = document.getElementById('app');
const clone = (o) => JSON.parse(JSON.stringify(o));

function pendingTerm() {
  const s = state.settings;
  if (!s) return null;
  const today = ymd(new Date());
  const ended = buildTerms(s).filter((t) => t.to < today);
  const t = ended[ended.length - 1];
  if (!t || t.to < (s.startDate || '') || state.ackTerms[t.id]) return null;
  return t;
}

function sheetHtml() {
  const sh = state.ui.sheet;
  if (!sh) return '';
  switch (sh.name) {
    case 'log': return logSheet(sh);
    case 'notplanned': return npSheet(sh);
    case 'takeback': return tbSheet(sh);
    case 'addoff': return aoSheet(sh);
    case 'contract': return contractSheet(sh);
    case 'plan': return planSheet(sh);
    case 'region': return regionSheet(sh);
    case 'holidays': return holidaysSheet(sh);
    case 'schooldates': return schoolDatesSheet(sh);
    case 'terms': return termsSheet(sh);
    case 'tone': return toneSheet(sh);
    case 'reminder': return reminderSheet(sh);
    case 'cats': return catsSheet(sh);
    case 'reset': return resetSheet(sh);
    case 'bellset': return bellSheet(sh);
  }
  return '';
}

function screenHtml() {
  if (state.phase === 'loading') return splash();
  if (state.phase === 'offline') return offlineScreen();
  if (state.phase === 'welcome') {
    return { intro, 1: step1, 2: step2, 3: step3, 4: step4, account, signin: signinScreen }[state.ui.onboard]?.() || intro();
  }
  const t = pendingTerm();
  if (t) return termDone(t);
  if (state.ui.screen && state.ui.screen.name === 'logged') return logged(state.ui.screen);
  return { desk: home, register, bell, staffroom }[state.ui.tab]();
}

let lastKey = '';
function renderApp() {
  const sc = root.querySelector('.scroll');
  const sheet = root.querySelector('.sheet');
  const keep = { scroll: sc ? sc.scrollTop : 0, sheet: sheet ? sheet.scrollTop : 0, key: lastKey };
  let html = screenHtml();
  const extra = sheetHtml() + (state.ui.toast ? `<div class="toast" role="status">${state.ui.toast}</div>` : '');
  if (extra) html = html.replace(/<\/div>\s*$/, extra + '</div>');
  root.innerHTML = html;
  const key = state.phase + state.ui.tab + state.ui.onboard + (state.ui.screen ? state.ui.screen.name : '');
  lastKey = key;
  const sc2 = root.querySelector('.scroll');
  if (sc2 && keep.key === key) sc2.scrollTop = keep.scroll;
  const sh2 = root.querySelector('.sheet');
  if (sh2 && sheet) sh2.scrollTop = keep.sheet;
}
setRenderer(renderApp);

// ---------- helpers ----------
const sh = () => state.ui.sheet;
const upd = (patch) => { state.ui.sheet = { ...state.ui.sheet, ...patch }; render(); };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const planTarget = () => (sh() && sh().name === 'plan' ? sh().plan : draftSettings().plan);
const afterPlan = () => (sh() && sh().name === 'plan' ? render() : saveDraft({ plan: draftSettings().plan }));
function writeSettings(patch) { return state.phase === 'app' ? saveSettings(patch) : saveDraft(patch); }
const curSettings = () => (state.phase === 'app' ? state.settings : draftSettings());

function fixPlanDay(p) {
  const w = workMin(p);
  if (p.lessonMin > w) p.lessonMin = w;
}

// ---------- actions (clicks) ----------
const A = {
  step: (el) => { const v = el.dataset.v; setStep(/^\d$/.test(v) ? Number(v) : v); },
  'signin-screen': () => setStep('signin'),
  google: () => { if (state.ui.onboard === 'account') setStep('account'); signIn(); },
  retry: () => retry(),
  tab: (el) => ui({ tab: el.dataset.v, sheet: null, screen: null }),
  scrim: (el, ev) => { if (ev.target === el) closeSheet(); },
  close: () => closeSheet(),
  stars: () => toast('A gold star for every day you finish on time.'),
  focus: () => { quickStart(); ui({ tab: 'bell' }); },

  contract: (el) => {
    const d = Number(el.dataset.v);
    if (sh() && sh().name === 'contract') upd({ value: clamp(sh().value + d, 600, 3600) });
    else saveDraft({ contractMin: clamp(draftSettings().contractMin + d, 600, 3600) });
  },
  'contract-save': () => { saveSettings({ contractMin: sh().value }); closeSheet(); toast('Contract updated. Check that your week still adds up.'); },
  country: (el) => saveDraft({ country: el.dataset.v, region: REGIONS[el.dataset.v][0].key }),
  'open-day': (el) => ui({ openDay: state.ui.openDay === Number(el.dataset.v) ? null : Number(el.dataset.v) }),
  'plan-step': (el) => {
    const p = planTarget()[el.dataset.day]; const f = el.dataset.f; const d = Number(el.dataset.v);
    p[f] = f === 'breakMin' ? clamp((p[f] || 0) + d, 0, 120) : clamp((p[f] || 0) + d, 0, workMin(p));
    fixPlanDay(p); afterPlan();
  },
  'plan-add': (el) => { const p = planTarget()[el.dataset.v]; Object.assign(p, { on: true, start: '09:00', end: '12:30', breakMin: 0, lessonMin: 0 }); afterPlan(); },
  'plan-off': (el) => { planTarget()[el.dataset.day].on = false; ui({ openDay: null }); afterPlan(); },
  'plan-save': () => { saveSettings({ plan: sh().plan }); closeSheet(); toast('Your week is saved.'); },
  tone: (el) => saveDraft({ tone: el.dataset.v }),
  kind: () => saveDraft({ kind: !draftSettings().kind }),

  sheet: (el) => {
    const v = el.dataset.v;
    const s = state.settings;
    const m = {
      log: () => logInit(),
      notplanned: () => npInit(el.dataset.d),
      takeback: () => tbInit(),
      addoff: () => aoInit(),
      contract: () => ({ name: 'contract', value: s.contractMin }),
      plan: () => ({ name: 'plan', plan: clone(s.plan), contractMin: s.contractMin }),
      region: () => ({ name: 'region', country: s.country, region: s.region }),
      holidays: () => ({ name: 'holidays', open: null }),
      schooldates: () => ({ name: 'schooldates' }),
      terms: () => ({ name: 'terms' }),
      tone: () => ({ name: 'tone' }),
      cats: () => ({ name: 'cats' }),
      reset: () => ({ name: 'reset', step: 1 }),
      bellset: () => ({ name: 'bellset' }),
    };
    ui({ sheet: m[v](), openDay: null });
  },
  'sheet-reminder': () => ui({ sheet: { name: 'reminder' } }),

  // log
  'log-cat': (el) => upd({ cat: el.dataset.v }),
  'log-set': (el) => upd({ minutes: Number(el.dataset.v) }),
  'log-step': (el) => upd({ minutes: clamp(sh().minutes + Number(el.dataset.v), 15, 960) }),
  'log-mode': (el) => upd({ mode: el.dataset.v }),
  'log-where': (el) => upd({ where: el.dataset.v }),
  'log-save': () => {
    const d = sh(); const mins = logMinutes(d); if (!mins) return;
    const base = { cat: d.cat, minutes: mins, date: d.date, where: d.where, note: d.note.trim(), start: d.mode === 'range' ? d.start : '', end: d.mode === 'range' ? d.end : '' };
    if (d.editId) { const old = state.entries.find((x) => x.id === d.editId); updateEntry({ ...old, ...base }); closeSheet(); toast('Saved.'); return; }
    const e = addEntry(base);
    ui({ sheet: null, screen: { name: 'logged', id: e.id, cat: e.cat, minutes: e.minutes, date: e.date } });
  },
  'log-delete': () => { deleteEntry(sh().editId); closeSheet(); toast('Entry deleted.'); },
  'edit-entry': (el) => { const e = state.entries.find((x) => x.id === el.dataset.v); if (e) ui({ sheet: logInit(e) }); },
  'logged-done': () => ui({ screen: null, tab: 'desk' }),
  'logged-again': () => ui({ screen: null, sheet: logInit() }),

  // not as planned
  'np-mode': (el) => { const d = sh(); const m = el.dataset.v; upd({ mode: m, lessonMin: m === 'extra' && d.lessonMin <= d.planned ? d.planned + 60 : m === 'fewer' && d.lessonMin >= d.planned ? Math.max(0, d.planned - 60) : d.lessonMin }); },
  'np-sub': (el) => upd({ sub: el.dataset.v }),
  'np-step': (el) => upd({ lessonMin: clamp(sh().lessonMin + Number(el.dataset.v), 0, 720) }),
  'np-save': () => {
    const d = sh();
    if (d.mode === 'none') setDay(d.date, { kind: 'none', sub: d.sub, lessonMin: undefined });
    else if (d.lessonMin === d.planned) clearDayOverride(d.date);
    else setDay(d.date, { kind: d.lessonMin > d.planned ? 'extra' : 'fewer', lessonMin: d.lessonMin, sub: undefined });
    closeSheet(); toast('Lessons updated.');
  },
  'np-reset': () => { clearDayOverride(sh().date); closeSheet(); toast('Back to your timetable.'); },

  // take it back
  'tb-date': (el) => upd({ date: el.dataset.v }),
  'tb-step': (el) => upd({ minutes: clamp(sh().minutes + Number(el.dataset.v), 30, 600) }),
  'tb-set': (el) => upd({ minutes: Number(el.dataset.v) }),
  'tb-save': () => {
    const d = sh(); const avail = bankAvailable(d.date); const m = Math.min(d.minutes, avail);
    if (m < 30) return;
    setDay(d.date, { takeback: m }); closeSheet(); toast(`${Math.floor(m / 60)}h ${m % 60 ? (m % 60) + ' min ' : ''}taken back. Enjoy it.`.replace('0h ', ''));
  },
  'tb-undo': () => { setDay(sh().date, { takeback: 0 }); closeSheet(); toast('Put back in the bank.'); },

  // add a day off
  'ao-type': (el) => upd({ type: el.dataset.v }),
  'ao-save': () => {
    const d = sh();
    if (!d.from || !d.to || d.to < d.from) { toast('Check the dates.'); return; }
    if (d.type === 'vacation') {
      const list = [...(curSettings().customOff || []), { id: 'c' + Date.now(), name: (d.label || '').trim() || 'Vacation', from: d.from, to: d.to, kind: 'vacation' }];
      writeSettings({ customOff: list });
    } else {
      for (let x = d.from; x <= d.to; x = addDays(x, 1)) if (workMin(state.settings.plan[weekdayOf(x)]) > 0) setDay(x, { kind: 'none', sub: d.type, lessonMin: undefined });
    }
    closeSheet(); toast('Added.');
  },

  // register
  'reg-mode': (el) => ui({ regMode: el.dataset.v, regOffset: 0 }),
  'reg-nav': (el) => { const n = state.ui.regOffset + Number(el.dataset.v); if (n <= 0) ui({ regOffset: n }); },

  // bell
  'bell-cat': (el) => bellCat(el.dataset.v),
  'bell-toggle': () => bellToggle(),
  'bell-stop': () => bellStop(),
  'bell-skip': () => bellSkip(),
  'bell-set': (el) => bellSet(el.dataset.k, Number(el.dataset.v)),

  // staffroom
  signout: () => signOut(),
  'kind-toggle': () => saveSettings({ kind: !state.settings.kind }),
  'reminder-toggle': () => saveSettings({ reminder: !state.settings.reminder }),
  'sound-toggle': () => saveSettings({ bellSound: !state.settings.bellSound }),
  'tone-set': (el) => { saveSettings({ tone: el.dataset.v }); },
  'rg-country': (el) => upd({ country: el.dataset.v, region: REGIONS[el.dataset.v][0].key }),
  'rg-save': () => { const d = sh(); saveSettings({ country: d.country, region: d.region, hiddenPeriods: [], periodEdits: {}, termEdits: {} }); closeSheet(); toast('Region updated.'); },
  'hol-open': (el) => upd({ open: sh().open === el.dataset.v ? null : el.dataset.v }),
  'hol-toggle': (el) => { const id = el.dataset.v; const h = new Set(state.settings.hiddenPeriods || []); h.has(id) ? h.delete(id) : h.add(id); saveSettings({ hiddenPeriods: [...h] }); },
  'hol-reset': (el) => { const e = { ...state.settings.periodEdits }; delete e[el.dataset.v]; saveSettings({ periodEdits: e }); },
  'hol-del': (el) => { const l = [...state.settings.customOff]; l.splice(Number(el.dataset.v), 1); saveSettings({ customOff: l }); },
  'dates-check': async () => {
    upd({ busy: true, msg: '' });
    try {
      const r = await fetch(`./data/holidays.json?t=${Date.now()}`, { cache: 'no-store' });
      if (!r.ok) throw new Error('bad');
      const j = await r.json();
      const had = getData().fetchedAt;
      setData(j);
      upd({ busy: false, msg: j.fetchedAt !== had ? `Updated to the list from ${j.fetchedAt}.` : 'Already up to date. No new dates have been published.' });
    } catch { upd({ busy: false, msg: 'Could not check right now. Your saved dates still work.' }); }
  },
  'term-reset': (el) => { const e = { ...state.settings.termEdits }; delete e[el.dataset.v]; saveSettings({ termEdits: e }); },
  export: () => exportCsv(),
  'reset-next': () => upd({ step: 2 }),
  'reset-go': async () => { closeSheet(); await resetAll(); },

  'term-ack': () => { const t = pendingTerm(); if (t) ackTerm(t.id); ui({ tab: 'desk' }); },
  'term-ack-reg': () => { const t = pendingTerm(); if (t) ackTerm(t.id); ui({ tab: 'register', regMode: 'term', regOffset: 0 }); },
};

// ---------- inputs (change / input) ----------
const C = {
  region: (el) => saveDraft({ region: el.value }),
  plan: (el) => {
    const p = planTarget()[el.dataset.day]; p[el.dataset.f] = el.value || p[el.dataset.f]; fixPlanDay(p); afterPlan();
  },
  'log-time': (el) => upd({ [el.dataset.f]: el.value }),
  'log-date': (el) => el.value && upd({ date: el.value }),
  'log-note': (el) => { state.ui.sheet.note = el.value; },
  'tb-date': (el) => el.value && upd({ date: el.value }),
  'ao-label': (el) => { state.ui.sheet.label = el.value; },
  'ao-from': (el) => upd({ from: el.value, to: sh().to < el.value ? el.value : sh().to }),
  'ao-to': (el) => upd({ to: el.value }),
  'rg-region': (el) => upd({ region: el.value }),
  'hol-edit': (el) => {
    const id = el.dataset.id; const reg = getData().regions[state.settings.region]; const p = reg.periods.find((x) => x.id === id);
    const cur = (state.settings.periodEdits || {})[id] || { from: p.from, to: p.to };
    const next = { ...cur, [el.dataset.f]: el.value };
    if (next.to < next.from) next.to = next.from;
    saveSettings({ periodEdits: { ...(state.settings.periodEdits || {}), [id]: next } });
  },
  'term-edit': (el) => {
    const id = el.dataset.id; const t = buildTerms(state.settings).find((x) => x.id === id);
    const next = { from: t.from, to: t.to, [el.dataset.f]: el.value };
    if (next.to < next.from) next.to = next.from;
    saveSettings({ termEdits: { ...(state.settings.termEdits || {}), [id]: next } });
  },
  'reminder-time': (el) => el.value && saveSettings({ reminderTime: el.value }),
  'cat-name': (el) => { const n = { ...(state.settings.catNames || {}), [el.dataset.id]: el.value.trim().slice(0, 20) }; if (!n[el.dataset.id]) delete n[el.dataset.id]; state.settings.catNames = n; saveSettings({ catNames: n }); },
};

async function exportCsv() {
  const c = ctx();
  const { dayModel } = await import('./lib/calc.js');
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const out = ['date,type,category,minutes,where,note'];
  for (let d = state.settings.startDate; d <= c.today; d = addDays(d, 1)) {
    const m = dayModel(d, c);
    if (m.lessons + m.credit > 0) out.push([d, m.override && m.override.kind === 'none' ? 'counted day' : 'lessons', '', m.lessons + m.credit, '', (m.override && m.override.sub) || ''].map(q).join(','));
  }
  for (const e of [...state.entries].sort((a, b) => (a.date < b.date ? -1 : 1))) out.push([e.date, 'logged', catName(e.cat), e.minutes, e.where || '', e.note || ''].map(q).join(','));
  const blob = new Blob([out.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `last-bell-${c.today}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  toast('Your hours are downloaded as a CSV file.');
}

root.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-a]');
  if (!el) return;
  const fn = A[el.dataset.a];
  if (fn) fn(el, ev);
});
const onInput = (ev) => {
  const el = ev.target.closest('[data-c]');
  if (!el) return;
  const fn = C[el.dataset.c];
  if (fn) fn(el, ev);
};
root.addEventListener('change', onInput);
root.addEventListener('input', (ev) => { if (ev.target.matches('[data-c="log-note"],[data-c="ao-label"]')) onInput(ev); });
document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && state.ui.sheet) closeSheet(); });

setInterval(bellTick, 250);
setInterval(() => { if (state.phase === 'app' && !state.ui.sheet && !document.hidden) render(); }, 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden && state.phase === 'app') { bellTick(); render(); } });
window.addEventListener('online', render);
window.addEventListener('offline', render);

renderApp();
boot();
