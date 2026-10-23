// DeSmuME (Nintendo DS): sem suporte a RetroAchievements.
module.exports = require('./unsupported')({
  id: 'desmume',
  name: 'DeSmuME',
  reason: 'O DeSmuME não tem RetroAchievements.',
  alternative: null,
});
