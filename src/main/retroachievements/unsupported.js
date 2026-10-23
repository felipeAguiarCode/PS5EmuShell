// Base dos emuladores sem RetroAchievements: o script só informa e sugere a alternativa.
module.exports = function unsupported({ id, name, reason, alternative }) {
  const message = alternative ? `${reason} Use o ${alternative} para ganhar conquistas.` : reason;
  return {
    id,
    name,
    supported: false,
    alternative: alternative || null,
    configure: () => ({ ok: false, skipped: true, message }),
    clear: () => ({ ok: true, skipped: true }),
    status: () => ({ user: null, enabled: false, message }),
  };
};
