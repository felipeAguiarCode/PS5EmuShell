import {
  DIRECTION_BUTTONS,
  GAMEPAD_API_BUTTONS,
  GAMEPAD_STICK_THRESHOLD,
  REPEAT_ACCELERATION_MS,
  REPEAT_BASE_INTERVAL_MS,
  REPEAT_FIRST_DELAY_MS,
  REPEAT_MIN_INTERVAL_MS,
} from '../constants/buttons.js';

export const listHeldGamepadButtons = (gamepads) => {
  const heldButtons = new Set();
  for (const gamepad of gamepads) {
    if (!gamepad) continue;
    gamepad.buttons.forEach((button, index) => {
      if (button.pressed && GAMEPAD_API_BUTTONS[index]) heldButtons.add(GAMEPAD_API_BUTTONS[index]);
    });
    if (gamepad.axes[0] < -GAMEPAD_STICK_THRESHOLD) heldButtons.add('left');
    if (gamepad.axes[0] > GAMEPAD_STICK_THRESHOLD) heldButtons.add('right');
    if (gamepad.axes[1] < -GAMEPAD_STICK_THRESHOLD) heldButtons.add('up');
    if (gamepad.axes[1] > GAMEPAD_STICK_THRESHOLD) heldButtons.add('down');
  }
  return heldButtons;
};

export const startGamepadFallback = (handleButton) => {
  let previousButtons = new Set();
  const repeatTimers = new Map();
  const pollGamepads = () => {
    const heldButtons = listHeldGamepadButtons(navigator.getGamepads());
    const now = performance.now();
    for (const button of heldButtons) {
      if (!previousButtons.has(button)) {
        repeatTimers.set(button, { nextAt: now + REPEAT_FIRST_DELAY_MS, repeatCount: 0 });
        handleButton(button, false);
        continue;
      }
      const repeatTimer = repeatTimers.get(button);
      if (DIRECTION_BUTTONS.includes(button) && now >= repeatTimer.nextAt) {
        const repeatCount = repeatTimer.repeatCount + 1;
        const intervalMs = Math.max(
          REPEAT_MIN_INTERVAL_MS,
          REPEAT_BASE_INTERVAL_MS - repeatCount * REPEAT_ACCELERATION_MS,
        );
        repeatTimers.set(button, { nextAt: now + intervalMs, repeatCount });
        handleButton(button, true);
      }
    }
    previousButtons = heldButtons;
    requestAnimationFrame(pollGamepads);
  };
  requestAnimationFrame(pollGamepads);
};
