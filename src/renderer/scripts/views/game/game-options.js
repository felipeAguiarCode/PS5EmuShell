import { invokeMain } from '../../core/api.js';
import { runCommand } from '../../core/commands.js';
import { queryOne } from '../../core/dom.js';
import { saveGameStats } from '../../core/persistence.js';
import { findEmulatorForGame, findGameStats, findSystem } from '../../core/selectors.js';
import { getState } from '../../core/store.js';
import { ICONS } from '../../ui/icons.js';
import { openMenu } from '../../ui/modal.js';
import { playSound } from '../../ui/sound.js';
import { showToast } from '../../ui/toast.js';

const DEFAULT_EMULATOR_CHOICE = '__default';

export const toggleFavorite = async (game) => {
  const isFavorite = !findGameStats(getState(), game.id).favorite;
  await saveGameStats(game.id, { favorite: isFavorite || null });
  playSound('toggle');
  showToast(isFavorite ? 'Adicionado aos favoritos' : 'Removido dos favoritos', game.title, {
    kind: isFavorite ? 'favAdd' : 'favRemove',
    ms: 2200,
    sound: false,
    image: game.cover,
  });
  runCommand('updateHomeHero', true);
  runCommand('renderLibrarySide');
  runCommand('updateLibraryArt', game.id);
};

const chooseEmulator = async (game) => {
  const state = getState();
  const system = findSystem(state, game.system);
  if (!system || !system.emulators.length) {
    showToast('Nenhum emulador configurado', system ? system.name : '', { kind: 'emuMissing' });
    return;
  }
  const gameStats = findGameStats(state, game.id);
  const defaultEmulator =
    system.emulators.find((emulator) => emulator.id === system.defaultEmulator) ||
    system.emulators[0];
  const choice = await openMenu({
    title: 'Emulador para este jogo',
    sub: game.title,
    items: [
      {
        label: `Padrão do sistema (${defaultEmulator.name})`,
        value: DEFAULT_EMULATOR_CHOICE,
        checked: !gameStats.emulator,
        icon: ICONS.chip,
      },
      ...system.emulators.map((emulator) => ({
        label: emulator.name,
        value: emulator.id,
        checked: gameStats.emulator === emulator.id,
        icon: ICONS.chip,
      })),
    ],
  });
  if (!choice) return;
  await saveGameStats(game.id, { emulator: choice === DEFAULT_EMULATOR_CHOICE ? null : choice });
  runCommand('updateHomeHero', true);
  showToast('Emulador alterado', `${game.title} → ${findEmulatorForGame(getState(), game).name}`, {
    kind: 'emulator',
    ms: 2500,
    image: game.cover,
  });
};

const findGameElement = (game) => {
  const { view } = getState();
  if (view === 'home') return runCommand('getHomeTile', game.id);
  return queryOne(`#view-${view} .gcard[data-id="${game.id}"] .art`);
};

const buildGameOptionItems = ({ gameStats, emulator, openCollection, collectionCount }) => [
  { label: 'Jogar', icon: ICONS.play, value: 'play' },
  {
    label: gameStats.favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos',
    icon: ICONS.star,
    value: 'fav',
  },
  {
    label: 'Adicionar à coleção…',
    icon: ICONS.library,
    right: collectionCount ? `em ${collectionCount}` : null,
    value: 'collection',
  },
  ...(openCollection
    ? [{ label: `Remover de “${openCollection.name}”`, icon: ICONS.trash, value: 'uncollect' }]
    : []),
  {
    label: 'Emulador',
    icon: ICONS.chip,
    right: (emulator.name || '—') + (gameStats.emulator ? '' : ' (padrão)'),
    value: 'emu',
  },
  { label: 'Baixar capa novamente', icon: ICONS.image, value: 'cover' },
  { label: 'Mostrar arquivo no Explorer', icon: ICONS.folder, value: 'folder' },
  { label: 'Informações', icon: ICONS.info, value: 'info' },
];

export const openGameOptions = async (game) => {
  if (game.native) {
    runCommand('openPcGameOptions', game);
    return;
  }
  const state = getState();
  const system = findSystem(state, game.system);
  const openCollection =
    state.view === 'collections' && runCommand('findCollection', runCommand('getOpenCollectionId'));
  const collectionCount = state.collections.filter((collection) =>
    collection.games.includes(game.id),
  ).length;
  const choice = await openMenu({
    title: game.title,
    sub: `${system ? system.name : game.system} · ${game.file}`,
    items: buildGameOptionItems({
      gameStats: findGameStats(state, game.id),
      emulator: findEmulatorForGame(state, game),
      openCollection,
      collectionCount,
    }),
  });
  if (choice === 'play') runCommand('launchGame', game, findGameElement(game));
  else if (choice === 'fav') toggleFavorite(game);
  else if (choice === 'collection') runCommand('openAddToCollectionMenu', game);
  else if (choice === 'uncollect') {
    runCommand('toggleGameInCollection', openCollection, game, false);
    runCommand('renderCollections');
  } else if (choice === 'emu') chooseEmulator(game);
  else if (choice === 'cover') {
    await invokeMain('covers:fetch', [game.id], true);
    showToast('Buscando capa', game.title, { kind: 'cover', ms: 2500, image: game.cover });
  } else if (choice === 'folder') invokeMain('path:open', game.path, true);
  else if (choice === 'info') runCommand('openGameInfo', game);
};
