import { DEFAULT_PLAN, SAMPLE_PLAN, makeCtx } from './calc.js';
import { addDays, nowMinutes, weekStart, ymd } from './dates.js';
import { makeDemoBackend } from './backend-demo.js';

export const CATS = [
  { id: 'prep', name: 'Prep' }, { id: 'marking', name: 'Marking' }, { id: 'admin', name: 'Admin' },
  { id: 'parents', name: 'Parents' }, { id: 'meetings', name: 'Meetings' }, { id: 'other', name: 'Other' },
];

export function defaultSettings() {
  return {
    contractMin: 2340, country: 'DE', region: 'DE-HH', plan: DEFAULT_PLAN(),
    tone: 'classic', kind: true, reminder: true, reminderTime: '19:00', bellSound: false,
    bell: { focus: 25, brk: 5, long: 15, rounds: 4 },
    catNames: {}, customOff: [], hiddenPeriods: [], periodEdits: {}, termEdits: {},
    onboarded: false, startDate: ymd(new Date()),
  };
}

const DRAFT_KEY = 'lastbell.draft';
const readDraft = () => { try { return JSON.parse(localStorage.getItem(DRAFT_KEY)); } catch { return null; } };
const writeDraft = (d) => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch {} };
const clearDraft = () => { try { localStorage.removeItem(DRAFT_KEY); } catch {} };

const params = new URLSearchParams(location.search);
export const DEMO = params.has('demo');

export const state = {
  phase: 'loading', // loading | welcome | app | offline
  user: null, settings: null, days: {}, entries: [], ackTerms: {},
  today: ymd(new Date()),
  ui: { tab: 'desk', sheet: null, toast: '', onboard: 'intro', regMode: 'week', regOffset: 0, screen: null },
  draft: null,
};

let renderFn = () => {};
export const setRenderer = (f) => { renderFn = f; };
export const render = () => renderFn();
export const toast = (msg, ms = 2600) => {
  state.ui.toast = msg; render();
  clearTimeout(toast.t);
  toast.t = setTimeout(() => { state.ui.toast = ''; render(); }, ms);
};
export const ui = (patch) => { Object.assign(state.ui, patch); render(); };
export const openSheet = (name, data = {}) => ui({ sheet: { name, ...data } });
export const closeSheet = () => ui({ sheet: null });

let backend = null;
let detach = null;
let waitTimer = null;

export function ctx(extra = {}) {
  state.today = ymd(new Date());
  return makeCtx({ settings: state.settings, days: state.days, entries: state.entries, today: state.today, now: nowMinutes(), ...extra });
}

export function catName(id) {
  const s = state.settings || {};
  const base = CATS.find((c) => c.id === id);
  return (s.catNames && s.catNames[id]) || (base && base.name) || id;
}

// ---- draft (onboarding answers kept on this device until she signs in) ----
export function draftSettings() {
  if (!state.draft) {
    const saved = readDraft();
    state.draft = saved && saved.settings && saved.v === 2 ? saved : { v: 2, settings: defaultSettings(), step: 'intro' };
    state.draft.settings = { ...defaultSettings(), ...state.draft.settings };
    state.draft.settings.plan = { ...DEFAULT_PLAN(), ...state.draft.settings.plan };
  }
  return state.draft.settings;
}
export function saveDraft(patch = {}) {
  draftSettings();
  Object.assign(state.draft.settings, patch);
  writeDraft(state.draft);
  render();
}
export function setStep(step) {
  draftSettings();
  state.draft.step = step;
  writeDraft(state.draft);
  state.ui.onboard = step;
  render();
}

