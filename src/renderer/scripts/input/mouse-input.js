import { CURSOR_HIDE_MS, CURSOR_MOVE_THRESHOLD_PX } from '../constants/ui.js';
import { runCommand } from '../core/commands.js';
import { focusElement, getFocusedElement, getNavScope } from '../navigation/spatial-navigation.js';

const HOVER_IGNORED_CONTAINERS = ['#set-nav', '#lib-filters', '#chips'];

const isHoverFocusIgnored = (element) =>
  HOVER_IGNORED_CONTAINERS.some((selector) => element.closest(selector));

export const bindMouseInput = () => {
  const body = document.body;
  let lastX = -1;
  let lastY = -1;
  let hideTimer = null;
  window.addEventListener('mousemove', (event) => {
    const distance = Math.abs(event.screenX - lastX) + Math.abs(event.screenY - lastY);
    if (distance < CURSOR_MOVE_THRESHOLD_PX) return;
    const isFirstMove = lastX < 0;
    lastX = event.screenX;
    lastY = event.screenY;
    if (isFirstMove) return;
    body.classList.remove('cursor-hidden');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => body.classList.add('cursor-hidden'), CURSOR_HIDE_MS);
  });
  document.addEventListener('mouseover', (event) => {
    if (body.classList.contains('cursor-hidden')) return;
    const element = event.target.closest('.focusable');
    if (
      !element ||
      element === runCommand('getHomeRow') ||
      element === getFocusedElement() ||
      !getNavScope().contains(element)
    ) {
      return;
    }
    if (isHoverFocusIgnored(element)) return;
    focusElement(element, { silent: true, noScroll: true });
  });
};
