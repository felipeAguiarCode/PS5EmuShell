import {
  BATTERY_REFRESH_MS,
  CLOCK_REFRESH_MS,
  LOW_BATTERY_LEVEL,
  MIN_BATTERY_BAR_PERCENT,
  VIEW_NAMES,
} from '../../constants/ui.js';
import { invokeMain } from '../../core/api.js';
import { runCommand } from '../../core/commands.js';
import { escapeHtml, queryAll, queryOne } from '../../core/dom.js';
import { formatClockTime } from '../../core/format.js';
import { getState } from '../../core/store.js';
import { renderGlyph } from '../../ui/glyphs.js';
import { ICONS } from '../../ui/icons.js';
import { playSound } from '../../ui/sound.js';

const TAB_ICONS = {
  home: ICONS.gamepad,
  library: ICONS.grid,
  collections: ICONS.library,
  trophies: ICONS.trophy,
};

const TOP_COMMAND_ICONS = {
  add: ICONS.plus,
  search: ICONS.search,
  settings: ICONS.gear,
  power: ICONS.power,
};

export const findNextView = (currentView, step) =>
  VIEW_NAMES[VIEW_NAMES.indexOf(currentView) + step];

export const cycleTab = (step) => {
  const nextView = findNextView(getState().view, step);
  if (!nextView) {
    playSound('edge');
    return;
  }
  playSound('move');
  runCommand('setView', nextView);
};

export const renderTabHints = () => {
  queryAll('.tab-hint').forEach((hint) => {
    hint.innerHTML = renderGlyph(Number(hint.dataset.step) < 0 ? 'lt' : 'rt');
  });
};

const buildTabs = () => {
  queryAll('.tab').forEach((tab) => {
    const label = tab.textContent.trim();
    tab.title = label;
    tab.setAttribute('aria-label', label);
    tab.innerHTML = `<span class="tab-ico">${TAB_ICONS[tab.dataset.view]}</span><span class="tab-lbl">${escapeHtml(label)}</span>`;
  });
  const tabs = queryOne('.tabs');
  tabs.insertAdjacentHTML('afterbegin', `<span class="tab-hint" data-step="-1"></span>`);
  tabs.insertAdjacentHTML('beforeend', `<span class="tab-hint" data-step="1"></span>`);
  queryAll('.tab-hint', tabs).forEach((hint) =>
    hint.addEventListener('click', () => cycleTab(Number(hint.dataset.step))),
  );
};

const renderTopCommandIcons = () => {
  for (const [command, icon] of Object.entries(TOP_COMMAND_ICONS)) {
    queryOne(`[data-cmd="${command}"]`).innerHTML = icon;
  }
};

export const initTopbar = () => {
  buildTabs();
  renderTopCommandIcons();
};

export const bindTopbar = ({ onDismissWelcome }) => {
  queryAll('.tab').forEach((tab) =>
    tab.addEventListener('click', () => {
      if (getState().view === tab.dataset.view) return;
      playSound('select');
      runCommand('setView', tab.dataset.view);
    }),
  );
  queryOne('[data-cmd="add"]').addEventListener('click', () => runCommand('openAddGamesMenu'));
  queryOne('[data-cmd="search"]').addEventListener('click', () => runCommand('openLibrarySearch'));
  queryOne('[data-cmd="settings"]').addEventListener('click', () => runCommand('openSettings'));
  queryOne('[data-cmd="power"]').addEventListener('click', () => runCommand('openPowerMenu'));
  queryOne('#app').addEventListener('navfocus', () => runCommand('updateHints'));
  queryOne('#welcome').addEventListener('click', onDismissWelcome);
};

const renderClock = () => {
  queryOne('#clock').textContent = formatClockTime(new Date());
};

const renderBattery = async () => {
  const battery = await invokeMain('battery:get');
  const element = queryOne('#battery');
  element.classList.toggle('hidden', !battery);
  if (!battery) return;
  queryOne('.bat-pct', element).textContent = `${battery.level}%`;
  queryOne('.bat-bar i', element).style.width =
    `${Math.max(MIN_BATTERY_BAR_PERCENT, battery.level)}%`;
  element.classList.toggle('charging', battery.charging);
  element.classList.toggle('low', !battery.charging && battery.level <= LOW_BATTERY_LEVEL);
  element.title = `Bateria ${battery.level}%${battery.charging ? ' · carregando' : ''}`;
};

export const startTopbarTimers = () => {
  renderClock();
  setInterval(renderClock, CLOCK_REFRESH_MS);
  renderBattery();
  setInterval(renderBattery, BATTERY_REFRESH_MS);
};
