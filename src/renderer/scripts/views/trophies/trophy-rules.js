export const TIER_NAMES = { platinum: 'Platina', gold: 'Ouro', silver: 'Prata', bronze: 'Bronze' };

export const TIER_ORDER = { platinum: 0, gold: 1, silver: 2, bronze: 3 };

export const COUNTED_TIERS = ['gold', 'silver', 'bronze'];

export const GAME_SORTS = [
  { id: 'recent', label: 'Jogados recentemente' },
  { id: 'progress', label: 'Progresso' },
  { id: 'az', label: 'Nome (A–Z)' },
  { id: 'za', label: 'Nome (Z–A)' },
];

export const ACHIEVEMENT_SORTS = [
  { id: 'rarity', label: 'Raridade' },
  { id: 'default', label: 'Padrão do jogo' },
  { id: 'earned', label: 'Data obtida' },
  { id: 'type', label: 'Tipo de troféu' },
];

export const ACHIEVEMENT_FILTERS = [
  { id: 'all', label: 'Todos os troféus' },
  { id: 'earned', label: 'Obtidos' },
  { id: 'locked', label: 'Não obtidos' },
];

const CONSOLE_TAGS = {
  PlayStation: 'PS1',
  'PlayStation 2': 'PS2',
  'PlayStation Portable': 'PSP',
  'Nintendo DS': 'NDS',
  GameCube: 'GC',
  'Game Boy Advance': 'GBA',
  'Game Boy Color': 'GBC',
  'Game Boy': 'GB',
  'NES/Famicom': 'NES',
  'SNES/Super Famicom': 'SNES',
  'Nintendo 64': 'N64',
  'Genesis/Mega Drive': 'MD',
  'Atari 2600': '2600',
  'Master System': 'SMS',
  Dreamcast: 'DC',
};

const RA_SYSTEM_IDS = {
  PlayStation: 'psx',
  'PlayStation 2': 'ps2',
  'PlayStation Portable': 'psp',
  'Nintendo DS': 'nds',
  GameCube: 'gc',
  'Game Boy Advance': 'gba',
  'Game Boy Color': 'gbc',
  'Game Boy': 'gbc',
  'NES/Famicom': 'nes',
  'SNES/Super Famicom': 'snes',
};

const LOCALE = 'pt-BR';
const MIN_PREFIX_MATCH_LENGTH = 5;
const DISC_SUFFIX = /\s*\(Disco \d+\)$/;
const MASTERED_AWARD = /mastered|completed/i;

export const readTrophyRules = (config) => (config && config.trophies) || {};

export const calculateTrophyTier = (rules, points, percent) => {
  if (rules.tierMode === 'rarity' && percent !== undefined && percent !== null) {
    if (percent <= (rules.goldPct ?? 10)) return 'gold';
    return percent <= (rules.silverPct ?? 30) ? 'silver' : 'bronze';
  }
  if (points >= (rules.goldPoints ?? 25)) return 'gold';
  return points >= (rules.silverPoints ?? 10) ? 'silver' : 'bronze';
};

export const calculateRarityLabel = (rules, percent) => {
  if (percent <= (rules.ultraRarePct ?? 5)) return 'Ultra raro';
  if (percent <= (rules.veryRarePct ?? 15)) return 'Muito raro';
  if (percent <= (rules.rarePct ?? 50)) return 'Raro';
  return 'Comum';
};

export const formatPercent = (value) =>
  `${(Math.round(value * 10) / 10).toLocaleString(LOCALE, { minimumFractionDigits: 1 })}%`;

export const formatDateTime = (value) => {
  if (!value) return '';
  const date = new Date(String(value).replace(' ', 'T'));
  const time = date.toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' });
  return `${date.toLocaleDateString(LOCALE)} ${time}`;
};

export const findConsoleTag = (consoleName) =>
  CONSOLE_TAGS[consoleName] ||
  (consoleName || '')
    .split(/[\s/]+/)
    .map((word) => word[0])
    .join('')
    .slice(0, 4)
    .toUpperCase();

export const buildTitleKey = (title) =>
  String(title || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s*[([][^)\]]*[)\]]/g, '')
    .replace(/~[^~]*~/g, '')
    .replace(/,\s*(the|a|an)\b/g, '')
    .replace(/^(the|a|an)\s+/, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '');

export const findPlayerCount = (game) =>
  (game && (game.NumDistinctPlayersCasual || game.NumDistinctPlayers)) || 0;

export const countTrophyTiers = (rules, game) => {
  const players = findPlayerCount(game);
  const counts = { gold: [0, 0], silver: [0, 0], bronze: [0, 0] };
  for (const achievement of Object.values(game.Achievements || {})) {
    const percent = players ? (100 * (achievement.NumAwarded || 0)) / players : null;
    const tier = calculateTrophyTier(rules, achievement.Points, percent);
    const isEarned = Boolean(achievement.DateEarned || achievement.DateEarnedHardcore);
    counts[tier] = [counts[tier][0] + (isEarned ? 1 : 0), counts[tier][1] + 1];
  }
  return counts;
};

export const sumEarnedTiers = (tiersByGame) =>
  Object.values(tiersByGame).reduce(
    (sum, tiers) => ({
      gold: sum.gold + tiers.gold[0],
      silver: sum.silver + tiers.silver[0],
      bronze: sum.bronze + tiers.bronze[0],
    }),
    { gold: 0, silver: 0, bronze: 0 },
  );

