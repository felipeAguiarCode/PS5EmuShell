// Mesen (NES / SNES): sem suporte a RetroAchievements.
module.exports = require('./unsupported')({
  id: 'mesen',
  name: 'Mesen',
  reason: 'O Mesen 2 não tem RetroAchievements.',
  alternative: 'RANes (NES) ou RASnes9x (SNES)',
});
