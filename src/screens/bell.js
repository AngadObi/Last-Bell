import { esc, pose, ICON, shelf, sheetShell } from '../ui.js';
import { state, addEntry, toast, catName, CATS, saveSettings, render } from '../lib/store.js';
import { fmtLong, ymd } from '../lib/dates.js';
import { pick } from '../lib/lines.js';

const KEY = 'lastbell.bell';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } };
let T = load() || { cat: 'prep', phase: 'focus', round: 1, running: false, endAt: 0, left: null };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(T)); } catch {} };

const cfg = () => state.settings.bell;
const totalMs = (phase = T.phase) => 60000 * (phase === 'focus' ? cfg().focus : phase === 'break' ? cfg().brk : cfg().long);
export const leftMs = () => (T.running ? Math.max(0, T.endAt - Date.now()) : T.left != null ? T.left : totalMs());
export const bellRunning = () => T.running;

function beep() {
  try {
    if (state.settings.bellSound) {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.35].forEach((t, i) => { const o = ac.createOscillator(); const g = ac.createGain(); o.type = 'sine'; o.frequency.value = i ? 660 : 880; g.gain.setValueAtTime(0.0001, ac.currentTime + t); g.gain.exponentialRampToValueAtTime(0.3, ac.currentTime + t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + t + 0.6); o.connect(g).connect(ac.destination); o.start(ac.currentTime + t); o.stop(ac.currentTime + t + 0.7); });
    }
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  } catch {}
}

function goNext(auto) {
  if (T.phase === 'focus') {
    const long = T.round >= cfg().rounds;
    T.phase = long ? 'long' : 'break';
    T.left = null; T.running = auto; T.endAt = auto ? Date.now() + totalMs() : 0;
  } else {
    T.round = T.phase === 'long' ? 1 : T.round + 1;
    T.phase = 'focus';
    T.left = null; T.running = false; T.endAt = 0;
  }
  save();
}

export function complete() {
  if (T.phase === 'focus') {
    addEntry({ date: ymd(new Date()), cat: T.cat, minutes: cfg().focus, where: 'school', note: '', source: 'bell' });
    beep();
    toast(`${fmtLong(cfg().focus)} of ${catName(T.cat).toLowerCase()} logged for you.`);
    goNext(true);
  } else {
    beep();
    goNext(false);
  }
  render();
}

export function toggle() {
  if (T.running) { T.left = Math.max(0, T.endAt - Date.now()); T.running = false; }
  else { T.endAt = Date.now() + (T.left != null ? T.left : totalMs()); T.left = null; T.running = true; }
  save(); render();
}
export function stop() { T = { ...T, phase: 'focus', running: false, left: null, endAt: 0, round: 1 }; save(); render(); }
export function skip() {
  if (T.phase === 'focus') { const long = T.round >= cfg().rounds; T.phase = long ? 'long' : 'break'; T.left = null; T.running = false; T.endAt = 0; }
  else { T.round = T.phase === 'long' ? 1 : T.round + 1; T.phase = 'focus'; T.left = null; T.running = false; T.endAt = 0; }
  save(); render();
}
export function setCat(id) { T.cat = id; save(); render(); }
export function quickStart() { T = { ...T, phase: 'focus', running: true, left: null, endAt: Date.now() + totalMs('focus') }; save(); }

// called every 250 ms
export function tick() {
  if (!state.settings) return;
  if (T.running && T.endAt <= Date.now()) { complete(); return; }
  const t = document.getElementById('bell-time');
  if (!t) return;
  const l = leftMs();
  const s = Math.ceil(l / 1000);
  t.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const arc = document.getElementById('bell-arc');
  if (arc) arc.setAttribute('stroke-dasharray', `${(l / totalMs()) * 653.45} 654`);
}

