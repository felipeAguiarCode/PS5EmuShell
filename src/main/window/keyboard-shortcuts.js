import { globalShortcut } from 'electron';
import { KEYBOARD_SHORTCUT_KILL_GAME, KEYBOARD_SHORTCUT_TOGGLE_OVERLAY } from '../constants/app.js';

export const makeGameShortcutToggle = ({ killGame, toggleOverlay, areShortcutsAllowed }) => {
  const shortcuts = [
    [KEYBOARD_SHORTCUT_KILL_GAME, killGame],
    [KEYBOARD_SHORTCUT_TOGGLE_OVERLAY, toggleOverlay],
  ];
  return (isEnabled) => {
    for (const [accelerator, handler] of shortcuts) {
      const isRegistered = globalShortcut.isRegistered(accelerator);
      if (isEnabled && areShortcutsAllowed()) {
        if (!isRegistered) globalShortcut.register(accelerator, handler);
      } else if (isRegistered) {
        globalShortcut.unregister(accelerator);
      }
    }
  };
};

export const unregisterAllShortcuts = () => globalShortcut.unregisterAll();
