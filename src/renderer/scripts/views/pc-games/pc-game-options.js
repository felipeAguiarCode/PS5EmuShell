import { invokeMain } from '../../core/api.js';
import { runCommand } from '../../core/commands.js';
import { findGameStats } from '../../core/selectors.js';
import { getState } from '../../core/store.js';
import { ICONS } from '../../ui/icons.js';
import { openMenu } from '../../ui/modal.js';
import { managePcGame } from './pc-game-actions.js';

const countCollectionsWithGame = (collections, gameId) =>
  collections.filter((collection) => collection.games.includes(gameId)).length;

const buildOptionItems = (game) => {
  const state = getState();
  const isFavorite = findGameStats(state, game.id).favorite;
  const collectionCount = countCollectionsWithGame(state.collections, game.id);
  return [
    { label: 'Jogar', icon: ICONS.play, value: 'play' },
    {
      label: isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos',
      icon: ICONS.star,
      value: 'fav',
    },
    {
      label: 'Adicionar à coleção…',
      icon: ICONS.library,
      right: collectionCount ? `em ${collectionCount}` : null,
      value: 'collection',
    },
    { label: 'Renomear', icon: ICONS.edit || ICONS.gear, value: 'rename' },
    { label: 'Trocar executável', icon: ICONS.folder, value: 'exe' },
    { label: 'Thumbnails', icon: ICONS.image, right: '›', value: 'thumbs' },
    { label: 'Mostrar arquivo no Explorer', icon: ICONS.folder, value: 'folder' },
    { label: 'Informações', icon: ICONS.info, value: 'info' },
    { label: 'Remover do launcher', icon: ICONS.trash, value: 'remove' },
  ];
};

const launchFromOptions = (game) => {
  const fromElement = getState().view === 'home' ? runCommand('getHomeTile', game.id) : null;
  runCommand('launchGame', game, fromElement);
};

const OPTION_HANDLERS = {
  play: launchFromOptions,
  fav: (game) => runCommand('toggleFavorite', game),
  collection: (game) => runCommand('openAddToCollectionMenu', game),
  folder: (game) => invokeMain('path:open', game.path, true),
  info: (game) => runCommand('openGameInfo', game),
};

export const openPcGameOptions = async (game) => {
  const choice = await openMenu({
    title: game.title,
    sub: `PC (Windows) · ${game.path}`,
    items: buildOptionItems(game),
  });
  if (!choice) return;
  const handleOption = OPTION_HANDLERS[choice];
  if (handleOption) {
    handleOption(game);
    return;
  }
  await managePcGame(game, choice);
};
