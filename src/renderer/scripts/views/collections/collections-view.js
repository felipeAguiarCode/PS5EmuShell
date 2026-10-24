import { invokeMain } from '../../core/api.js';
import { registerCommands, runCommand } from '../../core/commands.js';
import { escapeHtml, queryOne, restartAnimation } from '../../core/dom.js';
import { findGame, findSystem } from '../../core/selectors.js';
import { getState, updateState } from '../../core/store.js';
import { focusElement, getFocusedElement } from '../../navigation/spatial-navigation.js';
import { renderGlyph } from '../../ui/glyphs.js';
import { ICONS } from '../../ui/icons.js';
import { getTopModal, openConfirm, openMenu } from '../../ui/modal.js';
import { playSound } from '../../ui/sound.js';
import { showToast } from '../../ui/toast.js';
import { openKeyboard } from '../../ui/virtual-keyboard.js';
import { renderGameCard } from '../library/game-card.js';
import { chooseCollectionCover } from './collection-cover.js';
import {
  buildCollection,
  findNameMatches,
  formatCollectionCount,
  formatGameCount,
  formatMatchPreview,
  formatSystemNames,
  listCollectionGames,
  listMosaicCovers,
  mergePickedGameIds,
  withCollectionReplaced,
  withGameToggled,
} from './collection-rules.js';
import { pickCollectionGames } from './game-picker.js';

const LIBRARY_CARD_GROUP = 'data-group="grid"';
const COLLECTION_CARD_GROUP = 'data-group="cgames"';
const ADD_TO_COLLECTION_TOAST_MS = 2400;

let openCollectionId = null;

const getViewElement = () => queryOne('#view-collections');
const getBodyElement = () => queryOne('#coll-body');
const getBackElement = () => queryOne('.coll-back');
const listCollections = () => getState().collections;

const findCollection = (collectionId) =>
  listCollections().find((collection) => collection.id === collectionId);

const listGamesOf = (collection) => listCollectionGames(getState().gamesById, collection);

const saveCollections = (collections) => {
  updateState({ collections });
  invokeMain('collections:save', collections);
};

const saveCollection = (collection) =>
  saveCollections(withCollectionReplaced(listCollections(), collection));

const renderCollectionGameCard = (game) =>
  renderGameCard(game).replace(LIBRARY_CARD_GROUP, COLLECTION_CARD_GROUP);

const findSystemShortName = (systemId) => (findSystem(getState(), systemId) || {}).shortName;

const refocusCollections = (selector, fallbackSelector) => {
  if (getState().view !== 'collections' || getTopModal()) return;
  const view = getViewElement();
  const element =
    (selector && queryOne(selector, view)) ||
    (fallbackSelector && queryOne(fallbackSelector, view)) ||
    queryOne('.gcard, .ccard', getBodyElement()) ||
    queryOne('[data-cmd]', view);
  if (element) focusElement(element, { silent: true, instant: true });
};

const renderMosaic = (collection, games) => {
  if (collection.coverUrl) {
    return `<div class="mosaic custom"><img src="${escapeHtml(collection.coverUrl)}" alt="" decoding="async"></div>`;
  }
  const covers = listMosaicCovers(games, getState().config.appearance.coverArt !== false);
  if (covers.length) {
    return `<div class="mosaic n${covers.length}">${covers.map((game) => `<img src="${escapeHtml(game.cover)}" alt="" decoding="async" loading="lazy">`).join('')}</div>`;
  }
  return `<div class="mosaic empty">${ICONS.library}</div>`;
};

const renderCollectionCard = (collection) => {
  const games = listGamesOf(collection);
  const systems = formatSystemNames(games, findSystemShortName);
  return (
    `<button class="ccard focusable" data-group="cgrid" data-id="${escapeHtml(collection.id)}"><div class="stack">${renderMosaic(collection, games)}</div>` +
    `<div class="t">${escapeHtml(collection.name)}</div><div class="s">${formatGameCount(games.length)}${systems ? ' · ' + escapeHtml(systems) : ''}</div></button>`
  );
};

