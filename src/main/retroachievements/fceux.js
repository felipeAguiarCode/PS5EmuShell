// FCEUX (NES): sem suporte a RetroAchievements.
module.exports = require('./unsupported')({
  id: 'fceux',
  name: 'FCEUX',
  reason: 'O FCEUX comum não tem RetroAchievements.',
  alternative: 'RANes',
});
