const TRIGGER_ACTIVE_THRESHOLD = 0.05;
const FULL_PRESS_THRESHOLD = 0.9;
const EXIT_HOLD_MS = 1500;
const STICK_TRAVEL_PX = 18;
const TRIGGER_WIDTH_PX = 96;

export const listPressedButtons = (padState) => {
  const pressed = new Set(padState.buttons);
  if (padState.lt > TRIGGER_ACTIVE_THRESHOLD) pressed.add('lt');
  if (padState.rt > TRIGGER_ACTIVE_THRESHOLD) pressed.add('rt');
  return pressed;
};

export const withTestedButtons = (testedButtons, padState) => {
  const nextTested = new Set([...testedButtons, ...padState.buttons]);
  if (padState.lt > FULL_PRESS_THRESHOLD) nextTested.add('lt');
  if (padState.rt > FULL_PRESS_THRESHOLD) nextTested.add('rt');
  if (Math.hypot(padState.lx, padState.ly) > FULL_PRESS_THRESHOLD) nextTested.add('lstick');
  if (Math.hypot(padState.rx, padState.ry) > FULL_PRESS_THRESHOLD) nextTested.add('rstick');
  return nextTested;
};

export const listPressedLabels = (padState, formatLabel) => {
  const labels = padState.buttons.map(formatLabel);
  if (padState.lt > TRIGGER_ACTIVE_THRESHOLD) {
    labels.push(`${formatLabel('lt')} ${Math.round(padState.lt * 100)}%`);
  }
  if (padState.rt > TRIGGER_ACTIVE_THRESHOLD) {
    labels.push(`${formatLabel('rt')} ${Math.round(padState.rt * 100)}%`);
  }
  return labels.length ? [...new Set(labels)].join('  ') : '—';
};

export const calculateExitProgress = (holdSince, now) =>
  holdSince ? Math.min(1, (now - holdSince) / EXIT_HOLD_MS) : 0;

export const calculateTriggerWidth = (value) => Math.round(TRIGGER_WIDTH_PX * (value || 0));

export const formatStickTransform = ([x, y]) =>
  `translate(${(x * STICK_TRAVEL_PX).toFixed(1)} ${(y * STICK_TRAVEL_PX).toFixed(1)})`;
