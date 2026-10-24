import { renderSvgIcon } from './icons.js';

export const CONSOLE_ICONS = {
  psx: renderSvgIcon(
    '<rect x="1.5" y="6" width="21" height="12" rx="2"/><circle cx="9" cy="12" r="4.2"/><circle cx="9" cy="12" r="1"/><path d="M15.5 9.5h4M15.5 12h1.6M18 12h1.5"/><path d="M3.5 18v1.2M20.5 18v1.2"/>',
  ),
  ps2: renderSvgIcon(
    '<path d="M2 8.5 4 7h18v10H4l-2-1.5z"/><path d="M5 9v6M6.6 9v6M8.2 9v6"/><path d="M10.5 10h9.5"/><path d="M10.5 14.5h3M16.5 14.5h1M18.7 14.5h1"/>',
  ),
  psp: renderSvgIcon(
    '<rect x="1" y="6.5" width="22" height="11" rx="5.5"/><rect x="7" y="8.3" width="10" height="7.4" rx="0.8"/><path d="M3.3 12h2.4M4.5 10.8v2.4"/><circle cx="19.6" cy="10.6" r=".55" fill="currentColor"/><circle cx="18.4" cy="12" r=".55" fill="currentColor"/><circle cx="20.8" cy="12" r=".55" fill="currentColor"/><circle cx="19.6" cy="13.4" r=".55" fill="currentColor"/>',
  ),
  nds: renderSvgIcon(
    '<rect x="4.5" y="1.8" width="15" height="9.4" rx="1.6"/><rect x="7.5" y="3.4" width="9" height="6.2" rx=".5"/><rect x="4.5" y="12.8" width="15" height="9.4" rx="1.6"/><rect x="8.5" y="14.3" width="7" height="5.8" rx=".5"/><path d="M5.8 17.2h1.6M6.6 16.4V18"/><circle cx="17.8" cy="16.6" r=".5" fill="currentColor"/><circle cx="17.8" cy="18.4" r=".5" fill="currentColor"/>',
  ),
  gc: renderSvgIcon(
    '<path d="M7 5.5V3.8a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v1.7"/><rect x="3.5" y="5.5" width="17" height="15.5" rx="2.4"/><circle cx="12" cy="12.3" r="4.4"/><circle cx="12" cy="12.3" r="1"/><path d="M7 18.6h2.5M14.5 18.6H17"/>',
  ),
  gba: renderSvgIcon(
    '<path d="M5 6.5h14a4 4 0 0 1 3.5 2.1V15a3.5 3.5 0 0 1-3.5 3.5H5A3.5 3.5 0 0 1 1.5 15V8.6A4 4 0 0 1 5 6.5z"/><rect x="7.2" y="8.5" width="9.6" height="7" rx=".6"/><path d="M3.3 12h2.2M4.4 10.9v2.2"/><circle cx="19.6" cy="11.2" r=".6" fill="currentColor"/><circle cx="18.4" cy="12.8" r=".6" fill="currentColor"/>',
  ),
  gbc: renderSvgIcon(
    '<rect x="5.5" y="1.8" width="13" height="20.4" rx="2" ry="2"/><path d="M5.5 19.5c3 0 13 0 13-3"/><rect x="8" y="4" width="8" height="7" rx=".6"/><path d="M8 15h2.6M9.3 13.7v2.6"/><circle cx="15.6" cy="14" r=".6" fill="currentColor"/><circle cx="14.2" cy="15.4" r=".6" fill="currentColor"/>',
  ),
  nes: renderSvgIcon(
    '<rect x="1.5" y="7" width="21" height="11" rx="1"/><path d="M4 7v3.5h16V7"/><path d="M3.5 13.5h4.5M3.5 15.5h4.5"/><rect x="10" y="13" width="1.8" height="1.2" rx=".3"/><rect x="12.6" y="13" width="1.8" height="1.2" rx=".3"/><path d="M16 15.5h4.5"/>',
  ),
  snes: renderSvgIcon(
    '<path d="M4.5 7h15a3 3 0 0 1 3 3v5.5a2.5 2.5 0 0 1-2.5 2.5H4a2.5 2.5 0 0 1-2.5-2.5V10a3 3 0 0 1 3-3z"/><rect x="7.5" y="5" width="9" height="4" rx=".8"/><circle cx="6" cy="13.5" r="1.3"/><circle cx="18" cy="13.5" r="1.3"/><path d="M10 14.2h1.2M12.8 14.2H14"/>',
  ),
  md: renderSvgIcon(
    '<rect x="1.5" y="8" width="21" height="9" rx="2.5"/><circle cx="12" cy="12.5" r="3.6"/><path d="M8.4 12.5H4.5M19.5 12.5h-3.9"/><circle cx="12" cy="12.5" r="1"/>',
  ),
  n64: renderSvgIcon(
    '<path d="M3 9.5 6 6h12l3 3.5v7.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17z"/><rect x="8" y="7.5" width="8" height="3" rx=".6"/><path d="M6 15h1.5M9 15h1.5M13.5 15H15M16.5 15H18"/>',
  ),
  dc: renderSvgIcon(
    '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="12" cy="11" r="4.6"/><path d="M10.4 9.5a2 2 0 1 1 1.6 3.3"/><path d="M6.5 17.5h3M14.5 17.5h3"/>',
  ),
  wii: renderSvgIcon(
    '<rect x="5" y="2.5" width="7" height="19" rx="1.5"/><path d="M6.5 6h4"/><rect x="15.5" y="6" width="3.5" height="15.5" rx="1.75"/><circle cx="17.25" cy="9" r=".7" fill="currentColor"/>',
  ),
  wiiu: renderSvgIcon(
    '<rect x="1.5" y="6" width="21" height="12" rx="4"/><rect x="7" y="8" width="10" height="8" rx=".8"/><circle cx="4.4" cy="10.3" r="1"/><circle cx="19.6" cy="10.3" r="1"/><path d="M3.6 13.8h1.6M4.4 13v1.6"/>',
  ),
  n3ds: renderSvgIcon(
    '<rect x="3" y="2" width="18" height="9.5" rx="1.6"/><rect x="5.5" y="3.6" width="13" height="6.3" rx=".5"/><rect x="4.5" y="12.8" width="15" height="9.2" rx="1.6"/><rect x="9" y="14.2" width="6" height="5" rx=".4"/><circle cx="6.7" cy="15.4" r="1"/><circle cx="17.4" cy="16.2" r=".5" fill="currentColor"/>',
  ),
  xbox: renderSvgIcon(
    '<rect x="1.5" y="6.5" width="21" height="11" rx="2"/><circle cx="12" cy="12" r="3.2"/><path d="m10.4 10.4 3.2 3.2M13.6 10.4l-3.2 3.2"/><path d="M4 15h3"/>',
  ),
  x360: renderSvgIcon(
    '<path d="M3 7.5c3 1 15 1 18 0v9c-3-1-15-1-18 0z"/><circle cx="12" cy="12" r="2.4"/><path d="M5.5 10.5v3M18.5 10.5v3"/>',
  ),
  ps3: renderSvgIcon(
    '<path d="M2.5 9.5 5 6h16.5L19 9.5z"/><path d="M2.5 9.5V17h16.5V9.5M19 17l2.5-3.5V6"/><path d="M5 13.3h6"/>',
  ),
  ps4: renderSvgIcon(
    '<path d="M2 8.5 4.5 6H22l-2.5 2.5z"/><path d="M2 8.5V18h17.5V8.5M19.5 18 22 15.5V6"/><path d="M2 12.5h17.5"/>',
  ),
  pc: renderSvgIcon(
    '<rect x="2" y="3.5" width="20" height="13" rx="1.6"/><path d="M8.5 20.5h7M12 16.5v4"/><path d="M5.5 13.5h4"/>',
  ),
  generic: renderSvgIcon(
    '<path d="M6 11h4M8 9v4"/><circle cx="15.5" cy="12" r=".8" fill="currentColor"/><circle cx="18" cy="10" r=".8" fill="currentColor"/><path d="M17.3 5H6.7a4 4 0 0 0-4 3.6l-.6 6.2A2.8 2.8 0 0 0 7 17l1.8-2h6.4l1.8 2a2.8 2.8 0 0 0 4.9-2.2l-.6-6.2A4 4 0 0 0 17.3 5z"/>',
  ),
};

export const findConsoleIcon = (systemId) => CONSOLE_ICONS[systemId] || CONSOLE_ICONS.generic;
