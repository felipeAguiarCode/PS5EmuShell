const LOCALE = 'pt-BR';
const MATCH_PREVIEW_COUNT = 6;
const MAX_MOSAIC_COVERS = 4;

export const formatGameCount = (count) => `${count} ${count === 1 ? 'jogo' : 'jogos'}`;

export const formatCollectionCount = (count) => `${count} ${count === 1 ? 'coleção' : 'coleções'}`;

export const listCollectionGames = (gamesById, collection) =>
  collection ? collection.games.map((gameId) => gamesById.get(gameId)).filter(Boolean) : [];

export const buildCollection = ({ name, gameIds, now }) => ({
  id: `c${now.toString(36)}`,
  name,
  games: gameIds,
  created: now,
});

export const findNameMatches = (games, collection) => {
  const query = collection.name.toLowerCase();
  return games.filter(
    (game) =>
      !collection.games.includes(game.id) &&
      (game.title.toLowerCase().includes(query) || game.base.toLowerCase().includes(query)),
  );
};

export const formatMatchPreview = (matches) =>
  `${matches
    .slice(0, MATCH_PREVIEW_COUNT)
    .map((game) => game.title)
    .join(', ')}${matches.length > MATCH_PREVIEW_COUNT ? '…' : ''}`;

export const withGameToggled = (collection, gameId, isIncluded) => {
  const hasGame = collection.games.includes(gameId);
  const shouldInclude = isIncluded === undefined ? !hasGame : isIncluded;
  if (shouldInclude && !hasGame) return { ...collection, games: [...collection.games, gameId] };
  if (!shouldInclude && hasGame) {
    return { ...collection, games: collection.games.filter((id) => id !== gameId) };
  }
  return collection;
};

export const mergePickedGameIds = (currentIds, selectedIds) => [
  ...currentIds.filter((gameId) => selectedIds.has(gameId)),
  ...[...selectedIds].filter((gameId) => !currentIds.includes(gameId)),
];

export const withCollectionReplaced = (collections, nextCollection) =>
  collections.map((collection) =>
    collection.id === nextCollection.id ? nextCollection : collection,
  );

export const sortGamesByTitle = (games) =>
  [...games].sort((first, second) =>
    first.title.localeCompare(second.title, LOCALE, { sensitivity: 'base' }),
  );

export const listMosaicCovers = (games, isCoverArtEnabled) =>
  isCoverArtEnabled ? games.filter((game) => game.cover).slice(0, MAX_MOSAIC_COVERS) : [];

export const formatSystemNames = (games, findShortName) =>
  [...new Set(games.map((game) => findShortName(game.system)).filter(Boolean))].join(' · ');
