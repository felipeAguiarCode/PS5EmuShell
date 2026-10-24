import {
  REPEATABLE_BUTTONS,
  REPEAT_ACCELERATION_MS,
  REPEAT_BASE_INTERVAL_MS,
  REPEAT_FIRST_DELAY_MS,
  REPEAT_MIN_INTERVAL_MS,
  STICK_NAVIGATION_THRESHOLD,
  TRIGGER_PRESS_THRESHOLD,
} from '../constants/input.js';

export const buildNavigationButtons = ({ buttons, lt, rt, lx, ly }) => {
  const navigationButtons = new Set(buttons);
  if (lt > TRIGGER_PRESS_THRESHOLD) navigationButtons.add('lt');
  if (rt > TRIGGER_PRESS_THRESHOLD) navigationButtons.add('rt');
  if (lx < -STICK_NAVIGATION_THRESHOLD) navigationButtons.add('left');
  if (lx > STICK_NAVIGATION_THRESHOLD) navigationButtons.add('right');
  if (ly < -STICK_NAVIGATION_THRESHOLD) navigationButtons.add('up');
  if (ly > STICK_NAVIGATION_THRESHOLD) navigationButtons.add('down');
  return navigationButtons;
};

const calculateNextRepeatTimer = (repeatTimer, now) => {
  const repeatCount = repeatTimer.repeatCount + 1;
  const intervalMs = Math.max(
    REPEAT_MIN_INTERVAL_MS,
    REPEAT_BASE_INTERVAL_MS - repeatCount * REPEAT_ACCELERATION_MS,
  );
  return { repeatCount, nextAt: now + intervalMs };
};

export const calculateButtonEvents = ({ heldButtons, previousButtons, repeatTimers, now }) => {
  const presses = [];
  const nextRepeatTimers = {};

  for (const button of heldButtons) {
    if (!previousButtons.has(button)) {
      presses.push({ button, isRepeat: false });
      nextRepeatTimers[button] = { repeatCount: 0, nextAt: now + REPEAT_FIRST_DELAY_MS };
      continue;
    }
    const repeatTimer = repeatTimers[button];
    if (REPEATABLE_BUTTONS.has(button) && repeatTimer && now >= repeatTimer.nextAt) {
      presses.push({ button, isRepeat: true });
      nextRepeatTimers[button] = calculateNextRepeatTimer(repeatTimer, now);
      continue;
    }
    if (repeatTimer) nextRepeatTimers[button] = repeatTimer;
  }

  const releases = [...previousButtons].filter((button) => !heldButtons.has(button));
  return { presses, releases, repeatTimers: nextRepeatTimers };
};

export const isComboHeld = (comboButtons, heldButtonSets) =>
  comboButtons.length > 0 &&
  heldButtonSets.some((heldButtons) => comboButtons.every((button) => heldButtons.has(button)));
