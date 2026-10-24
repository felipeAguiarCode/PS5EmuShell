import { escapeHtml, queryOne } from '../core/dom.js';
import { focusElement, getFocusedElement } from '../navigation/spatial-navigation.js';
import { formatButtonName } from './glyphs.js';
import { closeModal, openModal } from './modal.js';
import { playSound } from './sound.js';

export const KEYBOARD_PAGES = [
  {
    id: 'letters',
    label: 'ABC',
    rows: ['1234567890@', 'qwertyuiop#', 'asdfghjkl"/', 'zxcvbnm-_?!'],
  },
  {
    id: 'symbols',
    label: '@#:',
    rows: ['1234567890@', '#$%&*()[]{}', '+=<>;:\'"\\|~', '.,-_?!^`/*º'],
  },
  { id: 'accents', label: 'à', rows: ['áàâãäçéèêëí', 'ìîïóòôõöúùû', 'üñýÿåæøœ¿¡ß', '€£¥¢§°ºª«»…'] },
];
const SHIFT_CYCLE = { off: 'once', once: 'lock', lock: 'off' };
const MASK_CHARACTER = '•';
const CARET_MARGIN_PX = 24;
const KEYBOARD_HINTS = [
  ['a', 'Digitar'],
  ['b', 'Cancelar'],
];
const BUTTON_ACTIONS = {
  lt: 'shift',
  y: 'space',
  x: 'delete',
  rs: 'nextPage',
  lb: 'caretLeft',
  rb: 'caretRight',
  rt: 'confirm',
  start: 'confirm',
};
const PHYSICAL_KEY_ACTIONS = {
  Enter: 'confirm',
  Backspace: 'delete',
  Home: 'caretStart',
  End: 'caretEnd',
};

const toCharacters = (text) => [...text];

export const createKeyboardState = (value = '') => ({
  text: value,
  caret: toCharacters(value).length,
  pageIndex: 0,
  shift: value ? 'off' : 'once',
});

export const insertText = (state, insertedText) => {
  const characters = toCharacters(state.text);
  const inserted = toCharacters(insertedText);
  return {
    ...state,
    text: [...characters.slice(0, state.caret), ...inserted, ...characters.slice(state.caret)].join(
      '',
    ),
    caret: state.caret + inserted.length,
  };
};

export const deleteBeforeCaret = (state) => {
  if (state.caret === 0) return state;
  const characters = toCharacters(state.text);
  return {
    ...state,
    text: [...characters.slice(0, state.caret - 1), ...characters.slice(state.caret)].join(''),
    caret: state.caret - 1,
  };
};

export const moveCaret = (state, offset) => ({
  ...state,
  caret: Math.min(Math.max(state.caret + offset, 0), toCharacters(state.text).length),
});

export const clearText = (state) => ({ ...state, text: '', caret: 0 });

export const cycleShift = (state) => ({ ...state, shift: SHIFT_CYCLE[state.shift] });

export const consumeShift = (state) =>
  state.shift === 'once' ? { ...state, shift: 'off' } : state;

export const cyclePage = (state, offset = 1) => ({
  ...state,
  pageIndex: (state.pageIndex + offset + KEYBOARD_PAGES.length) % KEYBOARD_PAGES.length,
});

export const selectPage = (state, pageIndex) => ({ ...state, pageIndex });

export const applyShift = (character, shift) =>
  shift === 'off' ? character : character.toUpperCase();

export const typeCharacter = (state, character) =>
  consumeShift(insertText(state, applyShift(character, state.shift)));

export const formatVisibleText = (text, isMasked) =>
  isMasked ? MASK_CHARACTER.repeat(toCharacters(text).length) : text;

export const splitAtCaret = (state, isMasked) => {
  const characters = toCharacters(formatVisibleText(state.text, isMasked));
  return {
    before: characters.slice(0, state.caret).join(''),
    after: characters.slice(state.caret).join(''),
  };
};

const STATE_ACTIONS = {
  shift: cycleShift,
  space: (state) => insertText(state, ' '),
  delete: deleteBeforeCaret,
  clear: clearText,
  nextPage: (state) => cyclePage(state, 1),
  caretLeft: (state) => moveCaret(state, -1),
  caretRight: (state) => moveCaret(state, 1),
  caretStart: (state) => moveCaret(state, -state.caret),
  caretEnd: (state) => moveCaret(state, toCharacters(state.text).length),
};

export const applyKeyboardAction = (state, action) => {
  if (STATE_ACTIONS[action]) return STATE_ACTIONS[action](state);
  if (action.startsWith('page-')) return selectPage(state, Number(action.slice('page-'.length)));
  return state;
};

const renderHint = (button) =>
  `<span class="key-hint">${escapeHtml(formatButtonName(button))}</span>`;

const renderKey = (character, rowIndex, columnIndex, shift) =>
  `<button class="key focusable" data-group="kb" data-k="${escapeHtml(character)}" data-pos="${rowIndex}-${columnIndex}">` +
  `${escapeHtml(applyShift(character, shift))}</button>`;

export const renderKeyGrid = (state) =>
  KEYBOARD_PAGES[state.pageIndex].rows
    .flatMap((row, rowIndex) =>
      toCharacters(row).map((character, columnIndex) =>
        renderKey(character, rowIndex, columnIndex, state.shift),
      ),
    )
    .join('');

