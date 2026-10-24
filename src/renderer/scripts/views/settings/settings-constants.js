import { ICONS } from '../../ui/icons.js';

export const SHORTCUT_COMBOS = [
  'back+start',
  'back+lb',
  'back+rb',
  'lb+rb+start',
  'lb+rb+back',
  'ls+rs',
  'back+ls',
  'start+rs',
  'guide',
].map((value) => ({ v: value }));

export const HOLD_TIMES_MS = [0, 500, 800, 1000, 1500, 2000, 3000];

export const TROPHY_DEFAULTS = {
  tierMode: 'points',
  silverPoints: 10,
  goldPoints: 25,
  silverPct: 30,
  goldPct: 10,
  ultraRarePct: 5,
  veryRarePct: 15,
  rarePct: 50,
};

export const SETTINGS_PAGES = [
  { id: 'general', label: 'Geral', icon: ICONS.gear },
  { id: 'appearance', label: 'Aparência', icon: ICONS.palette },
  { id: 'systems', label: 'Sistemas e emuladores', icon: ICONS.chip },
  { id: 'setup', label: 'Instalação', icon: ICONS.folder },
  { id: 'shortcuts', label: 'Atalhos', icon: ICONS.bolt },
  { id: 'optimize', label: 'Otimização', icon: ICONS.gauge },
  { id: 'retroachievements', label: 'RetroAchievements', icon: ICONS.trophy },
  { id: 'controls', label: 'Controles', icon: ICONS.gamepad },
  { id: 'covers', label: 'Capas', icon: ICONS.image },
  { id: 'library', label: 'Biblioteca', icon: ICONS.library },
  { id: 'about', label: 'Sobre', icon: ICONS.info },
];

export const CONNECTION_NAMES = { usb: 'USB', bt: 'Bluetooth', xinput: 'XInput' };

export const SETTINGS_SAVE_DEBOUNCE_MS = 300;
export const RANGE_RENDER_DELAY_MS = 450;
export const PASSWORD_MASK_MAX_LENGTH = 12;
