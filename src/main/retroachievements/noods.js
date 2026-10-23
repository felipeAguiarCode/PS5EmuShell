// NooDS (Nintendo DS): sem suporte a RetroAchievements.
module.exports = require('./unsupported')({
  id: 'noods',
  name: 'NooDS',
  reason: 'O NooDS não tem RetroAchievements.',
  alternative: null,
});