export function bell() {
  const s = state.settings;
  const l = leftMs();
  const secs = Math.ceil(l / 1000);
  const clock = `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
  const focus = T.phase === 'focus';
  const color = focus ? 'var(--prep)' : 'var(--lesson)';
  const head = focus ? `Focus round ${T.round} of ${cfg().rounds}` : T.phase === 'long' ? 'Long break' : 'Break';
  const sub = focus ? `LEFT OF ${cfg().focus} MIN` : `LEFT OF ${T.phase === 'long' ? cfg().long : cfg().brk} MIN`;
  const dots = Array.from({ length: cfg().rounds }, (_, i) => {
    const n = i + 1;
    const st = n < T.round || (n === T.round && !focus) ? 'background:var(--lesson)' : n === T.round ? 'border:3px solid var(--prep);background:var(--card)' : 'background:#E4D8BC';
    return `<span style="width:16px;height:16px;border-radius:50%;${st}"></span>`;
  }).join('');
  const line = pick({ tone: s.tone, kind: s.kind, moment: focus ? 'bell' : 'breakTime', seed: String(T.round) + T.phase + ymd(new Date()) });
  const cats = CATS.slice(0, 4).map((c) => `<button class="chip ${T.cat === c.id ? 'on' : ''}" data-a="bell-cat" data-v="${c.id}" style="flex:1;min-width:0;padding:0 6px">${esc(catName(c.id))}</button>`).join('');
  const arc = (l / totalMs()) * 653.45;
  return `<div class="phone"><div class="scroll" style="padding-top:16px">
    <div style="padding:0 20px"><div class="eyebrow">${head}</div><h1 class="title t36" style="margin-top:2px">Bell</h1></div>
    <div class="row mx mt12" style="gap:8px">${cats}</div>
    <div style="position:relative;width:270px;height:270px;margin:14px auto 0">
      <svg width="270" height="270" viewBox="0 0 270 270" aria-hidden="true"><circle cx="135" cy="135" r="124" fill="#FFFCF5" stroke="#E8DCC4" stroke-width="3"/><circle cx="135" cy="135" r="104" fill="none" stroke="#EFE4CC" stroke-width="16"/><circle id="bell-arc" cx="135" cy="135" r="104" fill="none" stroke="${focus ? '#6F93C4' : '#6E9277'}" stroke-width="16" stroke-linecap="round" stroke-dasharray="${arc} 654" transform="rotate(-90 135 135)"/></svg>
      <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">${ICON.bell(26)}<div id="bell-time" class="title" style="font-size:76px;line-height:1">${clock}</div><div style="font-size:12px;font-weight:800;letter-spacing:.1em;color:var(--ink2)">${sub}</div></div></div>
    <div class="row" style="justify-content:center;gap:10px;margin-top:14px">${dots}</div>
    <div class="row" style="justify-content:center;gap:22px;margin-top:16px">
      <button class="round" style="width:60px;height:60px" data-a="bell-stop" aria-label="Stop">${ICON.stop()}</button>
      <button data-a="bell-toggle" aria-label="${T.running ? 'Pause' : 'Start'}" style="width:84px;height:84px;border:0;border-radius:50%;background:var(--gold);box-shadow:0 4px 0 var(--gold-d);display:flex;align-items:center;justify-content:center">${T.running ? ICON.pause() : ICON.play()}</button>
      <button class="round" style="width:60px;height:60px" data-a="bell-skip" aria-label="Skip">${ICON.skip()}</button></div>
    <div class="row mx" style="margin-top:14px;gap:8px;align-items:center"><div class="note grow" style="transform:rotate(-1deg)"><div class="tape"></div>${esc(line)}</div>${pose(focus ? 'focused' : 'cozy', 'width:110px;height:104px;object-fit:contain;flex-shrink:0')}</div>
    <div class="row mx mt12" style="gap:8px;align-items:stretch">${[['Focus', cfg().focus], ['Break', cfg().brk], ['Long break', cfg().long]].map(([n, m]) => `<button class="card grow" data-a="sheet" data-v="bellset" style="text-align:left;padding:10px 12px"><div class="label" style="font-size:10px;letter-spacing:.1em">${n}</div><div class="title" style="font-size:26px">${m} min</div></button>`).join('')}</div>
    <p class="sub center mt10" style="font-size:13px;padding:0 20px">${focus ? `When the round ends, ${cfg().focus} min of ${esc(catName(T.cat).toLowerCase())} is logged for you.` : 'Breaks are not logged. They are just breaks.'}</p>
  </div>${shelf('bell')}</div>`;
}

export function bellSheet() {
  const c = cfg();
  const row = (label, key, step, min, max) => `<div class="spread" style="min-height:60px;border-bottom:1px solid var(--hair)"><span style="font-size:15px;font-weight:800">${label}</span><span class="row"><button class="round sm" data-a="bell-set" data-k="${key}" data-v="-${step}" aria-label="Less">-</button><b style="min-width:64px;text-align:center;font-size:16px">${c[key]} ${key === 'rounds' ? '' : 'min'}</b><button class="round sm" data-a="bell-set" data-k="${key}" data-v="${step}" aria-label="More">+</button></span></div>`;
  return sheetShell('Bell timings', 'Used by the focus timer.', `<div class="card flat mt14">${row('Focus', 'focus', 5, 5, 90)}${row('Break', 'brk', 1, 1, 30)}${row('Long break', 'long', 5, 5, 45)}${row('Rounds before a long break', 'rounds', 1, 2, 8)}</div>`, { foot: `<button class="btn" data-a="close">Done</button>` });
}
export function bellSet(k, d) {
  const lim = { focus: [5, 90], brk: [1, 30], long: [5, 45], rounds: [2, 8] }[k];
  const v = Math.max(lim[0], Math.min(lim[1], state.settings.bell[k] + d));
  saveSettings({ bell: { ...state.settings.bell, [k]: v } });
  if (!T.running) { T.left = null; save(); }
}
