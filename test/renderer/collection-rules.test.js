import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
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
} from '../../src/renderer/scripts/views/collections/collection-rules.js';

describe('collection counts', () => {
  it('uses singular and plural forms', () => {
    assert.equal(formatGameCount(1), '1 jogo');
    assert.equal(formatGameCount(3), '3 jogos');
    assert.equal(formatCollectionCount(1), '1 coleção');
    assert.equal(formatCollectionCount(0), '0 coleções');
  });
});

describe('buildCollection', () => {
  it('derives the id from the creation time', () => {
    assert.deepEqual(buildCollection({ name: 'NFS', gameIds: ['g1'], now: 36 }), {
      id: 'c10',
      name: 'NFS',
      games: ['g1'],
      created: 36,
    });
  });
});

describe('listCollectionGames', () => {
  it('keeps the collection order and drops missing games', () => {
    const gamesById = new Map([
      ['a', { id: 'a' }],
      ['b', { id: 'b' }],
    ]);
    assert.deepEqual(listCollectionGames(gamesById, { games: ['b', 'x', 'a'] }), [
      { id: 'b' },
      { id: 'a' },
    ]);
    assert.deepEqual(listCollectionGames(gamesById, undefined), []);
  });
});

describe('findNameMatches', () => {
  it('matches title or file name and skips games already in the collection', () => {
    const games = [
      { id: '1', title: 'Need for Speed Underground', base: 'nfsu' },
      { id: '2', title: 'Other', base: 'need for speed carbon' },
      { id: '3', title: 'Need for Speed', base: 'nfs' },
      { id: '4', title: 'Gran Turismo', base: 'gt' },
    ];
    const matches = findNameMatches(games, { name: 'Need for Speed', games: ['3'] });
    assert.deepEqual(
      matches.map((game) => game.id),
      ['1', '2'],
    );
  });
});

describe('formatMatchPreview', () => {
  it('lists up to six titles with an ellipsis', () => {
    const games = Array.from({ length: 7 }, (_, index) => ({ title: `G${index}` }));
    assert.equal(formatMatchPreview(games), 'G0, G1, G2, G3, G4, G5…');
    assert.equal(formatMatchPreview(games.slice(0, 2)), 'G0, G1');
  });
});

describe('withGameToggled', () => {
  const collection = { id: 'c', games: ['a'] };

  it('toggles when no state is given', () => {
    assert.deepEqual(withGameToggled(collection, 'b').games, ['a', 'b']);
    assert.deepEqual(withGameToggled(collection, 'a').games, []);
  });

  it('respects an explicit state without mutating', () => {
    assert.equal(withGameToggled(collection, 'a', true), collection);
    assert.deepEqual(withGameToggled(collection, 'a', false).games, []);
    assert.deepEqual(collection.games, ['a']);
  });
});

describe('mergePickedGameIds', () => {
  it('keeps the existing order and appends new picks', () => {
    assert.deepEqual(mergePickedGameIds(['a', 'b', 'c'], new Set(['c', 'd', 'a'])), [
      'a',
      'c',
      'd',
    ]);
  });
});

describe('withCollectionReplaced', () => {
  it('replaces by id', () => {
    const result = withCollectionReplaced([{ id: 'a', name: 'A' }, { id: 'b' }], {
      id: 'a',
      name: 'Z',
    });
    assert.deepEqual(result, [{ id: 'a', name: 'Z' }, { id: 'b' }]);
  });
});

describe('mosaic and systems', () => {
  const games = [
    { cover: 'a.png', system: 'ps2' },
    { cover: null, system: 'ps2' },
    { cover: 'c.png', system: 'psx' },
  ];

  it('lists only covers when cover art is enabled', () => {
    assert.equal(listMosaicCovers(games, true).length, 2);
    assert.deepEqual(listMosaicCovers(games, false), []);
  });

  it('joins unique system short names', () => {
    const shortNames = { ps2: 'PS2', psx: 'PS1' };
    assert.equal(
      formatSystemNames(games, (id) => shortNames[id]),
      'PS2 · PS1',
    );
  });
});
