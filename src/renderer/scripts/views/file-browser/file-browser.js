import { invokeMain } from '../../core/api.js';
import { registerCommands } from '../../core/commands.js';
import { escapeHtml, queryAll, queryOne } from '../../core/dom.js';
import { formatFileSize } from '../../core/format.js';
import { focusElement, getFocusedElement } from '../../navigation/spatial-navigation.js';
import { renderGlyph } from '../../ui/glyphs.js';
import { ICONS } from '../../ui/icons.js';
import { closeModal, openModal } from '../../ui/modal.js';
import { playSound } from '../../ui/sound.js';
import {
  FILE_BROWSER_PAGE_SIZE,
  buildEntryPath,
  buildNativePickerOptions,
  findBaseName,
  findDefaultTitle,
  findEmptyMessage,
  findStartPath,
  formatEntryCount,
  listFileBrowserHints,
} from './file-browser-model.js';

const PLACE_ICONS = {
  drive: ICONS.chip,
  games: ICONS.gamepad,
  base: ICONS.folder,
  user: ICONS.folder,
  system: ICONS.folder,
};
const MODE_ICONS = { dir: ICONS.folder, image: ICONS.image };
const ENTRY_ICONS = { dir: ICONS.folder, img: ICONS.image };

let browser = null;

const renderPlaceIcon = (kind) => PLACE_ICONS[kind] || ICONS.folder;

const renderPlaces = (places) =>
  places
    .map(
      (place, index) =>
        `<button class="fb-place focusable" data-group="fbplaces" data-p="${index}"><span class="ico">${renderPlaceIcon(place.kind)}</span><span class="n">${escapeHtml(place.label)}</span></button>`,
    )
    .join('');

const renderBrowserHtml = ({ mode, title, places }) =>
  `<div class="fb-head"><div class="fb-ico">${MODE_ICONS[mode] || ICONS.gamepad}</div><div class="fb-titles"><h3>${escapeHtml(title || findDefaultTitle(mode))}</h3>` +
  `<div class="fb-path"></div></div></div>` +
  `<div class="fb-body"><div class="fb-places">${renderPlaces(places)}</div><div class="fb-list"></div></div>` +
  `<div class="fb-foot"><span class="fb-count"></span>` +
  (mode === 'dir'
    ? `<button class="btn-pill focusable fb-use" data-group="fbfoot" data-act="use">${renderGlyph('y')} Usar esta pasta</button>`
    : '') +
  `<button class="btn-pill focusable" data-group="fbfoot" data-act="native">${renderGlyph('x')} Explorer do Windows</button>` +
  `<button class="btn-pill focusable" data-group="fbfoot" data-act="cancel">Cancelar</button></div>`;

const renderEntry = (entry, index) =>
  `<button class="fb-item focusable ${entry.type}" data-group="fblist" data-i="${index}" data-name="${escapeHtml(entry.name)}">` +
  `<span class="ico">${ENTRY_ICONS[entry.type] || ICONS.play}</span><span class="n">${escapeHtml(entry.name)}</span>` +
  `<span class="m">${entry.type === 'dir' ? '' : formatFileSize(entry.size)}</span></button>`;

const renderEntryList = ({ data, mode, limit }) => {
  const shownEntries = data.entries.slice(0, limit);
  const hiddenCount = data.entries.length - shownEntries.length;
  return (
    (data.parent
      ? `<button class="fb-item focusable up" data-group="fblist" data-up="1"><span class="ico">${ICONS.chevL}</span><span class="n">Voltar para ${escapeHtml(data.parent)}</span></button>`
      : '') +
    (data.error ? `<div class="fb-empty">${escapeHtml(data.error)}</div>` : '') +
    shownEntries.map(renderEntry).join('') +
    (hiddenCount > 0
      ? `<button class="fb-item focusable more" data-group="fblist" data-more="1"><span class="ico">${ICONS.plus}</span><span class="n">Mostrar mais ${Math.min(FILE_BROWSER_PAGE_SIZE, hiddenCount)} (de ${hiddenCount})</span></button>`
      : '') +
    (!data.error && !data.entries.length
      ? `<div class="fb-empty">${findEmptyMessage(mode)}</div>`
      : '')
  );
};

const renderBrowser = (focusName) => {
  const { box, data, mode, limit } = browser;
  const list = queryOne('.fb-list', box);
  queryOne('.fb-path', box).textContent = data.dir;
  list.innerHTML = renderEntryList({ data, mode, limit });
  queryOne('.fb-count', box).textContent = formatEntryCount(mode, data.entries);
  list.scrollTop = 0;
  const target =
    (focusName && queryAll('.fb-item', list).find((item) => item.dataset.name === focusName)) ||
    queryOne('.fb-item:not(.up)', list) ||
    queryOne('.fb-item', list) ||
    queryOne('.fb-place', box);
  if (target) focusElement(target, { silent: true });
};

