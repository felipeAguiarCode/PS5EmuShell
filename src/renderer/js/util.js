/* Utilitários compartilhados: ícones, glifos de botões, formatação. */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const svg = (body, extra = '') =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ${extra}>${body}</svg>`;

const Icons = {
  search: svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
  gear: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  power: svg('<path d="M12 3v9"/><path d="M6.3 7.3a8 8 0 1 0 11.4 0"/>'),
  star: svg('<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z"/>'),
  starFill: svg('<path fill="currentColor" d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z"/>'),
  dots: svg('<circle cx="5" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="19" cy="12" r="1.4" fill="currentColor"/>'),
  grid: svg('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'),
  play: svg('<path fill="currentColor" d="M7 4.5v15l12.5-7.5z"/>'),
  folder: svg('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
  image: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>'),
  chip: svg('<rect x="5" y="5" width="14" height="14" rx="2"/><path d="M9 1v4M15 1v4M9 19v4M15 19v4M1 9h4M1 15h4M19 9h4M19 15h4"/>'),
  gamepad: svg('<path d="M6 11h4M8 9v4"/><circle cx="15.5" cy="12" r=".8" fill="currentColor"/><circle cx="18" cy="10" r=".8" fill="currentColor"/><path d="M17.3 5H6.7a4 4 0 0 0-4 3.6l-.6 6.2A2.8 2.8 0 0 0 7 17l1.8-2h6.4l1.8 2a2.8 2.8 0 0 0 4.9-2.2l-.6-6.2A4 4 0 0 0 17.3 5z"/>'),
  clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>'),
  refresh: svg('<path d="M20 11a8 8 0 0 0-14.8-4M4 4v4h4M4 13a8 8 0 0 0 14.8 4M20 20v-4h-4"/>'),
  exit: svg('<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4"/>'),
  expand: svg('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
  chevR: svg('<path d="m9 5 7 7-7 7"/>'),
  chevL: svg('<path d="m15 5-7 7 7 7"/>'),
  sort: svg('<path d="M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  trash: svg('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
  check: svg('<path d="m5 12 5 5 9-10"/>'),
  user: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
  palette: svg('<path d="M12 3a9 9 0 1 0 0 18c1 0 1.5-.8 1.5-1.5 0-1.2-1-1.5-1-2.5S13.3 15 14.5 15H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7.5" r="1"/>'),
  library: svg('<path d="M4 4h4v16H4zM10 4h4v16h-4zM16 5l3.5-1 2.5 15.5-3.5 1z"/>'),
  heart: svg('<path d="M12 20s-7-4.4-9-9a4.8 4.8 0 0 1 9-3 4.8 4.8 0 0 1 9 3c-2 4.6-9 9-9 9z"/>'),
  history: svg('<path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l4 2"/>'),
  alert: svg('<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>'),
  xCircle: svg('<circle cx="12" cy="12" r="9"/><path d="m15 9-6 6M9 9l6 6"/>'),
  checkCircle: svg('<circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.7 2.7L16 9.8"/>'),
  download: svg('<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>'),
  folderPlus: svg('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M12 10.5v5M9.5 13h5"/>'),
  folderCheck: svg('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="m9.3 13.2 2 2 3.6-3.8"/>'),
  libraryPlus: svg('<path d="M4 4h4v16H4zM10 4h4v9"/><path d="M18 14v6M15 17h6"/>'),
  libraryMinus: svg('<path d="M4 4h4v16H4zM10 4h4v9"/><path d="M15 17h6"/>'),
  gamepadOff: svg('<path d="M6 11h4M8 9v4"/><path d="M17.3 5H8M4.1 6.4A4 4 0 0 0 2.7 8.6l-.6 6.2A2.8 2.8 0 0 0 7 17l1.8-2h6.4l1.8 2a2.8 2.8 0 0 0 3.3.6M21.4 13.8l-.4-5.2A4 4 0 0 0 17.3 5"/><path d="m3 3 18 18"/>'),
  sparkles: svg('<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>'),
  trophy: svg('<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>'),
  gauge: svg('<path d="M4.5 18a8.5 8.5 0 1 1 15 0"/><path d="m12 13 4-4.5"/><circle cx="12" cy="13" r="1.3"/>'),
  bolt: svg('<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>'),
  monitor: svg('<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>'),
};

// Silhuetas dos consoles (traço branco), pelo id do sistema. Sistemas novos usam o ícone genérico.
const ConsoleIcons = {
  // PlayStation: console largo com tampa de disco redonda e botões à direita
  psx: svg('<rect x="1.5" y="6" width="21" height="12" rx="2"/><circle cx="9" cy="12" r="4.2"/><circle cx="9" cy="12" r="1"/><path d="M15.5 9.5h4M15.5 12h1.6M18 12h1.5"/><path d="M3.5 18v1.2M20.5 18v1.2"/>'),
  // PlayStation 2: console deitado com ranhuras à esquerda e gaveta de disco
  ps2: svg('<path d="M2 8.5 4 7h18v10H4l-2-1.5z"/><path d="M5 9v6M6.6 9v6M8.2 9v6"/><path d="M10.5 10h9.5"/><path d="M10.5 14.5h3M16.5 14.5h1M18.7 14.5h1"/>'),
  // PSP: portátil largo com tela central, direcional e botões
  psp: svg('<rect x="1" y="6.5" width="22" height="11" rx="5.5"/><rect x="7" y="8.3" width="10" height="7.4" rx="0.8"/><path d="M3.3 12h2.4M4.5 10.8v2.4"/><circle cx="19.6" cy="10.6" r=".55" fill="currentColor"/><circle cx="18.4" cy="12" r=".55" fill="currentColor"/><circle cx="20.8" cy="12" r=".55" fill="currentColor"/><circle cx="19.6" cy="13.4" r=".55" fill="currentColor"/>'),
  // Nintendo DS: dobrável com duas telas
  nds: svg('<rect x="4.5" y="1.8" width="15" height="9.4" rx="1.6"/><rect x="7.5" y="3.4" width="9" height="6.2" rx=".5"/><rect x="4.5" y="12.8" width="15" height="9.4" rx="1.6"/><rect x="8.5" y="14.3" width="7" height="5.8" rx=".5"/><path d="M5.8 17.2h1.6M6.6 16.4V18"/><circle cx="17.8" cy="16.6" r=".5" fill="currentColor"/><circle cx="17.8" cy="18.4" r=".5" fill="currentColor"/>'),
  // GameCube: cubo com alça e tampa de disco
  gc: svg('<path d="M7 5.5V3.8a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v1.7"/><rect x="3.5" y="5.5" width="17" height="15.5" rx="2.4"/><circle cx="12" cy="12.3" r="4.4"/><circle cx="12" cy="12.3" r="1"/><path d="M7 18.6h2.5M14.5 18.6H17"/>'),
  // Game Boy Advance: portátil horizontal com tela central, direcional, A/B e gatilhos
  gba: svg('<path d="M5 6.5h14a4 4 0 0 1 3.5 2.1V15a3.5 3.5 0 0 1-3.5 3.5H5A3.5 3.5 0 0 1 1.5 15V8.6A4 4 0 0 1 5 6.5z"/><rect x="7.2" y="8.5" width="9.6" height="7" rx=".6"/><path d="M3.3 12h2.2M4.4 10.9v2.2"/><circle cx="19.6" cy="11.2" r=".6" fill="currentColor"/><circle cx="18.4" cy="12.8" r=".6" fill="currentColor"/>'),
  // Game Boy Color: portátil vertical
  gbc: svg('<rect x="5.5" y="1.8" width="13" height="20.4" rx="2" ry="2"/><path d="M5.5 19.5c3 0 13 0 13-3"/><rect x="8" y="4" width="8" height="7" rx=".6"/><path d="M8 15h2.6M9.3 13.7v2.6"/><circle cx="15.6" cy="14" r=".6" fill="currentColor"/><circle cx="14.2" cy="15.4" r=".6" fill="currentColor"/>'),
  // NES: console retangular com tampa do cartucho e botões frontais
  nes: svg('<rect x="1.5" y="7" width="21" height="11" rx="1"/><path d="M4 7v3.5h16V7"/><path d="M3.5 13.5h4.5M3.5 15.5h4.5"/><rect x="10" y="13" width="1.8" height="1.2" rx=".3"/><rect x="12.6" y="13" width="1.8" height="1.2" rx=".3"/><path d="M16 15.5h4.5"/>'),
  // SNES: console com corpo arredondado, entrada do cartucho e botões
  snes: svg('<path d="M4.5 7h15a3 3 0 0 1 3 3v5.5a2.5 2.5 0 0 1-2.5 2.5H4a2.5 2.5 0 0 1-2.5-2.5V10a3 3 0 0 1 3-3z"/><rect x="7.5" y="5" width="9" height="4" rx=".8"/><circle cx="6" cy="13.5" r="1.3"/><circle cx="18" cy="13.5" r="1.3"/><path d="M10 14.2h1.2M12.8 14.2H14"/>'),
  // PC (Windows): monitor com base
  pc: svg('<rect x="2" y="3.5" width="20" height="13" rx="1.6"/><path d="M8.5 20.5h7M12 16.5v4"/><path d="M5.5 13.5h4"/>'),
  generic: svg('<path d="M6 11h4M8 9v4"/><circle cx="15.5" cy="12" r=".8" fill="currentColor"/><circle cx="18" cy="10" r=".8" fill="currentColor"/><path d="M17.3 5H6.7a4 4 0 0 0-4 3.6l-.6 6.2A2.8 2.8 0 0 0 7 17l1.8-2h6.4l1.8 2a2.8 2.8 0 0 0 4.9-2.2l-.6-6.2A4 4 0 0 0 17.3 5z"/>'),
};

function consoleIcon(systemId) {
  return ConsoleIcons[systemId] || ConsoleIcons.generic;
}

// Ícones dos botões (PNG, Kenney Input Prompts, CC0) em img/buttons/<estilo>/<botão>.png.
// Os nomes seguem o XInput: a b x y lb rb lt rt ls rs start back guide.
const BUTTON_IMAGES = {
  // Create/Options ficam ilegíveis como ícone pequeno: usam etiqueta de texto.
  playstation: ['a', 'b', 'x', 'y', 'lb', 'rb', 'lt', 'rt', 'ls', 'rs'],
  xbox: ['a', 'b', 'x', 'y', 'lb', 'rb', 'lt', 'rt', 'ls', 'rs', 'start', 'back', 'guide'],
};
const BUTTON_NAMES = {
  playstation: { a: '✕', b: '○', x: '□', y: '△', lb: 'L1', rb: 'R1', lt: 'L2', rt: 'R2', ls: 'L3', rs: 'R3', start: 'OPTIONS', back: 'CREATE', guide: 'PS', lr: '◀ ▶' },
  xbox: { a: 'A', b: 'B', x: 'X', y: 'Y', lb: 'LB', rb: 'RB', lt: 'LT', rt: 'RT', ls: 'LS', rs: 'RS', start: 'Menu', back: 'Exibir', guide: 'Xbox', lr: '◀ ▶' },
};

// 'auto' segue o último controle usado (Xbox → ícones Xbox; DualShock 4/DualSense → PlayStation).
function glyphStyle() {
  const v = (typeof App !== 'undefined' && App.config && App.config.buttonGlyphs) || 'playstation';
  if (v !== 'auto') return v;
  return App.padType === 'xbox' ? 'xbox' : 'playstation';
}

// glyph('a') ou glyph('lb+rb') para mostrar uma combinação lado a lado.
function glyph(btn) {
  const style = glyphStyle();
  return btn
    .split('+')
    .map((b) => {
      const name = BUTTON_NAMES[style][b] || b.toUpperCase();
      if (BUTTON_IMAGES[style].includes(b)) return `<img class="glyph" src="img/buttons/${style}/${b}.png" alt="${esc(name)}" draggable="false">`;
      return `<span class="glyph wide">${esc(name)}</span>`;
    })
    .join('');
}

// Prévia dos botões de face de um estilo específico (usada no seletor das configurações).
function glyphPreview(style) {
  return ['a', 'b', 'x', 'y'].map((b) => `<img class="glyph" src="img/buttons/${style}/${b}.png" alt="" draggable="false">`).join('');
}

function buttonName(btn) {
  const style = glyphStyle();
  return btn.split('+').map((b) => BUTTON_NAMES[style][b] || b.toUpperCase()).join(' + ');
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function fmtDuration(ms) {
  if (!ms) return '—';
  if (ms < 60000) return 'menos de 1 min';
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

function fmtAgo(ts) {
  if (!ts) return 'Nunca jogado';
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Agora mesmo';
  if (min < 60) return `Há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Há ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'Ontem';
  if (d < 30) return `Há ${d} dias`;
  return new Date(ts).toLocaleDateString('pt-BR');
}

function fmtSize(bytes) {
  if (!bytes) return '—';
  const u = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${u[i]}`;
}

function debounce(fn, ms) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const clone = (o) => JSON.parse(JSON.stringify(o));

// Imagem com fade-in ao carregar (listeners delegados abaixo; a CSP bloqueia handlers inline).
function imgTag(src, alt = '') {
  if (!src) return '';
  return `<img src="${esc(src)}" alt="${esc(alt)}" decoding="async" loading="lazy">`;
}
document.addEventListener('load', (e) => e.target.tagName === 'IMG' && e.target.classList.add('loaded'), true);
document.addEventListener(
  'error',
  (e) => {
    if (e.target.tagName !== 'IMG') return;
    const host = e.target.closest('.has-img');
    if (host) host.classList.remove('has-img');
    e.target.remove();
  },
  true
);
