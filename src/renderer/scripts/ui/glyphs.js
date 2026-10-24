import { BUTTON_IMAGES, BUTTON_NAMES, FACE_BUTTONS } from '../constants/buttons.js';
import { escapeHtml } from '../core/dom.js';
import { getState } from '../core/store.js';

const DEFAULT_GLYPH_STYLE = 'playstation';

export const resolveGlyphStyle = ({ buttonGlyphs, padType }) => {
  const style = buttonGlyphs || DEFAULT_GLYPH_STYLE;
  if (style !== 'auto') return style;
  return padType === 'xbox' ? 'xbox' : 'playstation';
};

export const getGlyphStyle = () => {
  const { config, padType } = getState();
  return resolveGlyphStyle({ buttonGlyphs: config?.buttonGlyphs, padType });
};

const findButtonName = (style, button) => BUTTON_NAMES[style][button] || button.toUpperCase();

export const renderGlyph = (buttonCombo) => {
  const style = getGlyphStyle();
  return buttonCombo
    .split('+')
    .map((button) => {
      const name = findButtonName(style, button);
      if (BUTTON_IMAGES[style].includes(button)) {
        return `<img class="glyph" src="img/buttons/${style}/${button}.png" alt="${escapeHtml(name)}" draggable="false">`;
      }
      return `<span class="glyph wide">${escapeHtml(name)}</span>`;
    })
    .join('');
};

export const renderGlyphPreview = (style) =>
  FACE_BUTTONS.map(
    (button) =>
      `<img class="glyph" src="img/buttons/${style}/${button}.png" alt="" draggable="false">`,
  ).join('');

export const formatButtonName = (buttonCombo) => {
  const style = getGlyphStyle();
  return buttonCombo
    .split('+')
    .map((button) => findButtonName(style, button))
    .join(' + ');
};
