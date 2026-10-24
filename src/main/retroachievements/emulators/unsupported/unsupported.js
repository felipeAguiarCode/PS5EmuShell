import { MESSAGES } from '../../../constants/messages.js';

export const makeUnsupportedScript = ({ id, name, reason, alternative }) => {
  const message = alternative ? MESSAGES.raUnsupportedWithAlternative(reason, alternative) : reason;
  return {
    id,
    name,
    supported: false,
    alternative: alternative || null,
    configure: () => ({ ok: false, skipped: true, message }),
    clear: () => ({ ok: true, skipped: true }),
    readStatus: () => ({ user: null, enabled: false, message }),
  };
};