const renderCollectionList = (focusId) => {
  const collections = listCollections();
  getBackElement().classList.add('hidden');
  queryOne('#coll-heading').textContent = 'Coleções';
  queryOne('#coll-count').textContent = formatCollectionCount(collections.length);
  queryOne('#coll-tools').innerHTML =
    `<button class="btn-pill focusable" data-group="colltools" data-cmd="new"><span class="ico">${ICONS.plus}</span>Nova coleção</button>`;
  getBodyElement().innerHTML =
    `<div class="coll-grid">${collections.map(renderCollectionCard).join('')}` +
    `<button class="ccard new focusable" data-group="cgrid" data-cmd="new"><div class="stack"><div class="mosaic empty">${ICONS.plus}</div></div>` +
    `<div class="t">Nova coleção</div><div class="s">Agrupe jogos de uma saga</div></button></div>`;
  refocusCollections(focusId ? `.ccard[data-id="${focusId}"]` : null);
};

const renderCollectionDetail = (focusId) => {
  const collection = findCollection(openCollectionId);
  const games = listGamesOf(collection);
  getBackElement().classList.remove('hidden');
  queryOne('#coll-heading').textContent = collection.name;
  queryOne('#coll-count').textContent = formatGameCount(games.length);
  queryOne('#coll-tools').innerHTML =
    `<button class="btn-pill focusable" data-group="colltools" data-cmd="add"><span class="ico">${ICONS.plus}</span>Adicionar jogos</button>` +
    `<button class="btn-pill focusable" data-group="colltools" data-cmd="cover"><span class="ico">${ICONS.image}</span>Capa</button>` +
    `<button class="btn-pill focusable" data-group="colltools" data-cmd="rename"><span class="ico">${ICONS.gear}</span>Renomear</button>` +
    `<button class="btn-pill focusable" data-group="colltools" data-cmd="delete"><span class="ico">${ICONS.trash}</span>Excluir</button>`;
  getBodyElement().innerHTML = games.length
    ? `<div class="coll-games">${games.map(renderCollectionGameCard).join('')}</div>`
    : `<div class="lib-empty">Esta coleção está vazia. Use “Adicionar jogos” ou, em qualquer jogo, ${renderGlyph('y')} Opções › Adicionar à coleção.</div>`;
  refocusCollections(
    focusId ? `.gcard[data-id="${focusId}"]` : null,
    games.length ? null : '[data-cmd="add"]',
  );
};

const renderCollections = (focusId) => {
  if (openCollectionId && !findCollection(openCollectionId)) openCollectionId = null;
  if (openCollectionId) renderCollectionDetail(focusId);
  else renderCollectionList(focusId);
};

const updateCollectionsArt = (gameId) => {
  if (getState().view !== 'collections') return;
  const body = getBodyElement();
  const card = queryOne(`.gcard[data-id="${gameId}"]`, body);
  if (!card) return;
  const container = document.createElement('div');
  container.innerHTML = renderCollectionGameCard(findGame(getState(), gameId));
  const isFocused = card.classList.contains('focused');
  card.replaceWith(container.firstChild);
  if (isFocused) {
    focusElement(queryOne(`.gcard[data-id="${gameId}"]`, body), { silent: true, noScroll: true });
  }
};

const openCollection = (collectionId) => {
  openCollectionId = collectionId;
  restartAnimation(getBodyElement(), 'entering');
  renderCollections();
};

const closeCollection = () => {
  const collectionId = openCollectionId;
  openCollectionId = null;
  playSound('back');
  renderCollections(collectionId);
};

const showCollection = (collectionId, focusGameId) => {
  openCollectionId = collectionId;
  if (getState().view !== 'collections') runCommand('setView', 'collections');
  else renderCollections();
  if (focusGameId) refocusCollections(`.gcard[data-id="${focusGameId}"]`);
};

