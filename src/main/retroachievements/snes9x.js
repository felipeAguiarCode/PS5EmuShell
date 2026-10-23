// Snes9x (SNES): sem suporte a RetroAchievements.
module.exports = require('./unsupported')({
  id: 'snes9x',
  name: 'Snes9x',
  reason: 'O Snes9x comum não tem RetroAchievements.',
  alternative: 'RASnes9x',
});
