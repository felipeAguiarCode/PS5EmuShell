// melonDS (Nintendo DS): sem suporte a RetroAchievements.
module.exports = require('./unsupported')({
  id: 'melonds',
  name: 'melonDS',
  reason: 'O melonDS não tem RetroAchievements.',
  alternative: null,
});
