import { DEFAULT_PROFILE_NAME } from '../../constants/ui.js';
import { invokeMain } from '../../core/api.js';
import { hasCommand, runCommand } from '../../core/commands.js';
import { escapeHtml, queryOne } from '../../core/dom.js';
import { isParticlesEnabled } from '../../core/selectors.js';
import { getState, updateState } from '../../core/store.js';
import { setFocusRingEnabled } from '../../ui/focus-ring.js';
import { getGlyphStyle } from '../../ui/glyphs.js';
import { isModalOpen } from '../../ui/modal.js';
import { startParticles, stopParticles } from '../../ui/particles.js';
import { renderTabHints } from '../topbar/topbar.js';
import { resetBackgroundKey, setBackground } from './background.js';

export const syncParticles = () => {
  if (isParticlesEnabled(getState().config)) startParticles();
  else stopParticles();
};

export const applyAppearance = () => {
  const { config, view } = getState();
  const appearance = config.appearance || {};
  const bodyClasses = document.body.classList;
  bodyClasses.toggle('nav-icons', appearance.topNav !== 'labels');
  renderTabHints();
  bodyClasses.toggle('theme-light', appearance.theme === 'light');
  bodyClasses.toggle('no-motion', appearance.motion === false);
  bodyClasses.toggle('no-covers', appearance.coverArt === false);
  bodyClasses.toggle('glyph-ps', getGlyphStyle() === 'playstation');
  setFocusRingEnabled(appearance.motion !== false);
  syncParticles();
  resetBackgroundKey();
  const currentItem =
    view === 'home' && hasCommand('getCurrentHomeItem') ? runCommand('getCurrentHomeItem') : null;
  setBackground(currentItem ? currentItem.game || null : null);
  if (view === 'collections') runCommand('renderCollections');
};

export const setPadType = (padType) => {
  const state = getState();
  if (!padType || padType === state.padType) return;
  updateState({ padType });
  if (state.config.buttonGlyphs !== 'auto') return;
  document.body.classList.toggle('glyph-ps', getGlyphStyle() === 'playstation');
  renderTabHints();
  if (isModalOpen()) return;
  runCommand('updateHints');
  if (getState().view === 'settings') runCommand('renderSettings');
};

export const applyProfile = async () => {
  const { config } = getState();
  const name = config.profileName || DEFAULT_PROFILE_NAME;
  const initial = escapeHtml(name.trim().charAt(0).toUpperCase());
  const avatarUrl = await invokeMain('avatar:url', config.avatar);
  updateState({ avatarUrl });
  const html = avatarUrl
    ? `<img src="${escapeHtml(avatarUrl)}" alt="" draggable="false">`
    : initial;
  for (const element of [queryOne('#top-avatar'), queryOne('.welcome-avatar')]) {
    element.innerHTML = html;
    element.classList.toggle('has-img', Boolean(avatarUrl));
  }
  queryOne('.welcome-name').textContent = name;
};
