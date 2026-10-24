export const ALL_FILTER = 'all';
export const LIBRARY_ITEM_KEY = '__library';
export const TILE_GAP_PX = 12;
export const FOCUSED_TILE_SCALE = 1.6;
export const UNFOCUSED_TILE_SCALE = 1.3;
export const DEFAULT_TILE_SIZE_PX = 116;
export const TILES_BEFORE_SELECTION = 2;
export const SELECTED_TILE_EXTRA_GAP_PX = 4;
export const DIMMED_TILE_OPACITY = 0.55;

const LOCALE = 'pt-BR';

export const compareTitles = (first, second) =>
  first.title.localeCompare(second.title, LOCALE, { sensitivity: 'base' });

export const buildHomeItems = ({ games, filter, gameStats }) => {
  const readLastPlayed = (game) => gameStats[game.id]?.lastPlayed || 0;
  const visibleGames = games
    .filter((game) => filter === ALL_FILTER || game.system === filter)
    .sort((first, second) => {
      const firstPlayed = readLastPlayed(first);
      const secondPlayed = readLastPlayed(second);
      if (firstPlayed !== secondPlayed) return secondPlayed - firstPlayed;
      return compareTitles(first, second);
    });
  const gameItems = visibleGames.map((game) => ({ kind: 'game', key: game.id, game }));
  return visibleGames.length
    ? [...gameItems, { kind: 'library', key: LIBRARY_ITEM_KEY }]
    : gameItems;
};

export const countGamesBySystem = (games) =>
  games.reduce(
    (counts, game) => ({ ...counts, [game.system]: (counts[game.system] || 0) + 1 }),
    {},
  );

export const buildHomeChips = ({ games, systems }) => {
  const counts = countGamesBySystem(games);
  return [
    { id: ALL_FILTER, shortName: 'Todos', count: games.length },
    ...systems
      .filter((system) => counts[system.id])
      .map((system) => ({ ...system, count: counts[system.id] })),
  ];
};

export const resolveActiveFilter = (filter, games) => {
  if (filter === ALL_FILTER) return filter;
  return games.some((game) => game.system === filter) ? filter : ALL_FILTER;
};

export const findItemIndex = (items, key) => {
  const index = items.findIndex((item) => item.key === key);
  return index >= 0 ? index : 0;
};

export const calculateCycledValue = (values, currentValue, step) => {
  const index = (values.indexOf(currentValue) + step + values.length) % values.length;
  return values[index];
};

export const calculateVisibleRange = ({ selectedIndex, itemCount, rowWidth, stride }) => ({
  from: Math.max(0, selectedIndex - TILES_BEFORE_SELECTION),
  to: Math.min(itemCount - 1, selectedIndex + Math.ceil(rowWidth / stride) + 1),
});

export const calculateTileOffset = ({ index, selectedIndex, stride, selectedSize, tileSize }) =>
  (index - selectedIndex) * stride +
  (index > selectedIndex ? selectedSize - tileSize + SELECTED_TILE_EXTRA_GAP_PX : 0);
