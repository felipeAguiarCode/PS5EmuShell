import { queryOne } from '../core/dom.js';

const PARTICLE_COUNT = 46;
const SPRITE_SIZE = 64;
const MAX_DEVICE_PIXEL_RATIO = 2;
const MAX_FRAME_SECONDS = 0.05;

let canvas = null;
let context = null;
let width = 0;
let height = 0;
let particles = [];
let isRunning = false;
let lastFrameAt = 0;
let sprite = null;

const createSprite = () => {
  const spriteCanvas = document.createElement('canvas');
  spriteCanvas.width = SPRITE_SIZE;
  spriteCanvas.height = SPRITE_SIZE;
  const spriteContext = spriteCanvas.getContext('2d');
  const center = SPRITE_SIZE / 2;
  const gradient = spriteContext.createRadialGradient(center, center, 0, center, center, center);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.2, 'rgba(200,225,255,0.6)');
  gradient.addColorStop(1, 'rgba(160,200,255,0)');
  spriteContext.fillStyle = gradient;
  spriteContext.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
  return spriteCanvas;
};

const resizeCanvas = () => {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_DEVICE_PIXEL_RATIO);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width * pixelRatio;
  canvas.height = height * pixelRatio;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
};

const createParticle = (isInitial) => ({
  x: Math.random() * width,
  y: isInitial ? Math.random() * height : height + 20,
  radius: 4 + Math.random() * 14,
  speedY: 6 + Math.random() * 16,
  speedX: (Math.random() - 0.5) * 6,
  alpha: 0.05 + Math.random() * 0.3,
  phase: Math.random() * Math.PI * 2,
});

const moveParticle = (particle, seconds, time) => {
  const y = particle.y - particle.speedY * seconds;
  if (y < -30) return createParticle(false);
  return {
    ...particle,
    y,
    x: particle.x + particle.speedX * seconds + Math.sin(time / 2400 + particle.phase) * 0.15,
  };
};

const drawFrame = (time) => {
  if (!isRunning) return;
  const seconds = Math.min(MAX_FRAME_SECONDS, (time - lastFrameAt) / 1000 || 0);
  lastFrameAt = time;
  context.clearRect(0, 0, width, height);
  particles = particles.map((particle) => moveParticle(particle, seconds, time));
  for (const particle of particles) {
    context.globalAlpha = particle.alpha * (0.6 + 0.4 * Math.sin(time / 1200 + particle.phase));
    context.drawImage(
      sprite,
      particle.x - particle.radius,
      particle.y - particle.radius,
      particle.radius * 2,
      particle.radius * 2,
    );
  }
  requestAnimationFrame(drawFrame);
};

export const initParticles = () => {
  canvas = queryOne('#particles');
  context = canvas.getContext('2d');
  window.addEventListener('resize', () => {
    if (isRunning) resizeCanvas();
  });
};

export const startParticles = () => {
  if (isRunning) return;
  sprite ??= createSprite();
  resizeCanvas();
  if (!particles.length)
    particles = Array.from({ length: PARTICLE_COUNT }, () => createParticle(true));
  isRunning = true;
  canvas.style.display = '';
  requestAnimationFrame((time) => {
    lastFrameAt = time;
    drawFrame(time);
  });
};

export const stopParticles = () => {
  isRunning = false;
  context.clearRect(0, 0, width, height);
  canvas.style.display = 'none';
};
