import { esc, pose, ICON, shelf, sheetShell, sw } from '../ui.js';
import { state, CATS, catName, saveSettings } from '../lib/store.js';
import { planTotal } from '../lib/calc.js';
import { fmtLong, fmtShort, dayMonth, dayMonthLong, ymd, addDays } from '../lib/dates.js';
import { TONES } from '../lib/lines.js';
import { COUNTRIES, REGIONS, getData, periodsFor, regionLabel, buildTerms } from '../lib/holidays.js';
import { weekEditor } from './onboarding.js';

const card = (rows) => `<div class="card flat mx" style="margin-top:6px">${rows}</div>`;
const label = (t) => `<div class="eyebrow" style="margin:14px 20px 0">${t}</div>`;
const row = (name, val, a, v = '') => `<button class="lrow" data-a="${a}" data-v="${esc(v)}"><span class="name">${name}</span><span class="val">${val}</span>${ICON.chev()}</button>`;

export function staffroom() {
  const s = state.settings;
  const tone = TONES.find((t) => t.id === s.tone) || TONES[1];
  const on = [1, 2, 3, 4, 5, 6, 7].filter((n) => s.plan[n].on);
  const week = on.length === 5 && on[4] === 5 ? 'Mon to Fri' : `${on.length} days`;
  const online = navigator.onLine;
  const catSum = CATS.slice(0, 3).map((c) => catName(c.id)).join(', ');
  const toggleRow = (name, note, isOn, a, open = '') => `<div class="lrow" style="gap:10px">${open ? `<button data-a="${open}" class="grow" style="border:0;background:transparent;padding:0;text-align:left;min-height:52px"><span class="name" style="display:block">${name}</span><span class="sub2">${note}</span></button>` : `<span class="grow"><span class="name" style="display:block">${name}</span><span class="sub2">${note}</span></span>`}${sw(isOn, a)}</div>`;
  return `<div class="phone"><div class="scroll" style="padding-top:16px">
    <div class="hdr" style="align-items:flex-end"><div style="padding-bottom:6px"><div class="eyebrow">Settings</div><h1 class="title t36" style="margin-top:2px">Staffroom</h1></div>${pose('cozy', 'width:96px;height:78px;object-fit:contain')}</div>
    <div class="card mx row" style="margin-top:8px;gap:12px"><span class="grow"><span style="display:block;font-size:15px;font-weight:800;overflow:hidden;text-overflow:ellipsis">${esc(state.user.email || state.user.name || 'Signed in')}</span><span class="row" style="gap:6px;margin-top:2px;font-size:13px;font-weight:700;color:${online ? '#3F5C48' : 'var(--ink3)'}"><i style="width:8px;height:8px;border-radius:50%;background:${online ? 'var(--lesson)' : '#C9B993'}"></i>${online ? 'Synced' : 'Offline, will sync when you are back'}</span></span><button class="chip" data-a="signout">Sign out</button></div>
    ${label('YOUR CONTRACT')}${card(row('Hours per week', fmtShort(s.contractMin), 'sheet', 'contract') + row('Your real week', week, 'sheet', 'plan') + row('Where I teach', esc(regionLabel(s.region)), 'sheet', 'region'))}
    ${label('TIME OFF')}${card(row('Holidays and vacation', 'Edit', 'sheet', 'holidays') + row('School dates', 'Check for updates', 'sheet', 'schooldates') + row('Term dates', 'Edit', 'sheet', 'terms') + row('Add a day off', 'Vacation, sick, trip', 'sheet', 'addoff'))}
    ${label('MADAM CHONK')}${card(row('Tone', tone.name, 'sheet', 'tone') + toggleRow('Kind mode', 'No teasing in heavy weeks', s.kind, 'kind-toggle') + toggleRow('Prep reminder', `Same evening, ${s.reminderTime}`, s.reminder, 'reminder-toggle', 'sheet-reminder') + toggleRow('Bell sound', 'When a timer round ends', s.bellSound, 'sound-toggle'))}
    ${label('YOUR DATA')}${card(row('Log categories', esc(catSum), 'sheet', 'cats') + row('Export my hours', 'CSV', 'export') + row('Reset everything', '', 'sheet', 'reset'))}
    <p class="center muted" style="margin:16px 20px 0;font-size:12px;font-weight:700">Last Bell 1.0 · Madam Chonk supervises</p>
  </div>${shelf('staffroom')}</div>`;
}

