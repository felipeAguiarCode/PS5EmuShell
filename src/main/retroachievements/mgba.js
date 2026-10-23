// mGBA (Game Boy / Advance): sem suporte a RetroAchievements.
module.exports = require('./unsupported')({
  id: 'mgba',
  name: 'mGBA',
  reason: 'O mGBA standalone não tem RetroAchievements.',
  alternative: 'RAVBA',
});
