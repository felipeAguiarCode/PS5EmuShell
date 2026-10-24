import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { listHeldGamepadButtons } from '../../src/renderer/scripts/input/gamepad-fallback.js';
import { findKeyboardButton } from '../../src/renderer/scripts/input/keyboard-input.js';
import {
  buildBackgroundPlan,
  resolveBackgroundStyle,
} from '../../src/renderer/scripts/views/shell/background.js';
import { buildSetupSummary } from '../../src/renderer/scripts/views/shell/boot.js';
import { formatFoundGamesText } from '../../src/renderer/scripts/views/shell/library-data.js';
import { findNextView } from '../../src/renderer/scripts/views/topbar/topbar.js';

describe('buildBackgroundPlan', () => {
  it('prefers the snapshot over the cover', () => {
    const plan = buildBackgroundPlan({
      game: { snap: 'snap.png', cover: 'cover.png' },
      system: { color: '#123456' },
      appearance: {},
    });
    assert.equal(plan.kind, 'image');
    assert.equal(plan.image, 'url("snap.png")');
  });

  it('uses the cover when there is no snapshot', () => {
    const plan = buildBackgroundPlan({
      game: { cover: 'cover.png' },
      system: null,
      appearance: {},
    });
    assert.equal(plan.kind, 'image');
    assert.equal(plan.image, 'url("cover.png")');
    assert.equal(plan.key, 'cover.png');
  });

  it('falls back to the system color gradient', () => {
    const plan = buildBackgroundPlan({
      game: { cover: 'cover.png' },
      system: { color: '#123456' },
      appearance: { heroBackground: false },
    });
    assert.equal(plan.kind, 'plain');
    assert.equal(plan.key, 'sys:#123456');
    assert.match(plan.image, /#12345666 0%/);
  });
});

describe('resolveBackgroundStyle', () => {
  it('defaults to normal and accepts the known styles', () => {
    assert.equal(resolveBackgroundStyle({}), 'normal');
    assert.equal(resolveBackgroundStyle(undefined), 'normal');
    assert.equal(resolveBackgroundStyle({ backgroundStyle: 'blur' }), 'blur');
    assert.equal(resolveBackgroundStyle({ backgroundStyle: 'dark' }), 'dark');
    assert.equal(resolveBackgroundStyle({ backgroundStyle: 'sepia' }), 'normal');
  });
});

describe('buildSetupSummary', () => {
  it('pluralizes folders and lists emulator names', () => {
    assert.equal(
      buildSetupSummary({
        missingDirs: [{}, {}],
        missingEmulators: [{ name: 'PCSX2' }],
      }),
      '2 pastas e 1 emulador (PCSX2)',
    );
  });
});

describe('navigation helpers', () => {
  it('finds the next tab or nothing at the edges', () => {
    assert.equal(findNextView('home', 1), 'library');
    assert.equal(findNextView('home', -1), undefined);
    assert.equal(findNextView('trophies', 1), undefined);
  });

  it('maps keyboard keys case-insensitively', () => {
    assert.equal(findKeyboardButton('ArrowUp'), 'up');
    assert.equal(findKeyboardButton('Q'), 'lb');
    assert.equal(findKeyboardButton('z'), undefined);
  });

  it('reads gamepad buttons and sticks', () => {
    const gamepad = {
      buttons: [{ pressed: true }, { pressed: false }],
      axes: [-0.9, 0.7],
    };
    assert.deepEqual([...listHeldGamepadButtons([null, gamepad])].sort(), ['a', 'down', 'left']);
  });

  it('formats the rescan count', () => {
    assert.equal(formatFoundGamesText(1), '1 jogo encontrado.');
    assert.equal(formatFoundGamesText(3), '3 jogos encontrados.');
  });
});
