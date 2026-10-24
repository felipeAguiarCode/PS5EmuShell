import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  PARTICLE_BUDGETS,
  advanceRise,
  calculateOrbX,
  calculateSparkleX,
  calculateTwinkle,
  calculateWaveY,
  createOrb,
  createSparkle,
  createWave,
  findParticleBudget,
  hasLeftTop,
} from '../../src/renderer/scripts/ui/particles.js';

const fixedRandom = () => 0.5;
const AREA = { width: 1000, height: 600, random: fixedRandom };

describe('particle budgets', () => {
  it('has fewer particles on the light level than on the full level', () => {
    for (const scene of Object.keys(PARTICLE_BUDGETS)) {
      const light = findParticleBudget(scene, 'light');
      const full = findParticleBudget(scene, 'full');
      assert.ok(light.orbs + light.sparkles < full.orbs + full.sparkles);
    }
  });

  it('only draws waves on the welcome screen at full level', () => {
    assert.equal(findParticleBudget('welcome', 'full').waves > 0, true);
    assert.equal(findParticleBudget('welcome', 'light').waves, 0);
    assert.equal(findParticleBudget('background', 'full').waves, 0);
  });

  it('returns nothing when particles are off or the scene is unknown', () => {
    assert.equal(findParticleBudget('background', 'off'), null);
    assert.equal(findParticleBudget('menu', 'full'), null);
  });
});

describe('particle movement', () => {
  it('spreads initial particles over the screen and respawns below it', () => {
    assert.equal(createOrb({ ...AREA, isInitial: true }).y, 300);
    assert.equal(createSparkle({ ...AREA, isInitial: false }).y, 640);
  });

  it('rises over time and leaves through the top', () => {
    const orb = { ...createOrb({ ...AREA, isInitial: true }), y: 10, riseSpeed: 20 };
    const moved = advanceRise(orb, 2);
    assert.equal(moved.y, -30);
    assert.equal(hasLeftTop(moved), false);
    assert.equal(hasLeftTop(advanceRise(moved, 1)), true);
  });

  it('sways around its base position', () => {
    const orb = { ...createOrb({ ...AREA, isInitial: true }), phase: 0, swaySpeed: 0.25 };
    assert.equal(calculateOrbX(orb, 0), orb.baseX);
    assert.equal(Math.round(calculateOrbX(orb, 1)), Math.round(orb.baseX + orb.swayAmplitude));
    const sparkle = { ...createSparkle({ ...AREA, isInitial: true }), phase: 0 };
    assert.equal(calculateSparkleX(sparkle, 0), sparkle.baseX + sparkle.orbitRadius);
  });

  it('twinkles between dark and its full alpha', () => {
    const sparkle = { ...createSparkle({ ...AREA, isInitial: true }), phase: 0, twinkleSpeed: 1 };
    assert.equal(calculateTwinkle(sparkle, 0), 0);
    assert.equal(calculateTwinkle(sparkle, Math.PI / 2), sparkle.alpha);
    assert.equal(calculateTwinkle(sparkle, Math.PI * 1.5), 0);
  });

  it('keeps waves near their band of the screen', () => {
    const wave = createWave(0, 3);
    const maxOffset = wave.amplitude * 1.25;
    for (const x of [0, 250, 500, 1000]) {
      const y = calculateWaveY(wave, x, 600, 3.7);
      assert.ok(Math.abs(y - 600 * wave.heightRatio) <= maxOffset);
    }
  });
});
