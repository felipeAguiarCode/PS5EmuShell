import { queryOne } from '../core/dom.js';

const SPRITE_SIZE = 64;
const MAX_DEVICE_PIXEL_RATIO = 2;
const MAX_FRAME_SECONDS = 0.05;
const RESPAWN_MARGIN_PX = 40;
const TAU = Math.PI * 2;

export const PARTICLE_BUDGETS = {
  background: {
    light: { orbs: 22, sparkles: 0, waves: 0 },
    full: { orbs: 34, sparkles: 40, waves: 0 },
  },
  welcome: {
    light: { orbs: 26, sparkles: 20, waves: 0 },
    full: { orbs: 42, sparkles: 80, waves: 3 },
  },
};

export const findParticleBudget = (scene, level) => PARTICLE_BUDGETS[scene]?.[level] ?? null;

const randomBetween = (min, max, random = Math.random) => min + random() * (max - min);

export const createOrb = ({ width, height, isInitial, random = Math.random }) => ({
  baseX: random() * width,
  y: isInitial ? random() * height : height + RESPAWN_MARGIN_PX,
  radius: randomBetween(5, 20, random),
  riseSpeed: randomBetween(5, 18, random),
  swayAmplitude: randomBetween(12, 46, random),
  swaySpeed: randomBetween(0.15, 0.45, random),
  alpha: randomBetween(0.06, 0.3, random),
  phase: random() * TAU,
});

export const createSparkle = ({ width, height, isInitial, random = Math.random }) => ({
  baseX: random() * width,
  y: isInitial ? random() * height : height + RESPAWN_MARGIN_PX,
  radius: randomBetween(1, 2.6, random),
  riseSpeed: randomBetween(3, 11, random),
  orbitRadius: randomBetween(4, 18, random),
  orbitSpeed: randomBetween(0.3, 0.9, random),
  twinkleSpeed: randomBetween(1.2, 3.2, random),
  alpha: randomBetween(0.35, 0.9, random),
  phase: random() * TAU,
});

export const createWave = (index, count) => ({
  heightRatio: 0.62 + (index / Math.max(count, 1)) * 0.22,
  amplitude: 38 + index * 16,
  wavelength: 520 + index * 180,
  speed: 0.18 + index * 0.07,
  thickness: 46 - index * 10,
  alpha: 0.05 - index * 0.01,
  phase: index * 1.7,
});

export const advanceRise = (particle, seconds) => ({
  ...particle,
  y: particle.y - particle.riseSpeed * seconds,
});

export const hasLeftTop = (particle) => particle.y < -RESPAWN_MARGIN_PX;

export const calculateOrbX = (orb, seconds) =>
  orb.baseX + Math.sin(seconds * orb.swaySpeed * TAU + orb.phase) * orb.swayAmplitude;

export const calculateSparkleX = (sparkle, seconds) =>
  sparkle.baseX +
  Math.cos(seconds * sparkle.orbitSpeed * TAU + sparkle.phase) * sparkle.orbitRadius;

export const calculateTwinkle = (sparkle, seconds) =>
  sparkle.alpha * Math.max(0, Math.sin(seconds * sparkle.twinkleSpeed + sparkle.phase)) ** 3;

export const calculateOrbAlpha = (orb, seconds) =>
  orb.alpha * (0.6 + 0.4 * Math.sin(seconds * 0.8 + orb.phase));

export const calculateWaveY = (wave, x, height, seconds) =>
  height * wave.heightRatio +
  Math.sin((x / wave.wavelength) * TAU + seconds * wave.speed * TAU + wave.phase) * wave.amplitude +
  Math.sin((x / (wave.wavelength * 0.43)) * TAU - seconds * wave.speed * 3 + wave.phase) *
    (wave.amplitude * 0.25);

const createGlowSprite = (stops) => {
  const spriteCanvas = document.createElement('canvas');
  spriteCanvas.width = SPRITE_SIZE;
  spriteCanvas.height = SPRITE_SIZE;
  const spriteContext = spriteCanvas.getContext('2d');
  const center = SPRITE_SIZE / 2;
  const gradient = spriteContext.createRadialGradient(center, center, 0, center, center, center);
  for (const [offset, color] of stops) gradient.addColorStop(offset, color);
  spriteContext.fillStyle = gradient;
  spriteContext.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
  return spriteCanvas;
};

const createSprites = () => ({
  orb: createGlowSprite([
    [0, 'rgba(255,255,255,1)'],
    [0.2, 'rgba(200,225,255,0.6)'],
    [1, 'rgba(160,200,255,0)'],
  ]),
  sparkle: createGlowSprite([
    [0, 'rgba(255,255,255,1)'],
    [0.35, 'rgba(225,240,255,0.85)'],
    [1, 'rgba(180,215,255,0)'],
  ]),
});

