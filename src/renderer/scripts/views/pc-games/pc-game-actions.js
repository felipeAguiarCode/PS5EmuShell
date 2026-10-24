import { invokeMain } from '../../core/api.js';
import { runCommand } from '../../core/commands.js';
import { findGame } from '../../core/selectors.js';
import { getState } from '../../core/store.js';
import { ICONS } from '../../ui/icons.js';
import { openConfirm, openMenu } from '../../ui/modal.js';
import { dismissToast, showToast } from '../../ui/toast.js';
import { openKeyboard } from '../../ui/virtual-keyboard.js';
import { createPcCover } from './pc-cover.js';

const isSettingsVisible = () => getState().view === 'settings';

const focusGameOnHome = (gameId) => {
  if (isSettingsVisible()) return;
  runCommand('setView', 'home');
  runCommand('selectHomeGame', gameId);
};

export const addPcGame = async () => {
  const exe = await runCommand('openFileBrowser', {
    mode: 'exe',
    title: 'Escolha o executável do jogo',
  });
  if (!exe) return;
  const info = await invokeMain('pcgames:info', exe);
  const title = await openKeyboard({
    title: 'Nome do jogo no launcher',
    value: info.suggestedTitle,
  });
  if (title === null || !title.trim()) return;
  const busyToast = showToast('Adicionando jogo de PC…', title.trim(), {
    kind: 'scan',
    ms: 8000,
    sound: false,
  });
  const result = await invokeMain('pcgames:add', exe, title.trim());
  dismissToast(busyToast, true);
  if (!result.ok) {
    showToast('Não foi possível adicionar', result.error, { kind: 'error' });
    return;
  }
  await createPcCover(result.id);
  const game = findGame(getState(), result.id);
  showToast(result.existed ? 'Jogo de PC atualizado' : 'Jogo de PC adicionado', title.trim(), {
    kind: 'pcAdd',
    image: game && game.cover,
  });
  focusGameOnHome(result.id);
};

const findCurrentGame = (game) => findGame(getState(), game.id) || game;

const openPcThumbnails = async (game) => {
  const currentGame = findCurrentGame(game);
  const choice = await openMenu({
    title: 'Thumbnails',
    sub: currentGame.title,
    items: [
      { label: 'Recriar imagem do ícone', icon: ICONS.refresh, value: 'icon' },
      {
        label: 'Selecionar imagem de background',
        icon: ICONS.image,
        right: currentGame.snap ? 'definida' : null,
        value: 'bg',
      },
      ...(currentGame.snap
        ? [{ label: 'Remover imagem de background', icon: ICONS.trash, value: 'bgclear' }]
        : []),
    ],
  });
  if (choice === 'icon') {
    await invokeMain('pcgames:refreshIcon', currentGame.id);
    await createPcCover(currentGame.id);
    showToast('Imagem recriada', currentGame.title, {
      kind: 'cover',
      ms: 2200,
      image: findCurrentGame(currentGame).cover,
    });
  } else if (choice === 'bg') {
    const file = await runCommand('openFileBrowser', {
      mode: 'image',
      title: `Imagem de background de “${currentGame.title}”`,
    });
    if (!file) return;
    await invokeMain('games:setBackground', currentGame.id, file);
    showToast('Background definido', currentGame.title, {
      kind: 'cover',
      ms: 2400,
      image: currentGame.cover,
    });
  } else if (choice === 'bgclear') {
    await invokeMain('games:setBackground', currentGame.id, null);
    showToast('Background removido', currentGame.title, {
      kind: 'coverClear',
      ms: 2200,
      image: currentGame.cover,
    });
  }
  if (choice && isSettingsVisible()) runCommand('renderSettings');
};

const renamePcGame = async (game) => {
  const title = await openKeyboard({ title: 'Nome do jogo no launcher', value: game.title });
  if (title === null || !title.trim() || title.trim() === game.title) return false;
  await invokeMain('pcgames:update', game.id, { title: title.trim() });
  showToast('Jogo renomeado', title.trim(), { kind: 'pcAdd', image: game.cover });
  return true;
};

const replacePcGameExe = async (game) => {
  const exe = await runCommand('openFileBrowser', {
    mode: 'exe',
    title: `Novo executável de “${game.title}”`,
  });
  if (!exe) return false;
  await invokeMain('pcgames:update', game.id, { exe });
  await createPcCover(game.id);
  showToast('Executável trocado', game.title, { kind: 'pcAdd', image: game.cover });
  return true;
};

const removePcGame = async (game) => {
  const isConfirmed = await openConfirm(
    `Remover “${game.title}”?`,
    'O jogo sai do launcher. Nenhum arquivo do jogo é apagado.',
    { ok: 'Remover' },
  );
  if (!isConfirmed) return false;
  await invokeMain('pcgames:remove', game.id);
  showToast('Jogo removido do launcher', game.title, { kind: 'collectionRemove' });
  return true;
};

const PC_GAME_ACTIONS = { rename: renamePcGame, exe: replacePcGameExe, remove: removePcGame };

export const managePcGame = async (game, action) => {
  if (action === 'thumbs') {
    await openPcThumbnails(game);
    return;
  }
  const runAction = PC_GAME_ACTIONS[action];
  if (runAction && !(await runAction(game))) return;
  if (isSettingsVisible()) runCommand('renderSettings');
};
