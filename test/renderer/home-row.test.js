import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  LIBRARY_ITEM_KEY,
  buildHomeChips,
  buildHomeItems,
  calculateCycledValue,
  calculateTileOffset,
  calculateVisibleRange,
  findItemIndex,
  resolveActiveFilter,
} from '../../src/renderer/scripts/views/home/home-row.js';

const GAMES = [
  { id: 'a', title: 'Zelda', system: 'nds' },
  { id: 'b', title: 'ape escape', system: 'psx' },
  { id: 'c', title: 'Crash', system: 'psx' },
];

describe('buildHomeItems', () => {
  it('orders by last played, then by title, and appends the library tile', () => {
    const items = buildHomeItems({
      games: GAMES,
      filter: 'all',
      gameStats: { a: { lastPlayed: 5 } },
    });
    assert.deepEqual(
      items.map((item) => item.key),
      ['a', 'b', 'c', LIBRARY_ITEM_KEY],
    );
  });

  it('filters by system', () => {
    const items = buildHomeItems({ games: GAMES, filter: 'psx', gameStats: {} });
    assert.deepEqual(
      items.map((item) => item.key),
      ['b', 'c', LIBRARY_ITEM_KEY],
    );
  });

  it('has no library tile without games', () => {
    assert.deepEqual(buildHomeItems({ games: [], filter: 'all', gameStats: {} }), []);
  });
});

describe('buildHomeChips', () => {
  it('lists the all chip and only systems that have games', () => {
    const chips = buildHomeChips({
      games: GAMES,
      systems: [{ id: 'psx' }, { id: 'ps2' }, { id: 'nds' }],
    });
    assert.deepEqual(
      chips.map((chip) => [chip.id, chip.count]),
      [
        ['all', 3],
        ['psx', 2],
        ['nds', 1],
      ],
    );
  });
});

describe('row helpers', () => {
  it('falls back to all when the filtered system has no games', () => {
    assert.equal(resolveActiveFilter('gc', GAMES), 'all');
    assert.equal(resolveActiveFilter('psx', GAMES), 'psx');
  });

  it('finds an item index or the first item', () => {
    const items = [{ key: 'x' }, { key: 'y' }];
    assert.equal(findItemIndex(items, 'y'), 1);
    assert.equal(findItemIndex(items, 'z'), 0);
  });

  it('cycles values in both directions', () => {
    assert.equal(calculateCycledValue(['a', 'b', 'c'], 'c', 1), 'a');
    assert.equal(calculateCycledValue(['a', 'b', 'c'], 'a', -1), 'c');
  });

  it('keeps two tiles before the selection and enough to fill the row', () => {
    assert.deepEqual(
      calculateVisibleRange({ selectedIndex: 5, itemCount: 40, rowWidth: 1000, stride: 128 }),
      { from: 3, to: 14 },
    );
  });

  it('pushes tiles after the selection by the enlarged size', () => {
    const base = { selectedIndex: 2, stride: 128, selectedSize: 185.6, tileSize: 116 };
    assert.equal(calculateTileOffset({ ...base, index: 1 }), -128);
    assert.equal(calculateTileOffset({ ...base, index: 2 }), 0);
    assert.ok(Math.abs(calculateTileOffset({ ...base, index: 3 }) - 201.6) < 1e-9);
  });
});
