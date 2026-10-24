import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  formatAxisValue,
  formatPadButtonLabel,
  listPadTestButtons,
  renderPadDiagram,
} from '../../src/renderer/scripts/views/controllers/pad-diagram.js';
import {
  calculateExitProgress,
  calculateTriggerWidth,
  formatStickTransform,
  listPressedButtons,
  listPressedLabels,
  withTestedButtons,
} from '../../src/renderer/scripts/views/controllers/pad-test-state.js';

const IDLE_STATE = { buttons: [], lx: 0, ly: 0, rx: 0, ry: 0, lt: 0, rt: 0 };

describe('listPadTestButtons', () => {
  it('adds touchpad for PlayStation pads and mute for DualSense', () => {
    assert.equal(listPadTestButtons('xbox').length, 19);
    assert.deepEqual(listPadTestButtons('ds4').slice(-1), ['touchpad']);
    assert.deepEqual(listPadTestButtons('dualsense').slice(-2), ['touchpad', 'mute']);
  });
});

describe('formatPadButtonLabel', () => {
  it('uses arrows, PlayStation symbols and Xbox letters', () => {
    assert.equal(formatPadButtonLabel('up', 'xbox'), '↑');
    assert.equal(formatPadButtonLabel('a', 'dualsense'), '✕');
    assert.equal(formatPadButtonLabel('a', 'xbox'), 'A');
    assert.equal(formatPadButtonLabel('mute', 'dualsense'), 'Mudo');
  });
});

describe('renderPadDiagram', () => {
  it('names the share button by controller model', () => {
    assert.match(renderPadDiagram('ds4'), />SHARE</);
    assert.match(renderPadDiagram('dualsense'), />CREATE</);
    assert.match(renderPadDiagram('dualsense'), /data-b="mute"/);
    assert.match(renderPadDiagram('xbox'), />Guia</);
  });
});

describe('formatAxisValue', () => {
  it('shows a sign and two decimals', () => {
    assert.equal(formatAxisValue(0.5), '+0.50');
    assert.equal(formatAxisValue(-0.25), '−0.25');
  });
});

describe('pad test state', () => {
  it('treats lightly pressed triggers as pressed', () => {
    assert.deepEqual(
      [...listPressedButtons({ ...IDLE_STATE, buttons: ['a'], lt: 0.1 })],
      ['a', 'lt'],
    );
  });

  it('counts triggers and sticks only at full travel', () => {
    const tested = withTestedButtons(new Set(['b']), {
      ...IDLE_STATE,
      lt: 0.5,
      rt: 0.95,
      lx: 0.95,
    });
    assert.deepEqual([...tested].sort(), ['b', 'lstick', 'rt']);
  });

  it('lists pressed labels with trigger percentages', () => {
    const labels = listPressedLabels({ ...IDLE_STATE, buttons: ['a'], rt: 0.5 }, (button) =>
      button.toUpperCase(),
    );
    assert.equal(labels, 'A  RT 50%');
    assert.equal(
      listPressedLabels(IDLE_STATE, (button) => button),
      '—',
    );
  });

  it('calculates the exit hold progress', () => {
    assert.equal(calculateExitProgress(0, 5000), 0);
    assert.equal(calculateExitProgress(1000, 1750), 0.5);
    assert.equal(calculateExitProgress(1000, 9000), 1);
  });

  it('scales triggers and sticks', () => {
    assert.equal(calculateTriggerWidth(0.5), 48);
    assert.equal(calculateTriggerWidth(undefined), 0);
    assert.equal(formatStickTransform([1, -0.5]), 'translate(18.0 -9.0)');
  });
});