export const contractSheet = (d) => sheetShell('Hours per week', 'Your contract. Changing it means fitting your real week to the new total.', `
  <div class="card mt14" style="padding:14px 16px"><div class="spread"><button class="round" data-a="contract" data-v="-30" aria-label="30 minutes less">-</button><div class="title" style="font-size:68px;white-space:nowrap">${fmtShort(d.value)}</div><button class="round" data-a="contract" data-v="30" aria-label="30 minutes more">+</button></div></div>`, { foot: `<button class="btn" data-a="contract-save">Save</button>` });

export const planSheet = (d) => {
  const ok = planTotal(d.plan) === d.contractMin;
  return sheetShell('Your real week', 'Per day: lessons and work outside class. Break and start time are secondary.', weekEditor(d.plan, d.contractMin, state.ui.openDay), { foot: `<button class="btn" data-a="plan-save" ${ok ? '' : 'disabled'}>${ok ? 'Save my week' : 'Add up to ' + fmtShort(d.contractMin) + ' to save'}</button>` });
};

export const regionSheet = (d) => sheetShell('Where I teach', 'Holidays and public holidays follow your region.', `
  <div class="card mt14" style="padding:14px 16px"><div class="seg">${Object.entries(COUNTRIES).map(([k, v]) => `<button class="${d.country === k ? 'on' : ''}" data-a="rg-country" data-v="${k}">${v}</button>`).join('')}</div>
  <select class="field mt10" data-c="rg-region" aria-label="Region">${REGIONS[d.country].map((r) => `<option value="${r.key}" ${d.region === r.key ? 'selected' : ''}>${r.label}</option>`).join('')}</select>
  <p class="sub mt10" style="font-size:13px">${d.country === 'DE' ? 'Only Hamburg is added so far. More German states can follow.' : 'Noord, Midden and Zuid follow the government school holiday regions.'} Switching region replaces the official holiday list. Your own dates stay.</p></div>`, { foot: `<button class="btn" data-a="rg-save">Save</button>` });

export function holidaysSheet(d) {
  const s = state.settings;
  const today = ymd(new Date());
  const list = periodsFor(s).filter((p) => p.to >= addDays(today, -30));
  const range = (p) => (p.from === p.to ? dayMonthLong(p.from) : `${dayMonth(p.from)} to ${dayMonthLong(p.to)}`);
  const official = list.map((p) => `<div style="border-bottom:1px solid var(--hair)"><div class="lrow" style="border:0"><button class="grow" data-a="hol-open" data-v="${p.id}" style="border:0;background:transparent;text-align:left;padding:0;min-height:56px"><span class="name" style="display:block;font-size:15px">${esc(p.name)}${p.edited ? ' <span class="pill gold" style="padding:2px 8px">Edited</span>' : ''}</span><span class="sub2">${range(p)}</span></button>${sw(!p.hidden, 'hol-toggle', p.id)}</div>
    ${d.open === p.id ? `<div class="row" style="gap:10px;padding:0 0 12px"><input class="field" type="date" value="${p.from}" data-c="hol-edit" data-id="${p.id}" data-f="from" aria-label="From"><input class="field" type="date" value="${p.to}" min="${p.from}" data-c="hol-edit" data-id="${p.id}" data-f="to" aria-label="To">${p.edited ? `<button class="chip" data-a="hol-reset" data-v="${p.id}">Official</button>` : ''}</div>` : ''}</div>`).join('');
  const custom = (s.customOff || []).map((c, i) => `<div class="lrow"><span class="grow"><span class="name" style="display:block">${esc(c.name || 'Vacation')}</span><span class="sub2">${range(c)}</span></span><button class="chip" data-a="hol-del" data-v="${i}" aria-label="Delete ${esc(c.name)}" style="min-height:44px">Delete</button></div>`).join('');
  return sheetShell('Holidays and vacation', 'Official dates from the region calendar. Switch one off if your school does it differently. Your edits never overwrite the official list.', `
  ${custom ? `<div class="label mt14">Yours</div><div class="card flat mt6">${custom}</div>` : ''}
  <div class="label mt14">Official</div><div class="card flat mt6">${official || '<p class="sub" style="padding:12px 0">Nothing listed for this region.</p>'}</div>`, { foot: `<button class="btn light" data-a="sheet" data-v="addoff">+ Add your own</button>` });
}