const drawSprite = (context, sprite, x, y, radius) =>
  context.drawImage(sprite, x - radius, y - radius, radius * 2, radius * 2);

const drawWave = (context, wave, width, height, seconds) => {
  context.beginPath();
  for (let x = -20; x <= width + 20; x += 16) {
    const y = calculateWaveY(wave, x, height, seconds);
    if (x === -20) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.strokeStyle = 'rgb(120,170,255)';
  context.lineCap = 'round';
  context.globalAlpha = wave.alpha;
  context.lineWidth = wave.thickness;
  context.stroke();
  context.globalAlpha = wave.alpha * 2.4;
  context.lineWidth = wave.thickness * 0.3;
  context.stroke();
  context.strokeStyle = 'rgb(225,238,255)';
  context.globalAlpha = wave.alpha * 4;
  context.lineWidth = 1.4;
  context.stroke();
};

const createLayer = (scene) => {
  let canvas = null;
  let context = null;
  let sprites = null;
  let width = 0;
  let height = 0;
  let orbs = [];
  let sparkles = [];
  let waves = [];
  let activeLevel = null;
  let isRunning = false;
  let lastFrameAt = 0;

  const resize = () => {
    const pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_DEVICE_PIXEL_RATIO);
    width = canvas.clientWidth || window.innerWidth;
    height = canvas.clientHeight || window.innerHeight;
    canvas.width = width * pixelRatio;
    canvas.height = height * pixelRatio;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  };

  const populate = (budget) => {
    const area = { width, height, isInitial: true };
    orbs = Array.from({ length: budget.orbs }, () => createOrb(area));
    sparkles = Array.from({ length: budget.sparkles }, () => createSparkle(area));
    waves = Array.from({ length: budget.waves }, (_, index) => createWave(index, budget.waves));
  };

  const respawnOrMove = (particle, seconds, create) =>
    hasLeftTop(particle)
      ? create({ width, height, isInitial: false })
      : advanceRise(particle, seconds);

  const drawFrame = (time) => {
    if (!isRunning) return;
    const frameSeconds = Math.min(MAX_FRAME_SECONDS, (time - lastFrameAt) / 1000 || 0);
    const seconds = time / 1000;
    lastFrameAt = time;
    orbs = orbs.map((orb) => respawnOrMove(orb, frameSeconds, createOrb));
    sparkles = sparkles.map((sparkle) => respawnOrMove(sparkle, frameSeconds, createSparkle));
    context.clearRect(0, 0, width, height);
    context.globalCompositeOperation = 'lighter';
    for (const wave of waves) drawWave(context, wave, width, height, seconds);
    for (const orb of orbs) {
      context.globalAlpha = calculateOrbAlpha(orb, seconds);
      drawSprite(context, sprites.orb, calculateOrbX(orb, seconds), orb.y, orb.radius);
    }
    for (const sparkle of sparkles) {
      const alpha = calculateTwinkle(sparkle, seconds);
      if (alpha < 0.01) continue;
      context.globalAlpha = alpha;
      drawSprite(
        context,
        sprites.sparkle,
        calculateSparkleX(sparkle, seconds),
        sparkle.y,
        sparkle.radius * 3,
      );
    }
    context.globalCompositeOperation = 'source-over';
    context.globalAlpha = 1;
    requestAnimationFrame(drawFrame);
  };

  const bind = (canvasElement) => {
    canvas = canvasElement;
    context = canvas.getContext('2d');
    window.addEventListener('resize', () => {
      if (!isRunning) return;
      resize();
      populate(findParticleBudget(scene, activeLevel));
    });
  };

  const start = (level) => {
    const budget = findParticleBudget(scene, level);
    if (!canvas || !budget) {
      stop();
      return;
    }
    sprites ??= createSprites();
    canvas.style.display = '';
    resize();
    if (level !== activeLevel || !orbs.length) populate(budget);
    activeLevel = level;
    if (isRunning) return;
    isRunning = true;
    requestAnimationFrame((time) => {
      lastFrameAt = time;
      drawFrame(time);
    });
  };

  const stop = () => {
    isRunning = false;
    if (!canvas) return;
    context.clearRect(0, 0, width, height);
    canvas.style.display = 'none';
  };

  return { bind, start, stop };
};

const backgroundLayer = createLayer('background');
const welcomeLayer = createLayer('welcome');

export const initParticles = () => {
  backgroundLayer.bind(queryOne('#particles'));
  welcomeLayer.bind(queryOne('#welcome-particles'));
};

export const startParticles = (level = 'full') => backgroundLayer.start(level);

export const stopParticles = () => backgroundLayer.stop();

export const startWelcomeParticles = (level = 'full') => welcomeLayer.start(level);

export const stopWelcomeParticles = () => welcomeLayer.stop();
