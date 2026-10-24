import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  countLibraryGames,
  filterLibraryGames,
  formatGameCount,
} from '../../src/renderer/scripts/views/library/library-filters.js';

const GAMES = [
  { id: 'a', title: 'Zelda', file: 'zelda.nds', system: 'nds', added: 1 },
  { id: 'b', title: 'ape escape', file: 'ape.bin', system: 'psx', added: 3 },
  { id: 'c', title: 'Crash', file: 'crash.bin', system: 'psx', added: 2 },
];
const STATS = {
  a: { favorite: true, lastPlayed: 10, playTime: 5 },
  c: { lastPlayed: 20, playTime: 50 },
};

const listIds = (options) =>
  filterLibraryGames({
    games: GAMES,
    gameStats: STATS,
    filter: 'all',
    sort: 'az',
    query: '',
    ...options,
  }).map((game) => game.id);

describe('filterLibraryGames', () => {
  it('sorts by title by default', () => {
    assert.deepEqual(listIds({}), ['b', 'c', 'a']);
  });

  it('filters favorites, played games and systems', () => {
    assert.deepEqual(listIds({ filter: 'fav' }), ['a']);
    assert.deepEqual(listIds({ filter: 'psx' }), ['b', 'c']);
  });

  it('sorts the played filter by recency when the sort is by name', () => {
    assert.deepEqual(listIds({ filter: 'recent' }), ['c', 'a']);
  });

  it('applies the chosen sort', () => {
    assert.deepEqual(listIds({ sort: 'played' }), ['c', 'a', 'b']);
    assert.deepEqual(listIds({ sort: 'added' }), ['b', 'c', 'a']);
  });

  it('searches title and file name without case', () => {
    assert.deepEqual(listIds({ query: '  CRASH ' }), ['c']);
    assert.deepEqual(listIds({ query: 'ape.bin' }), ['b']);
  });
});

describe('countLibraryGames', () => {
  it('counts per system, favorites and played games', () => {
    assert.deepEqual(countLibraryGames({ games: GAMES, gameStats: STATS }), {
      bySystem: { nds: 1, psx: 2 },
      favorites: 1,
      recent: 2,
    });
  });
});

describe('formatGameCount', () => {
  it('uses the singular for one game', () => {
    assert.equal(formatGameCount(1), '1 jogo');
    assert.equal(formatGameCount(3), '3 jogos');
  });
});
