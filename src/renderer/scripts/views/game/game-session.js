import { invokeMain } from '../../core/api.js';
import { runCommand } from '../../core/commands.js';
import { delay, escapeHtml, queryOne } from '../../core/dom.js';
import { formatDuration } from '../../core/format.js';
import { storeGameStats } from '../../core/persistence.js';
import {
  findEmulatorForGame,
  findGame,
  formatComboId,
  isParticlesEnabled,
  resolveParticleLevel,
} from '../../core/selectors.js';
import { getState, updateState } from '../../core/store.js';
import { findConsoleIcon } from '../../ui/console-icons.js';
import { renderGlyph } from '../../ui/glyphs.js';
import { ICONS } from '../../ui/icons.js';
import {
  endLaunchScreen,
  setLaunchSubtitle,
  showLaunchCover,
  startLaunchAnimation,
} from '../../ui/launch-screen.js';
import { closeModal, getTopModal, openModal } from '../../ui/modal.js';
import { startParticles, stopParticles } from '../../ui/particles.js';
import { playSound } from '../../ui/sound.js';
import { showToast } from '../../ui/toast.js';
import { focusElement, getNavScope } from '../../navigation/spatial-navigation.js';

const LAUNCH_ERROR_DELAY_MS = 600;
const STOP_PARTICLES_AFTER_LAUNCH_MS = 1200;
const STOP_PARTICLES_AFTER_RESUME_MS = 800;
const CRASH_WINDOW_MS = 5000;
const LONG_SESSION_MS = 60000;
const OVERLAY_EXTERNAL_CLOSE = '__external';
const OVERLAY_HINTS = [
  ['a', 'Selecionar'],
  ['b', 'Retomar'],
];

const stopParticlesWhileRunning = (delayMs) =>
  setTimeout(() => {
    if (getState().isGameRunning) stopParticles();
  }, delayMs);

const restoreParticles = () => {
  const { config } = getState();
  if (isParticlesEnabled(config)) startParticles(resolveParticleLevel(config));
};

const findRunningGame = () => {
  const state = getState();
  return findGame(state, state.runningGameId);
};

export const launchGame = async (game, fromElement) => {
  const state = getState();
  if (state.isGameRunning || state.isLaunching || !game) return;
  updateState({ isLaunching: true });
  const fromRect = fromElement ? fromElement.getBoundingClientRect() : null;
  playSound('launch');
  startLaunchAnimation(game, fromRect);
  const result = await invokeMain('game:launch', game.id);
  if (!result.ok) {
    await delay(LAUNCH_ERROR_DELAY_MS);
    endLaunchScreen();
    updateState({ isLaunching: false });
    showToast('Não foi possível iniciar o jogo', result.error, {
      kind: 'launchError',
      ms: 6500,
      image: game.cover,
    });
    return;
  }
  storeGameStats(game.id, result.stats);
  updateState({ isGameRunning: true, runningGameId: game.id, isLaunching: false });
  const comboId = formatComboId(getState().config.killCombo);
  setLaunchSubtitle(
    `${escapeHtml(result.emulatorName)} · segure ${renderGlyph(comboId)} para fechar o jogo`,
  );
  stopParticlesWhileRunning(STOP_PARTICLES_AFTER_LAUNCH_MS);
};

const showResumeCover = () => {
  const game = findRunningGame();
  const comboId = formatComboId(getState().config.homeCombo);
  showLaunchCover(
    game ? game.title : '',
    `Retomando o jogo · segure ${renderGlyph(comboId)} para voltar ao launcher`,
  );
  stopParticlesWhileRunning(STOP_PARTICLES_AFTER_RESUME_MS);
};

const resumeGame = () => {
  updateState({ isOverlayOpen: false });
  showResumeCover();
  invokeMain('game:resume');
};

const renderOverlayHtml = (game, emulator) => {
  const { config } = getState();
  const art =
    game && game.cover
      ? `<img src="${escapeHtml(game.cover)}" alt="">`
      : `<span>${findConsoleIcon(game ? game.system : '')}</span>`;
  return (
    `<div class="ov-head">${art}` +
    `<div><div class="ov-k">Em jogo</div><h3>${escapeHtml(game ? game.title : 'Jogo em execução')}</h3><div class="sub">${escapeHtml(emulator.name || '')}</div></div></div>` +
    `<button class="menu-item focusable" data-group="ov" data-v="resume"><span class="ico">${ICONS.play}</span><span>Retomar jogo</span><span class="r">${renderGlyph(formatComboId(config.homeCombo))}</span></button>` +
    `<button class="menu-item focusable" data-group="ov" data-v="kill"><span class="ico">${ICONS.power}</span><span>Fechar jogo</span><span class="r">${renderGlyph(formatComboId(config.killCombo))}</span></button>`
  );
};

export const openOverlay = async () => {
  if (getState().isOverlayOpen) return;
  updateState({ isOverlayOpen: true });
  const game = findRunningGame();
  const emulator = game ? findEmulatorForGame(getState(), game) : {};
  endLaunchScreen();
  restoreParticles();
  playSound('open');
  const choice = await openModal({
    className: 'overlay-menu',
    html: renderOverlayHtml(game, emulator),
    hints: OVERLAY_HINTS,
    onMount: (box) =>
      box.addEventListener('click', (event) => {
        const button = event.target.closest('[data-v]');
        if (!button) return;
        playSound('select');
        closeModal(button.dataset.v);
      }),
  });
  if (choice === OVERLAY_EXTERNAL_CLOSE) return;
  if (choice === 'kill') {
    updateState({ isOverlayOpen: false });
    showLaunchCover(game ? game.title : '', 'Fechando o jogo…');
    invokeMain('game:kill');
    return;
  }
  resumeGame();
};

const closeOverlayMenu = () => {
  const top = getTopModal();
  if (top && top.box.classList.contains('overlay-menu')) closeModal(OVERLAY_EXTERNAL_CLOSE);
};

export const closeOverlay = () => {
  if (!getState().isOverlayOpen) return;
  updateState({ isOverlayOpen: false });
  closeOverlayMenu();
  if (getState().isGameRunning) showResumeCover();
};

const showSessionToast = (gameState, game) => {
  const image = game && game.cover;
  if (gameState.error) {
    showToast('Erro ao executar o emulador', gameState.error, { kind: 'crash', ms: 7000, image });
  } else if (gameState.code && gameState.duration < CRASH_WINDOW_MS) {
    showToast(
      'O emulador fechou inesperadamente',
      `Código ${gameState.code}. Verifique BIOS, executável e argumentos em Configurações.`,
      { kind: 'crash', ms: 7000, image },
    );
  } else if (gameState.duration > LONG_SESSION_MS) {
    showToast(
      game ? game.title : 'Sessão encerrada',
      `Você jogou por ${formatDuration(gameState.duration)}.`,
      { kind: 'session', image },
    );
  }
};

export const handleGameState = (gameState) => {
  if (gameState.running) return;
  if (getState().isOverlayOpen) {
    updateState({ isOverlayOpen: false });
    closeOverlayMenu();
  }
  updateState({ isGameRunning: false, isLaunching: false });
  if (gameState.stats) storeGameStats(gameState.id, gameState.stats);
  endLaunchScreen();
  restoreParticles();
  runCommand('refreshHome', gameState.id);
  runCommand('refreshLibrary');
  if (getState().view === 'home' && getNavScope() === queryOne('#app')) {
    focusElement(runCommand('getHomeRow'), { silent: true, noScroll: true });
  }
  showSessionToast(gameState, findGame(getState(), gameState.id));
};