const renderActionKey = ({ action, className = '', content, hint }) =>
  `<button class="key ctl ${className} focusable" data-group="kb" data-act="${action}">` +
  `${content}${hint ? renderHint(hint) : ''}</button>`;

const renderPageTabs = (state) =>
  `<div class="kb-tabs">${KEYBOARD_PAGES.map(
    (page, pageIndex) =>
      `<button class="key kb-tab focusable${pageIndex === state.pageIndex ? ' on' : ''}" data-group="kb" data-act="page-${pageIndex}">${escapeHtml(page.label)}</button>`,
  ).join('')}${renderHint('rs')}</div>`;

const SHIFT_CLASSES = { off: '', once: 'on', lock: 'on locked' };

export const renderControlRows = (state) =>
  [
    renderActionKey({
      action: 'shift',
      className: `span-2 ${SHIFT_CLASSES[state.shift]}`,
      content: '<span class="kb-icon">⇧</span>',
      hint: 'lt',
    }),
    renderPageTabs(state),
    renderActionKey({
      action: 'space',
      className: 'span-3',
      content: '<span class="kb-space"></span>',
      hint: 'y',
    }),
    renderActionKey({
      action: 'delete',
      className: 'span-2',
      content: '<span class="kb-icon">⌫</span>',
      hint: 'x',
    }),
    renderActionKey({ action: 'caretLeft', content: '<span class="kb-icon">◀</span>', hint: 'lb' }),
    renderActionKey({
      action: 'caretRight',
      content: '<span class="kb-icon">▶</span>',
      hint: 'rb',
    }),
    renderActionKey({
      action: 'clear',
      className: 'span-2',
      content: '<span class="kb-icon">…</span>',
    }),
    renderActionKey({
      action: 'confirm',
      className: 'span-7 confirm',
      content: 'Confirmar',
      hint: 'rt',
    }),
  ].join('');

const renderKeyboard = (state) => renderKeyGrid(state) + renderControlRows(state);

const findFocusKey = (element) => element && (element.dataset.pos || element.dataset.act);

export const openKeyboard = ({ title = 'Digite', value = '', onChange, mask = false } = {}) => {
  let state = createKeyboardState(value);
  let box = null;

  const renderInput = () => {
    const input = queryOne('.kb-input', box);
    const { before, after } = splitAtCaret(state, mask);
    input.innerHTML = `<span>${escapeHtml(before)}</span><span class="caret"></span><span>${escapeHtml(after)}</span>`;
    const caret = queryOne('.caret', input);
    const caretEnd = caret.offsetLeft + CARET_MARGIN_PX;
    if (caretEnd > input.scrollLeft + input.clientWidth)
      input.scrollLeft = caretEnd - input.clientWidth;
    else if (caret.offsetLeft - CARET_MARGIN_PX < input.scrollLeft) {
      input.scrollLeft = Math.max(caret.offsetLeft - CARET_MARGIN_PX, 0);
    }
  };

  const redrawKeys = () => {
    const focusKey = findFocusKey(getFocusedElement());
    queryOne('.kb-keys', box).innerHTML = renderKeyboard(state);
    const sameKey = focusKey && queryOne(`[data-pos="${focusKey}"],[data-act="${focusKey}"]`, box);
    if (sameKey) focusElement(sameKey, { silent: true, noScroll: true });
  };

  const updateState = (nextState) => {
    const hasTextChanged = nextState.text !== state.text;
    const haveKeysChanged =
      nextState.shift !== state.shift || nextState.pageIndex !== state.pageIndex;
    state = nextState;
    renderInput();
    if (haveKeysChanged) redrawKeys();
    if (hasTextChanged && onChange) onChange(state.text);
  };

  const confirm = () => {
    playSound('select');
    closeModal(state.text);
  };

  const runAction = (action) => {
    if (action === 'confirm') {
      confirm();
      return;
    }
    updateState(applyKeyboardAction(state, action));
    playSound('toggle');
  };

  const handleClick = (event) => {
    const key = event.target.closest('.key');
    if (!key) return;
    if (key.dataset.act) {
      runAction(key.dataset.act);
      return;
    }
    updateState(typeCharacter(state, key.dataset.k));
    playSound('toggle');
  };

  const handlePhysicalKey = (event) => {
    if (event.key === 'Escape') {
      playSound('back');
      closeModal(null);
      return true;
    }
    if (PHYSICAL_KEY_ACTIONS[event.key]) {
      runAction(PHYSICAL_KEY_ACTIONS[event.key]);
      return true;
    }
    if (event.key.length !== 1 || event.ctrlKey) return false;
    updateState(insertText(state, event.key));
    return true;
  };

  return openModal({
    className: 'kb',
    html:
      `<h3>${escapeHtml(title)}</h3><div class="kb-input"></div>` +
      `<div class="kb-keys">${renderKeyboard(state)}</div>`,
    initial: '[data-pos="1-0"]',
    hints: KEYBOARD_HINTS,
    onMount: (modalBox) => {
      box = modalBox;
      renderInput();
      box.addEventListener('click', handleClick);
    },
    onButton: (button) => {
      const action = BUTTON_ACTIONS[button];
      if (!action) return false;
      runAction(action);
      return true;
    },
    onKey: handlePhysicalKey,
  });
};
