import { makeUnsupportedScript } from './unsupported.js';

export const UNSUPPORTED_EMULATOR_SCRIPTS = [
  makeUnsupportedScript({
    id: 'melonds',
    name: 'melonDS',
    reason: 'O melonDS não tem RetroAchievements.',
    alternative: null,
  }),
  makeUnsupportedScript({
    id: 'desmume',
    name: 'DeSmuME',
    reason: 'O DeSmuME não tem RetroAchievements.',
    alternative: null,
  }),
  makeUnsupportedScript({
    id: 'noods',
    name: 'NooDS',
    reason: 'O NooDS não tem RetroAchievements.',
    alternative: null,
  }),
  makeUnsupportedScript({
    id: 'mgba',
    name: 'mGBA',
    reason: 'O mGBA standalone não tem RetroAchievements.',
    alternative: 'RAVBA',
  }),
  makeUnsupportedScript({
    id: 'mesen',
    name: 'Mesen',
    reason: 'O Mesen 2 não tem RetroAchievements.',
    alternative: 'RANes (NES) ou RASnes9x (SNES)',
  }),
  makeUnsupportedScript({
    id: 'fceux',
    name: 'FCEUX',
    reason: 'O FCEUX comum não tem RetroAchievements.',
    alternative: 'RANes',
  }),
  makeUnsupportedScript({
    id: 'snes9x',
    name: 'Snes9x',
    reason: 'O Snes9x comum não tem RetroAchievements.',
    alternative: 'RASnes9x',
  }),
];