const askToAddMatches = async (collection) => {
  const matches = findNameMatches(getState().games, collection);
  if (!matches.length) return collection;
  const isAccepted = await openConfirm(
    `Adicionar ${formatGameCount(matches.length)}?`,
    `Encontrados na biblioteca com “${collection.name}” no nome: ${formatMatchPreview(matches)}`,
    { ok: 'Adicionar', cancel: 'Agora não' },
  );
  if (!isAccepted) return collection;
  return { ...collection, games: [...collection.games, ...matches.map((game) => game.id)] };
};

const createCollection = async (withGame) => {
  const name = (await openKeyboard({ title: 'Nome da coleção', value: '' })) || '';
  if (!name.trim()) return null;
  const draft = buildCollection({
    name: name.trim(),
    gameIds: withGame ? [withGame.id] : [],
    now: Date.now(),
  });
  updateState({ collections: [...listCollections(), draft] });
  const collection = await askToAddMatches(draft);
  saveCollection(collection);
  showToast('Coleção criada', `${collection.name} · ${formatGameCount(collection.games.length)}`, {
    kind: 'collectionNew',
    image: (listGamesOf(collection).find((game) => game.cover) || {}).cover,
  });
  showCollection(collection.id, withGame && withGame.id);
  return collection;
};

const renameCollection = async (collection) => {
  const name = await openKeyboard({ title: 'Renomear coleção', value: collection.name });
  if (!name || !name.trim()) return;
  saveCollection({ ...findCollection(collection.id), name: name.trim() });
  renderCollections();
};

const changeCollectionCover = async (collection) => {
  const result = await chooseCollectionCover(collection);
  if (!result) return;
  saveCollection(result.collection);
  renderCollections();
  showToast(
    result.file ? 'Capa da coleção definida' : 'Capa personalizada removida',
    result.collection.name,
    { kind: 'collectionNew', image: result.collection.coverUrl || undefined },
  );
};

const deleteCollection = async (collection) => {
  const isConfirmed = await openConfirm(
    'Excluir coleção?',
    `“${collection.name}” será excluída. Os jogos continuam na biblioteca.`,
    { ok: 'Excluir' },
  );
  if (!isConfirmed) return;
  if (collection.cover) invokeMain('collections:setCover', collection.id, null);
  saveCollections(listCollections().filter((candidate) => candidate.id !== collection.id));
  openCollectionId = null;
  renderCollections();
};

const addGamesToCollection = async (collection) => {
  const selectedIds = await pickCollectionGames(collection);
  if (!selectedIds) return;
  saveCollection({ ...collection, games: mergePickedGameIds(collection.games, selectedIds) });
  playSound('select');
  renderCollections();
};

const openCollectionOptions = async (collection) => {
  const choice = await openMenu({
    title: collection.name,
    items: [
      { label: 'Abrir', icon: ICONS.library, value: 'open' },
      {
        label: 'Capa',
        icon: ICONS.image,
        right: collection.coverUrl ? 'personalizada' : null,
        value: 'cover',
      },
      { label: 'Renomear', icon: ICONS.gear, value: 'rename' },
      { label: 'Excluir', icon: ICONS.trash, value: 'delete' },
    ],
  });
  if (choice === 'open') openCollection(collection.id);
  else if (choice === 'cover') changeCollectionCover(collection);
  else if (choice === 'rename') renameCollection(collection);
  else if (choice === 'delete') deleteCollection(collection);
};

const toggleGameInCollection = (collection, game, isIncluded) => {
  saveCollection(withGameToggled(findCollection(collection.id) || collection, game.id, isIncluded));
};