export const isGameMastered = (game) =>
  MASTERED_AWARD.test(game.HighestAwardKind || '') ||
  (game.MaxPossible > 0 && game.NumAwarded >= game.MaxPossible);

export const calculateProgressPercent = (earned, total) =>
  total ? Math.floor((100 * earned) / total) : 0;

export const buildRomIndex = (games) => {
  const index = new Map();
  for (const game of games) {
    const titles = index.get(game.system) ?? new Set();
    titles.add(buildTitleKey(game.title.replace(DISC_SUFFIX, '')));
    index.set(game.system, titles);
  }
  return index;
};

export const hasRomForGame = (romIndex, raGame) => {
  const titles = romIndex.get(RA_SYSTEM_IDS[raGame.ConsoleName]);
  if (!titles) return false;
  const key = buildTitleKey(raGame.Title);
  if (titles.has(key)) return true;
  return [...titles].some(
    (localKey) =>
      key.length > MIN_PREFIX_MATCH_LENGTH &&
      localKey.length > MIN_PREFIX_MATCH_LENGTH &&
      (key.startsWith(localKey) || localKey.startsWith(key)),
  );
};

const compareTitles = (first, second) =>
  first.Title.localeCompare(second.Title, LOCALE, { sensitivity: 'base' });

const calculateGameProgress = (game) => (game.MaxPossible ? game.NumAwarded / game.MaxPossible : 0);

const GAME_COMPARATORS = {
  progress: (first, second) =>
    calculateGameProgress(second) - calculateGameProgress(first) || compareTitles(first, second),
  az: compareTitles,
  za: (first, second) => compareTitles(second, first),
  recent: (first, second) =>
    String(second.MostRecentAwardedDate || '').localeCompare(
      String(first.MostRecentAwardedDate || ''),
    ),
};

export const listVisibleGames = ({ games, systemFilter, isRomOnly, query, sort, hasRom }) => {
  const queryKey = buildTitleKey(query);
  const visibleGames = games.filter(
    (game) =>
      (systemFilter === 'all' || game.ConsoleName === systemFilter) &&
      (!isRomOnly || hasRom(game)) &&
      (!queryKey || buildTitleKey(game.Title).includes(queryKey)),
  );
  return [...visibleGames].sort(GAME_COMPARATORS[sort] || GAME_COMPARATORS.recent);
};

export const countGamesByConsole = (games) =>
  games.reduce(
    (counts, game) => ({ ...counts, [game.ConsoleName]: (counts[game.ConsoleName] || 0) + 1 }),
    {},
  );

export const listSystemFilterIds = (games) => [
  'all',
  ...[...new Set(games.map((game) => game.ConsoleName))].sort(),
];

export const findCycledId = (ids, currentId, delta) =>
  ids[(ids.indexOf(currentId) + delta + ids.length) % ids.length];

const compareEarnedDates = (first, second) => {
  if (first.earned && second.earned)
    return String(second.earned).localeCompare(String(first.earned));
  if (first.earned) return -1;
  return second.earned ? 1 : 0;
};

const ACHIEVEMENT_COMPARATORS = {
  rarity: (first, second) => first.pct - second.pct,
  default: (first, second) =>
    (first.DisplayOrder || 0) - (second.DisplayOrder || 0) || first.ID - second.ID,
  earned: compareEarnedDates,
  type: (first, second) =>
    TIER_ORDER[first.tier] - TIER_ORDER[second.tier] || first.pct - second.pct,
};

const buildPlatinumTrophy = (game, achievements, players, isMastered) => ({
  platinum: true,
  tier: 'platinum',
  Title: `${game.Title}`,
  Description: 'Obtenha todas as conquistas deste jogo.',
  earned: isMastered
    ? achievements.reduce(
        (latest, achievement) =>
          String(achievement.earned) > String(latest) ? achievement.earned : latest,
        '',
      )
    : null,
  pct: players
    ? (100 * Math.min(...achievements.map((achievement) => achievement.NumAwarded || 0))) / players
    : 0,
});

const ACHIEVEMENT_FILTER_PREDICATES = {
  earned: (achievement) => achievement.earned,
  locked: (achievement) => !achievement.earned,
};

export const buildAchievementList = ({ rules, game, sort, filter }) => {
  const players = findPlayerCount(game);
  const achievements = Object.values(game.Achievements || {})
    .map((achievement) => {
      const percent = players ? (100 * (achievement.NumAwarded || 0)) / players : 100;
      return {
        ...achievement,
        tier: calculateTrophyTier(rules, achievement.Points, players ? percent : null),
        earned: achievement.DateEarnedHardcore || achievement.DateEarned,
        pct: percent,
      };
    })
    .sort(ACHIEVEMENT_COMPARATORS[sort]);
  const total = achievements.length;
  const earnedCount = achievements.filter((achievement) => achievement.earned).length;
  const isMastered = total > 0 && earnedCount === total;
  const withPlatinum = total
    ? [buildPlatinumTrophy(game, achievements, players, isMastered), ...achievements]
    : achievements;
  const predicate = ACHIEVEMENT_FILTER_PREDICATES[filter];
  return {
    list: predicate ? withPlatinum.filter(predicate) : withPlatinum,
    total,
    got: earnedCount,
    mastered: isMastered,
  };
};
