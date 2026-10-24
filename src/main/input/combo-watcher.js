import { COMBO_CHECK_INTERVAL_MS, DEFAULT_COMBO_HOLD_MS } from '../constants/app.js';
import { isComboHeld } from './button-state.js';

export const startComboWatcher = ({
  listHeldButtonSets,
  readComboConfig,
  isGameRunning,
  actions,
}) => {
  const comboStates = Object.fromEntries(
    Object.keys(actions).map((comboKey) => [comboKey, { heldSince: 0, hasFired: false }]),
  );
  return setInterval(() => {
    const heldButtonSets = listHeldButtonSets();
    for (const [comboKey, runAction] of Object.entries(actions)) {
      const combo = readComboConfig(comboKey) ?? {};
      const comboState = comboStates[comboKey];
      if (!isGameRunning() || !isComboHeld(combo.buttons ?? [], heldButtonSets)) {
        comboState.heldSince = 0;
        comboState.hasFired = false;
        continue;
      }
      comboState.heldSince ||= Date.now();
      const holdMs = combo.holdMs ?? DEFAULT_COMBO_HOLD_MS;
      if (!comboState.hasFired && Date.now() - comboState.heldSince >= holdMs) {
        comboState.hasFired = true;
        runAction();
      }
    }
  }, COMBO_CHECK_INTERVAL_MS);
};