// ---- boot ----
export async function boot(b) {
  backend = b || (DEMO ? makeDemoBackend({ seeded: !params.has('empty'), today: state.today, initialDoc: { settings: { ...defaultSettings(), plan: SAMPLE_PLAN(), onboarded: true, startDate: addDays(weekStart(state.today), -35) }, days: {}, ackTerms: {}, createdAt: Date.now(), email: 'you@school.de' } }) : (await import('./backend-firebase.js')).backend);
  draftSettings();
  state.ui.onboard = state.draft.step === 'account' || state.draft.step === 'signin' ? state.draft.step : state.draft.step || 'intro';
  backend.start(async (user) => {
    if (detach) { detach(); detach = null; }
    clearTimeout(waitTimer);
    if (!user) {
      Object.assign(state, { user: null, settings: null, days: {}, entries: [], ackTerms: {}, phase: 'welcome' });
      render();
      return;
    }
    state.user = { uid: user.uid, email: user.email, name: user.displayName };
    state.phase = 'loading';
    render();
    let created = false;
    let gotDoc = false;
    detach = backend.attach(user.uid, {
      onDoc: async (data, meta) => {
        if (!data) {
          // A cached "no document" can be stale on a new device: only trust the server.
          if (meta.fromCache) return;
          if (created) return;
          const d = readDraft();
          if (d && d.settings && d.step === 'account') {
            created = true;
            const s = { ...defaultSettings(), ...d.settings, onboarded: true, startDate: ymd(new Date()) };
            await backend.createUser(user.uid, { settings: s, days: {}, ackTerms: {}, createdAt: Date.now(), email: user.email || '' });
            clearDraft();
            state.draft = null;
          } else {
            state.phase = 'welcome';
            state.ui.onboard = 'intro';
            render();
          }
          return;
        }
        gotDoc = true;
        clearTimeout(waitTimer);
        state.settings = { ...defaultSettings(), ...data.settings };
        state.settings.plan = { ...DEFAULT_PLAN(), ...(data.settings && data.settings.plan) };
        state.settings.bell = { ...defaultSettings().bell, ...(data.settings && data.settings.bell) };
        state.days = data.days || {};
        state.ackTerms = data.ackTerms || {};
        if (state.phase !== 'app') state.ui.tab = 'desk';
        state.phase = 'app';
        render();
      },
      onEntries: (list) => { state.entries = list; render(); },
      onError: () => { state.phase = 'offline'; render(); },
    });
    waitTimer = setTimeout(() => { if (!gotDoc && state.phase === 'loading') { state.phase = 'offline'; render(); } }, 9000);
  });
}

export const signIn = async () => {
  try { await backend.signIn(); } catch (e) {
    if (e && e.code === 'auth/popup-closed-by-user') return;
    toast('Sign-in did not work. Please try again.');
  }
};
export const signOut = async () => { await backend.signOut(); state.ui = { ...state.ui, sheet: null, tab: 'desk' }; };
export const retry = () => location.reload();

// ---- writes (all signed-in) ----
const uid = () => state.user && state.user.uid;
export function saveSettings(patch) {
  state.settings = { ...state.settings, ...patch };
  render();
  return backend.saveSettings(uid(), state.settings);
}
export function setDay(date, patch) {
  const cur = { ...(state.days[date] || {}), ...patch };
  for (const k of Object.keys(cur)) if (cur[k] === undefined || cur[k] === null || cur[k] === 0 || cur[k] === '') delete cur[k];
  const empty = Object.keys(cur).length === 0;
  const days = { ...state.days };
  if (empty) delete days[date]; else days[date] = cur;
  state.days = days;
  render();
  return backend.setDay(uid(), date, empty ? null : cur);
}
export function clearDayOverride(date) {
  const cur = { ...(state.days[date] || {}) };
  delete cur.kind; delete cur.lessonMin; delete cur.sub;
  const days = { ...state.days };
  if (Object.keys(cur).length) days[date] = cur; else delete days[date];
  state.days = days;
  render();
  return backend.setDay(uid(), date, Object.keys(cur).length ? cur : null);
}
export function addEntry(e) {
  const entry = { id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2)), createdAt: Date.now(), ...e };
  state.entries = [...state.entries, entry];
  render();
  backend.addEntry(uid(), entry);
  return entry;
}
export function updateEntry(e) {
  state.entries = state.entries.map((x) => (x.id === e.id ? e : x));
  render();
  return backend.updateEntry(uid(), e);
}
export function deleteEntry(id) {
  state.entries = state.entries.filter((x) => x.id !== id);
  render();
  return backend.deleteEntry(uid(), id);
}
export function ackTerm(id) {
  state.ackTerms = { ...state.ackTerms, [id]: true };
  render();
  return backend.setAck(uid(), id);
}
export async function resetAll() {
  await backend.resetAll(uid());
  clearDraft();
  state.draft = null;
  await backend.signOut();
  state.settings = null; state.days = {}; state.entries = [];
  state.ui.onboard = 'intro';
  state.phase = 'welcome';
  render();
}
export const addDaysS = addDays;
