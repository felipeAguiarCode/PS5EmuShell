import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildGamesById,
  findEmulatorForGame,
  formatComboId,
  isMotionEnabled,
  isParticlesEnabled,
  resolveParticleLevel,
} from '../../src/renderer/scripts/core/selectors.js';

const SYSTEM = {
  id: 'ps2',
  defaultEmulator: 'pcsx2',
  emulators: [
    { id: 'aethersx2', name: 'AetherSX2' },
    { id: 'pcsx2', name: 'PCSX2' },
  ],
};

const buildState = (gameStats = {}) => ({
  config: { systems: [SYSTEM, { id: 'pc', emulators: [] }] },
  stats: { games: { g1: gameStats } },
  gamesById: buildGamesById([]),
});

describe('findEmulatorForGame', () => {
  it('uses the system default emulator', () => {
    assert.equal(findEmulatorForGame(buildState(), { id: 'g1', system: 'ps2' }).name, 'PCSX2');
  });

  it('prefers the per game override', () => {
    const state = buildState({ emulator: 'aethersx2' });
    assert.equal(findEmulatorForGame(state, { id: 'g1', system: 'ps2' }).name, 'AetherSX2');
  });

  it('runs native games with Windows', () => {
    assert.deepEqual(findEmulatorForGame(buildState(), { id: 'g1', system: 'pc', native: true }), {
      id: 'windows',
      name: 'Windows',
    });
  });

  it('returns an empty emulator for unknown systems', () => {
    assert.deepEqual(findEmulatorForGame(buildState(), { id: 'g1', system: 'nope' }), {});
  });
});

describe('appearance selectors', () => {
  it('treats missing appearance as motion enabled', () => {
    assert.equal(isMotionEnabled(null), true);
    assert.equal(isMotionEnabled({ appearance: { motion: false } }), false);
  });

  it('disables particles on the light theme', () => {
    assert.equal(isParticlesEnabled({ particles: true, appearance: { theme: 'light' } }), false);
    assert.equal(isParticlesEnabled({ particles: true, appearance: {} }), true);
    assert.equal(isParticlesEnabled({ particles: 'off', appearance: {} }), false);
  });

  it('resolves the particle level from new and legacy values', () => {
    assert.equal(resolveParticleLevel({ particles: 'light' }), 'light');
    assert.equal(resolveParticleLevel({ particles: 'off' }), 'off');
    assert.equal(resolveParticleLevel({ particles: true }), 'full');
    assert.equal(resolveParticleLevel({ particles: false }), 'off');
    assert.equal(resolveParticleLevel({}), 'full');
    assert.equal(resolveParticleLevel(null), 'full');
  });

  it('joins combo buttons', () => {
    assert.equal(formatComboId({ buttons: ['back', 'start'] }), 'back+start');
    assert.equal(formatComboId(undefined), '');
  });
});