const openFolder = async (dir, focusName) => {
  if (!browser || !browser.box.isConnected) return;
  const focused = getFocusedElement();
  if (browser.dir && focused && focused.dataset.name) {
    browser.focusNameByDir[browser.dir] = focused.dataset.name;
  }
  const data = await invokeMain('fs:list', dir, browser.mode);
  browser.dir = data.dir;
  browser.data = data;
  browser.limit = FILE_BROWSER_PAGE_SIZE;
  renderBrowser(focusName || browser.focusNameByDir[data.dir]);
};

const openParentFolder = () => {
  if (!browser || !browser.data || !browser.data.parent) return false;
  playSound('back');
  openFolder(browser.data.parent, findBaseName(browser.dir));
  return true;
};

const showMoreEntries = () => {
  browser.limit += FILE_BROWSER_PAGE_SIZE;
  const shownCount = queryAll('.fb-item[data-i]', browser.box).length;
  renderBrowser();
  const nextItem = queryOne(`.fb-item[data-i="${shownCount}"]`, browser.box);
  if (nextItem) focusElement(nextItem, { silent: true });
};

const pickElement = async (element) => {
  if (element.classList.contains('fb-place')) {
    return openFolder(browser.places[Number(element.dataset.p)].path);
  }
  if (element.dataset.up) return openParentFolder();
  if (element.dataset.more) return showMoreEntries();
  const entry = browser.data.entries[Number(element.dataset.i)];
  if (!entry) return undefined;
  const fullPath = buildEntryPath(browser.dir, entry.name);
  if (entry.type === 'dir') return openFolder(fullPath);
  playSound('select');
  return closeModal(fullPath);
};

const runFooterAction = async (action) => {
  if (action === 'cancel') return closeModal(null);
  if (action === 'use' && browser.mode === 'dir' && browser.dir) {
    playSound('select');
    return closeModal(browser.dir);
  }
  if (action === 'native') {
    const pickedPath = await invokeMain(
      'dialog:pick',
      buildNativePickerOptions(browser.mode, browser.dir),
    );
    if (pickedPath) closeModal(pickedPath);
  }
  return undefined;
};

const handleBrowserClick = (event) => {
  const actionElement = event.target.closest('[data-act]');
  if (actionElement) {
    runFooterAction(actionElement.dataset.act);
    return;
  }
  const element = event.target.closest('.fb-place, .fb-item');
  if (element) {
    playSound('select');
    pickElement(element);
  }
};

const isBrowserItem = (element) =>
  Boolean(element) &&
  (element.classList.contains('fb-place') || element.classList.contains('fb-item'));

const toggleListAndPlaces = () => {
  const focused = getFocusedElement();
  const isInPlaces = focused && focused.classList.contains('fb-place');
  const target = isInPlaces
    ? queryOne('.fb-item:not(.up)', browser.box) || queryOne('.fb-item', browser.box)
    : queryOne('.fb-place', browser.box);
  if (target) focusElement(target);
};

const handleBrowserButton = (button) => {
  if (!browser) return false;
  if (button === 'a') {
    const focused = getFocusedElement();
    if (!isBrowserItem(focused)) return false;
    playSound('select');
    pickElement(focused);
    return true;
  }
  if (button === 'b') {
    if (openParentFolder()) return true;
    playSound('back');
    closeModal(null);
    return true;
  }
  if (button === 'y' && browser.mode === 'dir') {
    runFooterAction('use');
    return true;
  }
  if (button === 'x') {
    runFooterAction('native');
    return true;
  }
  if (button === 'lb' || button === 'rb') {
    toggleListAndPlaces();
    return true;
  }
  return false;
};

const handleBrowserKey = (event) => {
  if (event.target.tagName === 'INPUT') return false;
  if (event.key === 'Backspace') {
    openParentFolder();
    return true;
  }
  if (event.key === 'Escape') {
    closeModal(null);
    return true;
  }
  return false;
};

export const openFileBrowser = async ({ mode = 'exe', title, start } = {}) => {
  const places = await invokeMain('fs:places');
  browser = {
    mode,
    places,
    dir: null,
    data: null,
    limit: FILE_BROWSER_PAGE_SIZE,
    focusNameByDir: {},
    box: null,
  };
  const startPath = findStartPath({ mode, start, places });
  const result = openModal({
    className: 'file-browser',
    html: renderBrowserHtml({ mode, title, places }),
    hints: listFileBrowserHints(mode),
    onMount: (box) => {
      browser.box = box;
      box.addEventListener('click', handleBrowserClick);
    },
    onButton: handleBrowserButton,
    onKey: handleBrowserKey,
  });
  if (startPath) await openFolder(startPath);
  return result;
};

export const initFileBrowser = () => {
  registerCommands({ openFileBrowser });
};
