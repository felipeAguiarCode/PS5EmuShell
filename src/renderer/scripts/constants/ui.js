export const APP_NAME = 'PS5 Emu Shell';

export const VIEW_NAMES = ['home', 'library', 'collections', 'trophies'];

export const TOAST_KINDS = {
  info: { icon: 'info', category: APP_NAME },
  success: { icon: 'checkCircle', category: APP_NAME },
  error: { icon: 'xCircle', category: APP_NAME, isError: true },
  scan: { icon: 'refresh', category: 'Biblioteca', isBusy: true },
  library: { icon: 'library', category: 'Biblioteca' },
  launchError: { icon: 'xCircle', category: 'Jogo', isError: true },
  crash: { icon: 'alert', category: 'Emulador', isError: true },
  session: { icon: 'trophy', category: 'Sessão de jogo' },
  favAdd: { icon: 'starFill', category: 'Favoritos' },
  favRemove: { icon: 'star', category: 'Favoritos' },
  cover: { icon: 'image', category: 'Capas', isBusy: true },
  coverClear: { icon: 'trash', category: 'Capas' },
  emulator: { icon: 'chip', category: 'Emulador' },
  emuMissing: { icon: 'alert', category: 'Emulador', isError: true },
  padOn: { icon: 'gamepad', category: 'Controle' },
  padOff: { icon: 'gamepadOff', category: 'Controle' },
  collectionNew: { icon: 'folderPlus', category: 'Coleções' },
  collectionAdd: { icon: 'libraryPlus', category: 'Coleções' },
  collectionRemove: { icon: 'libraryMinus', category: 'Coleções' },
  folders: { icon: 'folderCheck', category: 'Instalação' },
  install: { icon: 'download', category: 'Downloads' },
  installFail: { icon: 'download', category: 'Downloads', isError: true },
  systemAdd: { icon: 'plus', category: 'Sistema' },
  optimizing: { icon: 'gauge', category: 'Otimização', isBusy: true },
  optimized: { icon: 'sparkles', category: 'Otimização' },
  avatar: { icon: 'user', category: 'Perfil' },
  pcAdd: { consoleIcon: 'pc', category: 'Jogos de PC' },
  raLogin: { icon: 'trophy', category: 'RetroAchievements' },
  raBusy: { icon: 'trophy', category: 'RetroAchievements', isBusy: true },
  raSync: { icon: 'refresh', category: 'Troféus', isBusy: true },
  raError: { icon: 'trophy', category: 'RetroAchievements', isError: true },
};

export const TOAST_MAX_VISIBLE = 4;
export const TOAST_GAP_PX = 12;
export const TOAST_DEFAULT_MS = 4200;
export const TOAST_ENTER_MS = 460;
export const TOAST_LEAVE_MS = 780;
export const TOAST_FAST_LEAVE_MS = 260;

export const MODAL_CLOSE_MS = 200;
export const LAUNCH_SCREEN_HIDE_MS = 750;
export const BACKGROUND_SWAP_DELAY_MS = 160;
export const BOOT_SCREEN_MS = 2600;
export const BOOT_FADE_MS = 700;
export const WELCOME_FADE_MS = 650;
export const SETUP_CHECK_DELAY_MS = 700;
export const CLOCK_REFRESH_MS = 10000;
export const BATTERY_REFRESH_MS = 30000;
export const CURSOR_HIDE_MS = 2200;
export const CURSOR_MOVE_THRESHOLD_PX = 3;
export const QUIT_FADE_MS = 380;
export const FOCUS_RING_GLIDE_MS = 340;
export const FOCUS_RING_PADDING_PX = 5;
export const MOVE_SOUND_THROTTLE_MS = 35;
export const LOW_BATTERY_LEVEL = 15;
export const MIN_BATTERY_BAR_PERCENT = 4;

export const DEFAULT_PROFILE_NAME = 'Jogador';
export const DEFAULT_VOLUME = 60;
