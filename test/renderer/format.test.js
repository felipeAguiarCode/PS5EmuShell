import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  formatDuration,
  formatFileSize,
  formatTimeAgo,
} from '../../src/renderer/scripts/core/format.js';

const MINUTE_MS = 60000;
const NOW = Date.UTC(2026, 9, 24, 12);

describe('formatDuration', () => {
  it('formats empty, short, minute and hour durations', () => {
    assert.equal(formatDuration(0), '—');
    assert.equal(formatDuration(30000), 'menos de 1 min');
    assert.equal(formatDuration(42 * MINUTE_MS), '42 min');
    assert.equal(formatDuration(120 * MINUTE_MS), '2 h');
    assert.equal(formatDuration(135 * MINUTE_MS), '2 h 15 min');
  });
});

describe('formatTimeAgo', () => {
  it('describes recent timestamps relative to now', () => {
    assert.equal(formatTimeAgo(null, NOW), 'Nunca jogado');
    assert.equal(formatTimeAgo(NOW - 10000, NOW), 'Agora mesmo');
    assert.equal(formatTimeAgo(NOW - 5 * MINUTE_MS, NOW), 'Há 5 min');
    assert.equal(formatTimeAgo(NOW - 3 * 60 * MINUTE_MS, NOW), 'Há 3 h');
    assert.equal(formatTimeAgo(NOW - 24 * 60 * MINUTE_MS, NOW), 'Ontem');
    assert.equal(formatTimeAgo(NOW - 5 * 24 * 60 * MINUTE_MS, NOW), 'Há 5 dias');
  });
});

describe('formatFileSize', () => {
  it('uses one decimal below ten units', () => {
    assert.equal(formatFileSize(0), '—');
    assert.equal(formatFileSize(512), '512 B');
    assert.equal(formatFileSize(1536), '1.5 KB');
    assert.equal(formatFileSize(4.7 * 1024 ** 3), '4.7 GB');
    assert.equal(formatFileSize(700 * 1024 ** 2), '700 MB');
  });
});
