import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildNavigationButtons,
  calculateButtonEvents,
  isComboHeld,
} from '../../src/main/input/button-state.js';

describe('buildNavigationButtons', () => {
  it('maps sticks and triggers to navigation buttons', () => {
    const buttons = buildNavigationButtons({ buttons: ['a'], lt: 0.9, rt: 0.1, lx: -0.8, ly: 0.7 });
    assert.deepEqual([...buttons].sort(), ['a', 'down', 'left', 'lt']);
  });
});

describe('calculateButtonEvents', () => {
  it('emits a press for a newly held button', () => {
    const result = calculateButtonEvents({
      heldButtons: new Set(['right']),
      previousButtons: new Set(),
      repeatTimers: {},
      now: 1000,
    });
    assert.deepEqual(result.presses, [{ button: 'right', isRepeat: false }]);
    assert.deepEqual(result.repeatTimers.right, { repeatCount: 0, nextAt: 1340 });
  });

  it('repeats a held direction once the timer expires', () => {
    const result = calculateButtonEvents({
      heldButtons: new Set(['right']),
      previousButtons: new Set(['right']),
      repeatTimers: { right: { repeatCount: 0, nextAt: 1340 } },
      now: 1340,
    });
    assert.deepEqual(result.presses, [{ button: 'right', isRepeat: true }]);
    assert.deepEqual(result.repeatTimers.right, { repeatCount: 1, nextAt: 1446 });
  });

  it('never repeats face buttons', () => {
    const result = calculateButtonEvents({
      heldButtons: new Set(['a']),
      previousButtons: new Set(['a']),
      repeatTimers: { a: { repeatCount: 0, nextAt: 0 } },
      now: 5000,
    });
    assert.deepEqual(result.presses, []);
  });

  it('reports released buttons', () => {
    const result = calculateButtonEvents({
      heldButtons: new Set(),
      previousButtons: new Set(['b']),
      repeatTimers: {},
      now: 0,
    });
    assert.deepEqual(result.releases, ['b']);
  });
});

describe('isComboHeld', () => {
  it('requires every combo button on the same controller', () => {
    const sets = [new Set(['back']), new Set(['start'])];
    assert.equal(isComboHeld(['back', 'start'], sets), false);
    assert.equal(isComboHeld(['back', 'start'], [new Set(['back', 'start', 'a'])]), true);
  });

  it('treats an empty combo as not held', () => {
    assert.equal(isComboHeld([], [new Set(['a'])]), false);
  });
});
