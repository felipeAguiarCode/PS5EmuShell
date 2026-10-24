export const renderSvgIcon = (body, extra = '') =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ${extra}>${body}</svg>`;

export const ICONS = {
  search: renderSvgIcon('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
  gear: renderSvgIcon(
    '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  ),
  power: renderSvgIcon('<path d="M12 3v9"/><path d="M6.3 7.3a8 8 0 1 0 11.4 0"/>'),
  star: renderSvgIcon(
    '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z"/>',
  ),
  starFill: renderSvgIcon(
    '<path fill="currentColor" d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z"/>',
  ),
  dots: renderSvgIcon(
    '<circle cx="5" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="19" cy="12" r="1.4" fill="currentColor"/>',
  ),
  grid: renderSvgIcon(
    '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  ),
  play: renderSvgIcon('<path fill="currentColor" d="M7 4.5v15l12.5-7.5z"/>'),
  folder: renderSvgIcon(
    '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  ),
  image: renderSvgIcon(
    '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
  ),
  chip: renderSvgIcon(
    '<rect x="5" y="5" width="14" height="14" rx="2"/><path d="M9 1v4M15 1v4M9 19v4M15 19v4M1 9h4M1 15h4M19 9h4M19 15h4"/>',
  ),
  gamepad: renderSvgIcon(
    '<path d="M6 11h4M8 9v4"/><circle cx="15.5" cy="12" r=".8" fill="currentColor"/><circle cx="18" cy="10" r=".8" fill="currentColor"/><path d="M17.3 5H6.7a4 4 0 0 0-4 3.6l-.6 6.2A2.8 2.8 0 0 0 7 17l1.8-2h6.4l1.8 2a2.8 2.8 0 0 0 4.9-2.2l-.6-6.2A4 4 0 0 0 17.3 5z"/>',
  ),
  clock: renderSvgIcon('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  info: renderSvgIcon('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>'),
  refresh: renderSvgIcon(
    '<path d="M20 11a8 8 0 0 0-14.8-4M4 4v4h4M4 13a8 8 0 0 0 14.8 4M20 20v-4h-4"/>',
  ),
  exit: renderSvgIcon(
    '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4"/>',
  ),
  expand: renderSvgIcon('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
  chevR: renderSvgIcon('<path d="m9 5 7 7-7 7"/>'),
  chevL: renderSvgIcon('<path d="m15 5-7 7 7 7"/>'),
  sort: renderSvgIcon('<path d="M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4"/>'),
  plus: renderSvgIcon('<path d="M12 5v14M5 12h14"/>'),
  trash: renderSvgIcon('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
  check: renderSvgIcon('<path d="m5 12 5 5 9-10"/>'),
  user: renderSvgIcon('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
  palette: renderSvgIcon(
    '<path d="M12 3a9 9 0 1 0 0 18c1 0 1.5-.8 1.5-1.5 0-1.2-1-1.5-1-2.5S13.3 15 14.5 15H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7.5" r="1"/>',
  ),
  library: renderSvgIcon('<path d="M4 4h4v16H4zM10 4h4v16h-4zM16 5l3.5-1 2.5 15.5-3.5 1z"/>'),
  heart: renderSvgIcon(
    '<path d="M12 20s-7-4.4-9-9a4.8 4.8 0 0 1 9-3 4.8 4.8 0 0 1 9 3c-2 4.6-9 9-9 9z"/>',
  ),
  history: renderSvgIcon('<path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l4 2"/>'),
  alert: renderSvgIcon(
    '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  ),
  xCircle: renderSvgIcon('<circle cx="12" cy="12" r="9"/><path d="m15 9-6 6M9 9l6 6"/>'),
  checkCircle: renderSvgIcon('<circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.7 2.7L16 9.8"/>'),
  download: renderSvgIcon(
    '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>',
  ),
  folderPlus: renderSvgIcon(
    '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M12 10.5v5M9.5 13h5"/>',
  ),
  folderCheck: renderSvgIcon(
    '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="m9.3 13.2 2 2 3.6-3.8"/>',
  ),
  libraryPlus: renderSvgIcon('<path d="M4 4h4v16H4zM10 4h4v9"/><path d="M18 14v6M15 17h6"/>'),
  libraryMinus: renderSvgIcon('<path d="M4 4h4v16H4zM10 4h4v9"/><path d="M15 17h6"/>'),
  gamepadOff: renderSvgIcon(
    '<path d="M6 11h4M8 9v4"/><path d="M17.3 5H8M4.1 6.4A4 4 0 0 0 2.7 8.6l-.6 6.2A2.8 2.8 0 0 0 7 17l1.8-2h6.4l1.8 2a2.8 2.8 0 0 0 3.3.6M21.4 13.8l-.4-5.2A4 4 0 0 0 17.3 5"/><path d="m3 3 18 18"/>',
  ),
  sparkles: renderSvgIcon(
    '<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  ),
  trophy: renderSvgIcon(
    '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
  ),
  gauge: renderSvgIcon(
    '<path d="M4.5 18a8.5 8.5 0 1 1 15 0"/><path d="m12 13 4-4.5"/><circle cx="12" cy="13" r="1.3"/>',
  ),
  bolt: renderSvgIcon('<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>'),
  monitor: renderSvgIcon(
    '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  ),
};
