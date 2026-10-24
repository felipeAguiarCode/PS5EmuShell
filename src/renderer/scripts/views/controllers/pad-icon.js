import { ICONS } from '../../ui/icons.js';

const PLAYSTATION_PAD_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7.5 6h9c2.2 0 3.7 1.6 4.1 3.8l1 5.6c.4 2.2-.9 3.6-2.4 3.6-1.2 0-2-.8-2.7-1.9L15.4 15H8.6l-1.1 2.1C6.8 18.2 6 19 4.8 19c-1.5 0-2.8-1.4-2.4-3.6l1-5.6C3.8 7.6 5.3 6 7.5 6z"/><rect x="9.4" y="7.6" width="5.2" height="3.2" rx=".8"/><circle cx="9" cy="13.3" r="1.2"/><circle cx="15" cy="13.3" r="1.2"/></svg>';

export const renderPadIcon = (type) => (type === 'xbox' ? ICONS.gamepad : PLAYSTATION_PAD_ICON);
