import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BrowserWindow, screen } from 'electron';
import {
  ALWAYS_ON_TOP_RELEASE_MS,
  APP_TITLE,
  MAX_WINDOW_HEIGHT,
  MAX_WINDOW_WIDTH,
  WINDOW_BACKGROUND_COLOR,
} from '../constants/app.js';

const SOURCE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const handleWindowKeys = (window) => (event, input) => {
  if (input.type !== 'keyDown') return;
  if (input.key === 'F11') {
    window.setFullScreen(!window.isFullScreen());
    event.preventDefault();
    return;
  }
  if (input.key === 'F12') {
    window.webContents.toggleDevTools();
    event.preventDefault();
  }
};

export const createMainWindow = ({ isFullscreen, onHidden }) => {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const window = new BrowserWindow({
    width: Math.min(MAX_WINDOW_WIDTH, width),
    height: Math.min(MAX_WINDOW_HEIGHT, height),
    fullscreen: isFullscreen,
    frame: false,
    show: false,
    backgroundColor: WINDOW_BACKGROUND_COLOR,
    title: APP_TITLE,
    icon: path.join(SOURCE_DIR, 'icon.ico'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(SOURCE_DIR, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
      autoplayPolicy: 'no-user-gesture-required',
    },
  });
  window.once('ready-to-show', () => window.show());
  window.on('hide', onHidden);
  window.on('minimize', onHidden);
  window.webContents.on('did-start-loading', onHidden);
  window.webContents.on('before-input-event', handleWindowKeys(window));
  return window;
};

export const loadRendererPage = (window) =>
  window.loadFile(path.join(SOURCE_DIR, 'renderer', 'index.html'));

export const isWindowAvailable = (window) => Boolean(window) && !window.isDestroyed();

export const sendToWindow = (window, channel, payload) => {
  if (isWindowAvailable(window)) window.webContents.send(channel, payload);
};

export const restoreMainWindow = (window, isFullscreen) => {
  if (!isWindowAvailable(window)) return;
  if (window.isMinimized()) window.restore();
  window.show();
  if (isFullscreen) window.setFullScreen(true);
  window.setAlwaysOnTop(true);
  window.focus();
  setTimeout(() => {
    if (isWindowAvailable(window)) window.setAlwaysOnTop(false);
  }, ALWAYS_ON_TOP_RELEASE_MS);
};

export const hideMainWindowForGame = (window, shouldHide) => {
  if (!isWindowAvailable(window)) return;
  if (shouldHide) window.hide();
  else window.minimize();
};
