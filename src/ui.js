// Small view helpers shared by all screens.
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const base = import.meta.env.BASE_URL || './';
export const POSES = {
  teaching: 'Madam Chonk with glasses, holding a pointer', cozy: 'Madam Chonk reading under a green blanket with a mug of tea',
  planning: 'Madam Chonk holding a checklist with a lightbulb', proud: 'Madam Chonk hugging a blue book with sparkles',
  smug: 'Madam Chonk with a smug closed-eye smile', focused: 'Madam Chonk at a laptop with a stack of books',
  loving: 'Madam Chonk hugging a red heart', strict: 'Madam Chonk looking stern with a pointer', cheeky: 'Madam Chonk winking and waving',
  napping: 'Madam Chonk asleep', alarmed: 'Madam Chonk looking alarmed', overwhelmed: 'Madam Chonk looking overwhelmed',
  curious: 'Madam Chonk looking curious', triumphant: 'Madam Chonk looking triumphant',
};
const FILE = { cozy: 'cozy-reading' };
export const pose = (name, style = '', cls = '') => `<img class="${cls}" src="${base}poses/${FILE[name] || name}.webp" alt="${esc(POSES[name] || 'Madam Chonk')}" style="${style}">`;

const S = (d, w = 2, size = 24) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
export const ICON = {
  desk: (z) => S('<path d="M12 8c-2.2-2.2-6.5-1.2-6.5 3.8 0 4 3 7.7 6.5 7.7s6.5-3.7 6.5-7.7C18.5 6.8 14.2 5.8 12 8z"/><path d="M12 8c0-2 .8-3.300 2.200-4.200"/>', 2, z || 26),
  register: (z) => S('<path d="M3 6c3-1 6-1 9 1 3-2 6-2 9-1v13c-3-1-6-1-9 1-3-2-6-2-9-1z"/><path d="M12 7v13"/>', 2, z || 26),
  bell: (z) => S('<path d="M6 17h12l-1.5-2V10a4.5 4.5 0 0 0-9 0v5z"/><path d="M10 20a2 2 0 0 0 4 0"/><path d="M12 4v1.5"/>', 2, z || 26),
  staffroom: (z) => S('<path d="M5 9h11v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z"/><path d="M16 11h2a2 2 0 0 1 0 4h-2"/><path d="M8.5 4.5c0 1 1 1 1 2M12.5 4.5c0 1 1 1 1 2"/>', 2, z || 26),
  sick: (z) => S('<path d="M14 14.500V5a2 2 0 0 0-4 0v9.500a4 4 0 1 0 4 0z"/><path d="M12 9v6"/>', 2.2, z || 24),
  pencil: (z) => S('<path d="M4 20l1-4L16 5l3 3L8 19z"/><path d="M14 7l3 3"/><path d="M14 20h6"/>', 2.2, z || 28),
  close: (z) => S('<path d="M6 6l12 12M18 6L6 18"/>', 2.6, z || 18),
  chev: () => `<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="#9A8B74" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>`,
  left: () => S('<path d="M15 5l-7 7 7 7"/>', 2.6, 20),
  right: () => S('<path d="M9 5l7 7-7 7"/>', 2.6, 20),
  check: (z) => S('<path d="M5 12.5l4.5 4.5L19 7"/>', 3.2, z || 18),
  down: () => S('<path d="M6 9l6 6 6-6"/>', 2.6, 16),
  star: () => `<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5L2.5 9.3l6.6-.8z" fill="#E8B93D" stroke="#C9972A" stroke-width="1.4" stroke-linejoin="round"/></svg>`,
  prep: () => S('<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/>'),
  marking: () => S('<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>'),
  admin: () => S('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
  parents: () => S('<path d="M4 5h16v11H9l-5 4z"/>'),
  meetings: () => S('<circle cx="9" cy="9" r="3"/><circle cx="17" cy="10" r="2.3"/><path d="M3 19c0-3.500 2.700-5.500 6-5.500s6 2 6 5.500M15.500 14.200c3 0 5 1.600 5 4.800"/>'),
  other: () => S('<circle cx="5" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="19" cy="12" r="1.2" fill="currentColor"/>', 2),
  stop: () => `<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/></svg>`,
  pause: () => `<svg width="34" height="34" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1.2" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1.2" fill="currentColor"/></svg>`,
  play: () => `<svg width="34" height="34" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7z" fill="currentColor"/></svg>`,
  skip: () => `<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5l9 7-9 7z" fill="currentColor"/><rect x="16.500" y="5" width="2.500" height="14" rx="1" fill="currentColor"/></svg>`,
  monitor: () => S('<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>'),
};

export const shelf = (tab) => {
  const item = (id, label) => `<button data-a="tab" data-v="${id}" class="${tab === id ? 'on' : ''}" aria-label="${label}"><span class="ico">${ICON[id]()}</span>${label.toUpperCase()}</button>`;
  return `<nav class="shelf">${item('desk', 'Desk')}${item('register', 'Register')}${item('bell', 'Bell')}${item('staffroom', 'Staffroom')}</nav>`;
};

export const sheetShell = (title, sub, body, { foot = '', close = true } = {}) => `
<div class="scrim" data-a="scrim"><div class="sheet" role="dialog" aria-label="${esc(title)}">
  <div class="grab"></div>
  <div class="spread mt10" style="align-items:flex-start">
    <div><h1 class="title" style="font-size:38px">${esc(title)}</h1>${sub ? `<div class="sub mt6">${sub}</div>` : ''}</div>
    ${close ? `<button class="xbtn" data-a="close" aria-label="Close">${ICON.close()}</button>` : ''}
  </div>
  ${body}
  ${foot ? `<div class="mt16">${foot}</div>` : ''}
</div></div>`;

export const sw = (on, a, v = '') => `<button class="sw ${on ? 'on' : ''}" role="switch" aria-checked="${on}" data-a="${a}" data-v="${esc(v)}"><span><i></i></span></button>`;
export const pad2 = (n) => String(n).padStart(2, '0');
