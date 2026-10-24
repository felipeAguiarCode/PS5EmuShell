import { DEFAULT_VOLUME, MOVE_SOUND_THROTTLE_MS } from '../constants/ui.js';
import { getState } from '../core/store.js';

let audioContext = null;
let masterGain = null;
let lastMoveAt = 0;

const ensureAudioContext = () => {
  const { config } = getState();
  if (!config || !config.sounds) return null;
  if (!audioContext) {
    audioContext = new AudioContext();
    masterGain = audioContext.createGain();
    masterGain.connect(audioContext.destination);
  }
  masterGain.gain.value = (config.volume ?? DEFAULT_VOLUME) / 100;
  if (audioContext.state === 'suspended') audioContext.resume();
  return audioContext;
};

const playTone = (
  frequency,
  { duration = 0.08, type = 'sine', gain = 0.12, at = 0, slideTo = null, attack = 0.004 } = {},
) => {
  const context = ensureAudioContext();
  if (!context) return;
  const startAt = context.currentTime + at;
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startAt);
  if (slideTo) oscillator.frequency.exponentialRampToValueAtTime(slideTo, startAt + duration);
  envelope.gain.setValueAtTime(0, startAt);
  envelope.gain.linearRampToValueAtTime(gain, startAt + attack);
  envelope.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  oscillator.connect(envelope).connect(masterGain);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.02);
};

const playNoise = ({ duration = 0.6, gain = 0.08, from = 400, to = 4000, at = 0 } = {}) => {
  const context = ensureAudioContext();
  if (!context) return;
  const startAt = context.currentTime + at;
  const buffer = context.createBuffer(
    1,
    Math.floor(context.sampleRate * duration),
    context.sampleRate,
  );
  const samples = buffer.getChannelData(0);
  for (let index = 0; index < samples.length; index += 1) samples[index] = Math.random() * 2 - 1;
  const source = context.createBufferSource();
  source.buffer = buffer;
  const filter = context.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 1.4;
  filter.frequency.setValueAtTime(from, startAt);
  filter.frequency.exponentialRampToValueAtTime(to, startAt + duration);
  const envelope = context.createGain();
  envelope.gain.setValueAtTime(0, startAt);
  envelope.gain.linearRampToValueAtTime(gain, startAt + duration * 0.4);
  envelope.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  source.connect(filter).connect(envelope).connect(masterGain);
  source.start(startAt);
};

const playMove = () => {
  const now = performance.now();
  if (now - lastMoveAt < MOVE_SOUND_THROTTLE_MS) return;
  lastMoveAt = now;
  playTone(1320, { duration: 0.045, gain: 0.05 });
  playTone(2640, { duration: 0.03, gain: 0.015 });
};

const SOUNDS = {
  move: playMove,
  edge: () => playTone(220, { duration: 0.08, gain: 0.06, type: 'triangle' }),
  select: () => {
    playTone(880, { duration: 0.09, gain: 0.08 });
    playTone(1320, { duration: 0.14, gain: 0.07, at: 0.05 });
  },
  back: () => playTone(990, { duration: 0.08, gain: 0.06, slideTo: 660 }),
  toggle: () => playTone(1500, { duration: 0.05, gain: 0.05 }),
  open: () => playTone(660, { duration: 0.12, gain: 0.05, slideTo: 990 }),
  notify: () => {
    playTone(1046, { duration: 0.18, gain: 0.06 });
    playTone(1568, { duration: 0.3, gain: 0.05, at: 0.09 });
  },
  launch: () => {
    playNoise({ duration: 0.9, gain: 0.07, from: 300, to: 5000 });
    [523, 659, 784, 1046].forEach((frequency, index) =>
      playTone(frequency, { duration: 0.5, gain: 0.045, at: index * 0.07, attack: 0.02 }),
    );
  },
  boot: () => {
    [261.6, 329.6, 392, 523.3].forEach((frequency, index) =>
      playTone(frequency, {
        duration: 1.8,
        gain: 0.04,
        at: 0.1 + index * 0.12,
        attack: 0.15,
        type: 'sine',
      }),
    );
    playTone(1046, { duration: 1.4, gain: 0.02, at: 0.6, attack: 0.3 });
  },
};

export const playSound = (soundName) => SOUNDS[soundName]();
