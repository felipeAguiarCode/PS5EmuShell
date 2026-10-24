import { DIRECTION_BUTTONS, KEYBOARD_BUTTONS } from '../constants/buttons.js';
import { handleModalKey } from '../ui/modal.js';

export const findKeyboardButton = (key) =>
  KEYBOARD_BUTTONS[key] || KEYBOARD_BUTTONS[key.toLowerCase()];

export const bindKeyboardInput = (handleButton) => {
  window.addEventListener('keydown', (event) => {
    if (handleModalKey(event)) {
      event.preventDefault();
      return;
    }
    if (event.target.tagName === 'INPUT') return;
    if (event.ctrlKey && event.key.toLowerCase() === 'f') {
      event.preventDefault();
      handleButton('back', false);
      return;
    }
    const button = findKeyboardButton(event.key);
    if (!button) return;
    event.preventDefault();
    handleButton(button, event.repeat && !DIRECTION_BUTTONS.includes(button));
  });
};