export function schoolDatesSheet(d) {
  const reg = getData().regions[state.settings.region];
  return sheetShell('School dates', '', `
  <div class="card mt14" style="padding:14px 16px"><div class="eyebrow">Source</div><p class="sub mt6" style="font-size:14px;color:var(--ink)">${esc(reg ? reg.source : 'Not available for this region')}</p>
  <div class="eyebrow mt12">Official dates run until</div><p class="mt6" style="font-size:16px;font-weight:800">${reg ? dayMonthLong(reg.coveredUntil) + ' ' + reg.coveredUntil.slice(0, 4) : '-'}</p>
  <div class="eyebrow mt12">Last updated</div><p class="mt6" style="font-size:16px;font-weight:800">${esc(getData().fetchedAt)}</p></div>
  <p class="sub mt12" style="font-size:13px">Dates after that are marked "Not out yet" and are never guessed. When the state publishes more, they appear here.</p>
  ${d.msg ? `<div class="mt12" style="background:var(--cream);border-radius:14px;padding:10px 14px;font-size:14px;font-weight:700">${esc(d.msg)}</div>` : ''}`, { foot: `<button class="btn" data-a="dates-check" ${d.busy ? 'disabled' : ''}>${d.busy ? 'Checking...' : 'Check for updates'}</button>` });
}

export function termsSheet() {
  const s = state.settings;
  const today = ymd(new Date());
  const terms = buildTerms(s).filter((t) => t.to >= today).slice(0, 3);
  return sheetShell('Term dates', 'Your overtime bank starts again from 0h at the start of each term. These come from the holiday calendar and you can change them.', `
  ${terms.map((t) => `<div class="card mt12" style="padding:12px 16px"><div class="spread"><b style="font-size:16px">${esc(t.name)}</b>${t.edited ? `<button class="chip" data-a="term-reset" data-v="${t.id}" style="min-height:40px">Reset</button>` : ''}</div>
    <div class="row mt8" style="gap:10px"><div class="grow"><div class="label">From</div><input class="field mt6" type="date" value="${t.from}" data-c="term-edit" data-id="${t.id}" data-f="from"></div><div class="grow"><div class="label">To</div><input class="field mt6" type="date" value="${t.to}" data-c="term-edit" data-id="${t.id}" data-f="to"></div></div></div>`).join('') || '<p class="sub mt14">No terms listed yet for this region.</p>'}`, { foot: `<button class="btn" data-a="close">Done</button>` });
}

export const toneSheet = () => sheetShell('Tone', 'How strict Madam Chonk is.', `
  <div class="mt14" style="display:flex;flex-direction:column;gap:10px">${TONES.map((t) => `<button class="card" data-a="tone-set" data-v="${t.id}" style="display:flex;align-items:center;gap:12px;text-align:left;padding:10px 14px 10px 10px;${state.settings.tone === t.id ? 'border:2px solid #E8B93D;background:#FBF1D6' : ''}">${pose(t.pose, 'width:76px;height:76px;object-fit:contain;flex-shrink:0')}<span class="grow"><span class="title" style="font-size:26px;display:block">${t.name}</span><span style="display:block;font-size:14px;line-height:1.3;font-weight:700;margin-top:2px">${t.quote}</span></span></button>`).join('')}</div>`, { foot: `<button class="btn" data-a="close">Done</button>` });

export const reminderSheet = () => sheetShell('Prep reminder', 'If a work day ends with no prep or admin logged, I ask the same evening when you open the app.', `
  <div class="card mt14 spread" style="padding:12px 16px"><b style="font-size:15px">Remind me after</b><input class="time" type="time" value="${state.settings.reminderTime}" data-c="reminder-time" aria-label="Reminder time"></div>`, { foot: `<button class="btn" data-a="close">Done</button>` });

export const catsSheet = () => sheetShell('Log categories', 'Rename them to suit how you think about your week.', `
  <div class="card mt14" style="padding:8px 16px 14px">${CATS.map((c) => `<div class="label mt12">${esc(c.name)}</div><input class="field mt6" value="${esc(catName(c.id))}" data-c="cat-name" data-id="${c.id}" maxlength="20" aria-label="${esc(c.name)} name">`).join('')}</div>`, { foot: `<button class="btn" data-a="close">Done</button>` });

export const resetSheet = (d) => sheetShell('Reset everything', '', `
  <div class="card mt14" style="padding:14px 16px"><p style="font-size:15px;font-weight:700;line-height:1.4">${d.step === 2 ? 'Last chance. Every hour, setting and note will be deleted from this device and from your account.' : 'This deletes all your logged hours, your week, your holidays and your settings, on every device.'}</p></div>`, { foot: d.step === 2 ? `<button class="btn danger" data-a="reset-go">Yes, delete everything</button><div class="center"><button class="link" data-a="close">Keep my register</button></div>` : `<button class="btn danger" data-a="reset-next">I want to start over</button><div class="center"><button class="link" data-a="close">Keep my register</button></div>` });
