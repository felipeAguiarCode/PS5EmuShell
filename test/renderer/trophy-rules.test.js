import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildAchievementList,
  buildRomIndex,
  buildTitleKey,
  calculateRarityLabel,
  calculateTrophyTier,
  countTrophyTiers,
  findConsoleTag,
  findCycledId,
  hasRomForGame,
  isGameMastered,
  listVisibleGames,
  readTrophyRules,
} from '../../src/renderer/scripts/views/trophies/trophy-rules.js';

describe('calculateTrophyTier', () => {
  it('uses points by default', () => {
    assert.equal(calculateTrophyTier({}, 25, 50), 'gold');
    assert.equal(calculateTrophyTier({}, 10, 50), 'silver');
    assert.equal(calculateTrophyTier({}, 5, 50), 'bronze');
  });

  it('uses the unlock percentage in rarity mode', () => {
    const rules = { tierMode: 'rarity' };
    assert.equal(calculateTrophyTier(rules, 1, 8), 'gold');
    assert.equal(calculateTrophyTier(rules, 1, 20), 'silver');
    assert.equal(calculateTrophyTier(rules, 1, 60), 'bronze');
    assert.equal(calculateTrophyTier(rules, 30, null), 'gold');
  });
});

describe('calculateRarityLabel', () => {
  it('follows the PS5 rarity bands', () => {
    assert.equal(calculateRarityLabel({}, 4), 'Ultra raro');
    assert.equal(calculateRarityLabel({}, 12), 'Muito raro');
    assert.equal(calculateRarityLabel({}, 40), 'Raro');
    assert.equal(calculateRarityLabel({}, 80), 'Comum');
    assert.equal(calculateRarityLabel({ rarePct: 90 }, 80), 'Raro');
  });
});

describe('readTrophyRules', () => {
  it('returns an empty object without config', () => {
    assert.deepEqual(readTrophyRules(null), {});
    assert.deepEqual(readTrophyRules({ trophies: { goldPoints: 30 } }), { goldPoints: 30 });
  });
});

describe('buildTitleKey', () => {
  it('ignores tags, articles, accents and punctuation', () => {
    assert.equal(buildTitleKey('Legend of Zelda, The (USA)'), 'legendofzelda');
    assert.equal(buildTitleKey('The Legend of Zelda'), 'legendofzelda');
    assert.equal(buildTitleKey('Pokémon Ruby & Sapphire'), 'pokemonrubyandsapphire');
  });
});

describe('findConsoleTag', () => {
  it('uses known tags and falls back to initials', () => {
    assert.equal(findConsoleTag('PlayStation 2'), 'PS2');
    assert.equal(findConsoleTag('Neo Geo Pocket'), 'NGP');
  });
});

describe('rom matching', () => {
  const romIndex = buildRomIndex([
    { system: 'ps2', title: 'Gran Turismo 4' },
    { system: 'psx', title: 'Final Fantasy VII (Disco 1)' },
  ]);

  it('matches the same title on the mapped system', () => {
    assert.equal(
      hasRomForGame(romIndex, { ConsoleName: 'PlayStation 2', Title: 'Gran Turismo 4' }),
      true,
    );
    assert.equal(
      hasRomForGame(romIndex, { ConsoleName: 'PlayStation', Title: 'Final Fantasy VII' }),
      true,
    );
  });

  it('accepts long prefixes and rejects other systems', () => {
    assert.equal(
      hasRomForGame(romIndex, { ConsoleName: 'PlayStation 2', Title: 'Gran Turismo 4 Prologue' }),
      true,
    );
    assert.equal(
      hasRomForGame(romIndex, { ConsoleName: 'GameCube', Title: 'Gran Turismo 4' }),
      false,
    );
  });
});

describe('isGameMastered', () => {
  it('detects mastery by award kind or full progress', () => {
    assert.equal(isGameMastered({ HighestAwardKind: 'mastered' }), true);
    assert.equal(isGameMastered({ MaxPossible: 10, NumAwarded: 10 }), true);
    assert.equal(isGameMastered({ MaxPossible: 10, NumAwarded: 9 }), false);
  });
});

describe('listVisibleGames', () => {
  const games = [
    {
      Title: 'Beta',
      ConsoleName: 'GameCube',
      MaxPossible: 10,
      NumAwarded: 5,
      MostRecentAwardedDate: '2026-01-02',
    },
    {
      Title: 'Alpha',
      ConsoleName: 'PlayStation',
      MaxPossible: 10,
      NumAwarded: 9,
      MostRecentAwardedDate: '2026-01-01',
    },
  ];
  const base = { games, systemFilter: 'all', isRomOnly: false, query: '', hasRom: () => true };

  it('sorts by recent, name and progress', () => {
    assert.deepEqual(
      listVisibleGames({ ...base, sort: 'recent' }).map((game) => game.Title),
      ['Beta', 'Alpha'],
    );
    assert.deepEqual(
      listVisibleGames({ ...base, sort: 'az' }).map((game) => game.Title),
      ['Alpha', 'Beta'],
    );
    assert.deepEqual(
      listVisibleGames({ ...base, sort: 'progress' }).map((game) => game.Title),
      ['Alpha', 'Beta'],
    );
  });

  it('filters by system and query', () => {
    assert.deepEqual(
      listVisibleGames({ ...base, sort: 'az', systemFilter: 'GameCube' }).map((game) => game.Title),
      ['Beta'],
    );
    assert.deepEqual(
      listVisibleGames({ ...base, sort: 'az', query: 'alp' }).map((game) => game.Title),
      ['Alpha'],
    );
  });
});

describe('findCycledId', () => {
  it('wraps around in both directions', () => {
    assert.equal(findCycledId(['a', 'b', 'c'], 'c', 1), 'a');
    assert.equal(findCycledId(['a', 'b', 'c'], 'a', -1), 'c');
  });
});

describe('achievement lists', () => {
  const game = {
    Title: 'Game',
    NumDistinctPlayers: 100,
    Achievements: {
      1: { ID: 1, Points: 30, NumAwarded: 5, DateEarned: '2026-01-01 10:00:00', DisplayOrder: 2 },
      2: { ID: 2, Points: 5, NumAwarded: 80, DisplayOrder: 1 },
    },
  };

  it('counts earned and total trophies per tier', () => {
    assert.deepEqual(countTrophyTiers({}, game), { gold: [1, 1], silver: [0, 0], bronze: [0, 1] });
  });

  it('puts the platinum first and sorts by rarity', () => {
    const result = buildAchievementList({ rules: {}, game, sort: 'rarity', filter: 'all' });
    assert.deepEqual(
      result.list.map((item) => item.tier),
      ['platinum', 'gold', 'bronze'],
    );
    assert.equal(result.total, 2);
    assert.equal(result.got, 1);
    assert.equal(result.mastered, false);
    assert.equal(result.list[0].pct, 5);
  });

  it('filters locked trophies', () => {
    const result = buildAchievementList({ rules: {}, game, sort: 'default', filter: 'locked' });
    assert.deepEqual(
      result.list.map((item) => item.ID ?? 'platinum'),
      ['platinum', 2],
    );
  });
});
