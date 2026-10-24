import { runCommand } from '../../core/commands.js';
import { escapeHtml } from '../../core/dom.js';
import { formatDuration, formatFileSize, formatTimeAgo } from '../../core/format.js';
import { saveGameStats } from '../../core/persistence.js';
import { findEmulatorForGame, findGameStats, findSystem } from '../../core/selectors.js';
import { getState } from '../../core/store.js';
import { ICONS } from '../../ui/icons.js';
import { closeModal, openConfirm, openModal } from '../../ui/modal.js';
import { showToast } from '../../ui/toast.js';

const RESET_STATS_PATCH = {
  playTime: null,
  lastSessionMs: null,
  playCount: null,
  lastPlayed: null,
  session: null,
};

export const buildGameInfoRows = ({ game, gameStats, system, emulator, now }) => [
  ['Sistema', system ? system.name : game.system],
  ['Arquivo', game.path],
  ['Tamanho', formatFileSize(game.size)],
  ['Região', game.region || '—'],
  ['Emulador', emulator.name || '—'],
  ['Tempo de jogo', gameStats.playTime > 0 ? formatDuration(gameStats.playTime) : 'Nunca jogado'],
  ['Última sessão', gameStats.lastSessionMs ? formatDuration(gameStats.lastSessionMs) : '—'],
  ['Sessões', gameStats.playCount || 0],
  ['Última vez', formatTimeAgo(gameStats.lastPlayed, now)],
];

const renderInfoRow = ([label, value]) =>
  `<div class="menu-item" style="height:auto;padding:10px 18px"><span style="color:var(--fg-faint);width:130px;flex:none">${escapeHtml(label)}</span><span style="word-break:break-all">${escapeHtml(value)}</span></div>`;

const resetGameStats = async (game) => {
  const state = getState();
  if (state.isGameRunning && state.runningGameId === game.id) {
    showToast('Jogo em execução', 'Feche o jogo antes de resetar as estatísticas.', {
      kind: 'error',
    });
    return;
  }
  const isConfirmed = await openConfirm(
    'Resetar estatísticas?',
    `Tempo de jogo, sessões e a data da última vez de “${game.title}” voltam a zero. Isso não pode ser desfeito.`,
    { ok: 'Resetar' },
  );
  if (!isConfirmed) return;
  await saveGameStats(game.id, RESET_STATS_PATCH);
  closeModal();
  runCommand('refreshHome');
  runCommand('refreshLibrary');
  showToast('Estatísticas resetadas', game.title, { kind: 'success', image: game.cover });
  openGameInfo(game);
};

export const openGameInfo = (game) => {
  const state = getState();
  const rows = buildGameInfoRows({
    game,
    gameStats: findGameStats(state, game.id),
    system: findSystem(state, game.system),
    emulator: findEmulatorForGame(state, game),
    now: Date.now(),
  });
  openModal({
    html:
      `<h3>${escapeHtml(game.title)}</h3>` +
      rows.map(renderInfoRow).join('') +
      `<div class="modal-buttons"><button class="btn-pill focusable danger" data-group="mb" data-act="reset">${ICONS.refresh} Resetar estatísticas</button>` +
      `<button class="btn-pill focusable" data-group="mb" data-act="ok">OK</button></div>`,
    initial: '[data-act="ok"]',
    onMount: (box) =>
      box.addEventListener('click', (event) => {
        const button = event.target.closest('.btn-pill');
        if (!button) return;
        if (button.dataset.act === 'reset') resetGameStats(game);
        else closeModal();
      }),
  });
};
