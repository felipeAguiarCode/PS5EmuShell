export const LIBRARY_SORTS = [
  { id: 'az', label: 'Nome (A–Z)' },
  { id: 'recent', label: 'Jogados recentemente' },
  { id: 'played', label: 'Mais jogados' },
  { id: 'added', label: 'Adicionados recentemente' },
];

export const DEFAULT_LIBRARY_FILTER = 'all';
export const DEFAULT_LIBRARY_SORT = 'az';

const SPECIAL_FILTERS = ['all', 'fav', 'recent'];
const LOCALE = 'pt-BR';

const compareTitles = (first, second) =>
  first.title.localeCompare(second.title, LOCALE, { sensitivity: 'base' });

const isGameInFilter = ({ game, stats, filter, query }) => {
  if (filter === 'fav' && !stats.favorite) return false;
  if (filter === 'recent' && !stats.lastPlayed) return false;
  if (!SPECIAL_FILTERS.includes(filter) && game.system !== filter) return false;
  if (
    query &&
    !game.title.toLowerCase().includes(query) &&
    !game.file.toLowerCase().includes(query)
  ) {
    return false;
  }
  return true;
};

const buildSortKeys = (gameStats) => ({
  recent: (game) => gameStats[game.id]?.lastPlayed || 0,
  played: (game) => gameStats[game.id]?.playTime || 0,
  added: (game) => game.added || 0,
});

export const filterLibraryGames = ({ games, gameStats, filter, sort, query }) => {
  const normalizedQuery = query.trim().toLowerCase();
  const sortKey =
    buildSortKeys(gameStats)[
      filter === 'recent' && sort === DEFAULT_LIBRARY_SORT ? 'recent' : sort
    ];
  const compareGames = sortKey
    ? (first, second) => sortKey(second) - sortKey(first) || compareTitles(first, second)
    : compareTitles;
  return games
    .filter((game) =>
      isGameInFilter({ game, stats: gameStats[game.id] || {}, filter, query: normalizedQuery }),
    )
    .sort(compareGames);
};

export const countLibraryGames = ({ games, gameStats }) =>
  games.reduce(
    (counts, game) => {
      const stats = gameStats[game.id] || {};
      return {
        bySystem: { ...counts.bySystem, [game.system]: (counts.bySystem[game.system] || 0) + 1 },
        favorites: counts.favorites + (stats.favorite ? 1 : 0),
        recent: counts.recent + (stats.lastPlayed ? 1 : 0),
      };
    },
    { bySystem: {}, favorites: 0, recent: 0 },
  );

export const findSortLabel = (sortId) => LIBRARY_SORTS.find((sort) => sort.id === sortId).label;

export const formatGameCount = (count) => `${count} ${count === 1 ? 'jogo' : 'jogos'}`;
