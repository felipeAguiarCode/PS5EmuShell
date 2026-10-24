import {
  TOAST_DEFAULT_MS,
  TOAST_ENTER_MS,
  TOAST_FAST_LEAVE_MS,
  TOAST_GAP_PX,
  TOAST_KINDS,
  TOAST_LEAVE_MS,
  TOAST_MAX_VISIBLE,
} from '../constants/ui.js';
import { escapeHtml, queryAll, queryOne } from '../core/dom.js';
import { isMotionEnabled } from '../core/selectors.js';
import { getState } from '../core/store.js';
import { findConsoleIcon } from './console-icons.js';
import { ICONS } from './icons.js';
import { playSound } from './sound.js';

const ENTER_EASING = 'cubic-bezier(.2,.8,.2,1)';
const LEAVE_EASING = 'cubic-bezier(.4,0,.2,1)';
const SLIDE_OFFSET = 'translateX(48px)';
const timersByToast = new WeakMap();

const renderKindIcon = (kind) =>
  kind.consoleIcon ? findConsoleIcon(kind.consoleIcon) : ICONS[kind.icon];

const calculateDuration = (ms) => (isMotionEnabled(getState().config) ? ms : 1);

const buildToastKey = (title, text) => `${title}|${text}`;

const renderToastHtml = ({ kind, title, text, image }) => {
  const art = image
    ? `<img src="${escapeHtml(image)}" alt="" draggable="false"><span class="ti-badge">${renderKindIcon(kind)}</span>`
    : renderKindIcon(kind);
  const textHtml = text ? `<div class="tx">${escapeHtml(text)}</div>` : '';
  return (
    `<div class="toast-body"><div class="ti">${art}</div>` +
    `<div class="tc"><div class="tk">${escapeHtml(kind.category)}</div><div class="tt">${escapeHtml(title)}</div>${textHtml}</div></div>` +
    (kind.isBusy ? `<div class="tbusy"><i></i></div>` : '')
  );
};

export const dismissToast = (toast, isFast) => {
  if (!toast || toast.classList.contains('leaving')) return;
  toast.classList.add('leaving');
  clearTimeout(timersByToast.get(toast));
  const height = `${toast.offsetHeight}px`;
  const gap = `${TOAST_GAP_PX}px`;
  const animation = toast.animate(
    [
      { height, marginBottom: gap, opacity: 1, transform: 'none' },
      { height, marginBottom: gap, opacity: 0, transform: SLIDE_OFFSET, offset: 0.55 },
      { height: '0px', marginBottom: '0px', opacity: 0, transform: SLIDE_OFFSET },
    ],
    {
      duration: calculateDuration(isFast ? TOAST_FAST_LEAVE_MS : TOAST_LEAVE_MS),
      easing: LEAVE_EASING,
      fill: 'forwards',
    },
  );
  animation.onfinish = () => toast.remove();
};

const armDismissTimer = (toast, durationMs) => {
  let remainingMs = durationMs;
  let startedAt = performance.now();
  const startTimer = () =>
    timersByToast.set(
      toast,
      setTimeout(() => dismissToast(toast), remainingMs),
    );
  toast.addEventListener('mouseenter', () => {
    clearTimeout(timersByToast.get(toast));
    remainingMs -= performance.now() - startedAt;
    toast.classList.add('paused');
  });
  toast.addEventListener('mouseleave', () => {
    startedAt = performance.now();
    toast.classList.remove('paused');
    startTimer();
  });
  toast.addEventListener('click', () => dismissToast(toast));
  startTimer();
};

export const showToast = (
  title,
  text = '',
  { kind: kindName = 'info', ms = TOAST_DEFAULT_MS, sound = true, image = null } = {},
) => {
  const kind = TOAST_KINDS[kindName] || TOAST_KINDS.info;
  const host = queryOne('#toasts');
  const key = buildToastKey(title, text);
  for (const previous of queryAll('.toast:not(.leaving)', host)) {
    if (previous.dataset.key === key) dismissToast(previous, true);
  }
  const toast = document.createElement('div');
  toast.className = `toast${kind.isError ? ' is-error' : ''}${kind.isBusy ? ' busy' : ''}${image ? ' has-art' : ''}`;
  toast.dataset.key = key;
  toast.innerHTML = renderToastHtml({ kind, title, text, image });
  host.appendChild(toast);
  toast.animate(
    [
      { height: '0px', marginBottom: '0px', opacity: 0, transform: SLIDE_OFFSET },
      {
        height: `${toast.offsetHeight}px`,
        marginBottom: `${TOAST_GAP_PX}px`,
        opacity: 1,
        transform: 'none',
      },
    ],
    { duration: calculateDuration(TOAST_ENTER_MS), easing: ENTER_EASING },
  );
  if (sound) playSound('notify');
  armDismissTimer(toast, ms);
  const visibleToasts = queryAll('.toast:not(.leaving)', host);
  if (visibleToasts.length > TOAST_MAX_VISIBLE) dismissToast(visibleToasts[0]);
  return toast;
};