const openAddToCollectionMenu = async (game) => {
  const items = [
    ...listCollections().map((collection) => ({
      label: collection.name,
      icon: ICONS.library,
      value: collection.id,
      checked: collection.games.includes(game.id),
      right: `${listGamesOf(collection).length}`,
    })),
    { label: 'Nova coleção…', icon: ICONS.plus, value: '__new' },
  ];
  const choice = await openMenu({
    title: 'Adicionar à coleção',
    sub: `${game.title} · as marcadas já contêm este jogo`,
    items,
  });
  if (!choice) return null;
  if (choice === '__new') return createCollection(game);
  const collection = findCollection(choice);
  const hadGame = collection.games.includes(game.id);
  toggleGameInCollection(collection, game);
  showToast(
    hadGame ? 'Removido da coleção' : 'Adicionado à coleção',
    `${game.title} → ${collection.name}`,
    {
      kind: hadGame ? 'collectionRemove' : 'collectionAdd',
      ms: ADD_TO_COLLECTION_TOAST_MS,
      image: game.cover,
    },
  );
  if (!hadGame) showCollection(collection.id, game.id);
  else if (getState().view === 'collections') renderCollections(game.id);
  return null;
};

const TOOL_ACTIONS = {
  new: () => createCollection(),
  add: (collection) => addGamesToCollection(collection),
  cover: (collection) => changeCollectionCover(collection),
  rename: (collection) => renameCollection(collection),
  delete: (collection) => deleteCollection(collection),
};

const runToolAction = (command) => {
  playSound('select');
  TOOL_ACTIONS[command]?.(findCollection(openCollectionId));
};

const handleBodyClick = (event) => {
  const card = event.target.closest('.ccard, .gcard');
  if (!card) return;
  playSound('select');
  if (card.dataset.cmd === 'new') {
    createCollection();
    return;
  }
  if (card.classList.contains('ccard')) {
    openCollection(card.dataset.id);
    return;
  }
  const game = findGame(getState(), card.dataset.id);
  if (game) runCommand('launchGame', game, queryOne('.art', card));
};

const handleBodyFocus = (event) => {
  const card = event.target.closest('.gcard, .ccard');
  if (!card) return;
  const game = card.classList.contains('gcard')
    ? findGame(getState(), card.dataset.id)
    : listGamesOf(findCollection(card.dataset.id))[0];
  runCommand('setBackground', game || null);
};

const handleCollectionsButton = (button) => {
  if (button === 'b' && openCollectionId) {
    closeCollection();
    return true;
  }
  const focused = getFocusedElement();
  if (button === 'y' && focused && focused.classList.contains('ccard') && focused.dataset.id) {
    playSound('select');
    openCollectionOptions(findCollection(focused.dataset.id));
    return true;
  }
  return false;
};

const listCollectionsHints = () => {
  const focused = getFocusedElement();
  if (focused && focused.classList.contains('gcard')) {
    return [
      ['a', 'Jogar'],
      ['y', 'Opções'],
      ['b', 'Voltar'],
    ];
  }
  if (focused && focused.classList.contains('ccard') && focused.dataset.id) {
    return [
      ['a', 'Abrir'],
      ['y', 'Opções'],
      ['b', 'Voltar'],
    ];
  }
  return [
    ['a', 'Abrir'],
    ['b', 'Voltar'],
  ];
};

export const initCollectionsView = async () => {
  registerCommands({
    renderCollections,
    getOpenCollectionId: () => openCollectionId,
    findCollection,
    openAddToCollectionMenu,
    toggleGameInCollection,
    updateCollectionsArt,
    handleCollectionsButton,
    listCollectionsHints,
  });
  updateState({ collections: (await invokeMain('collections:get')) || [] });
  const body = getBodyElement();
  body.addEventListener('click', handleBodyClick);
  queryOne('#coll-tools').addEventListener('click', (event) => {
    const button = event.target.closest('[data-cmd]');
    if (button) runToolAction(button.dataset.cmd);
  });
  body.addEventListener('navfocus', handleBodyFocus);
  getBackElement().innerHTML = ICONS.chevL;
  getBackElement().addEventListener('click', closeCollection);
};
