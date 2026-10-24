import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  KEYBOARD_PAGES,
  applyKeyboardAction,
  applyShift,
  clearText,
  createKeyboardState,
  cyclePage,
  cycleShift,
  deleteBeforeCaret,
  formatVisibleText,
  insertText,
  moveCaret,
  splitAtCaret,
  typeCharacter,
} from '../../src/renderer/scripts/ui/virtual-keyboard.js';

describe('keyboard pages', () => {
  it('has four rows of eleven keys on every page', () => {
    for (const page of KEYBOARD_PAGES) {
      assert.equal(page.rows.length, 4);
      for (const row of page.rows) assert.equal([...row].length, 11);
    }
  });
});

describe('createKeyboardState', () => {
  it('starts with shift once on an empty field', () => {
    assert.deepEqual(createKeyboardState(''), { text: '', caret: 0, pageIndex: 0, shift: 'once' });
  });

  it('places the caret after an existing value without shift', () => {
    assert.deepEqual(createKeyboardState('ação'), {
      text: 'ação',
      caret: 4,
      pageIndex: 0,
      shift: 'off',
    });
  });
});

describe('text editing', () => {
  const middle = { ...createKeyboardState('abcd'), caret: 2 };

  it('inserts at the caret', () => {
    const next = insertText(middle, 'XY');
    assert.equal(next.text, 'abXYcd');
    assert.equal(next.caret, 4);
  });

  it('deletes the character before the caret', () => {
    const next = deleteBeforeCaret(middle);
    assert.equal(next.text, 'acd');
    assert.equal(next.caret, 1);
  });

  it('does nothing when deleting at the start', () => {
    const atStart = { ...middle, caret: 0 };
    assert.equal(deleteBeforeCaret(atStart), atStart);
  });

  it('clamps caret movement to the text bounds', () => {
    assert.equal(moveCaret(middle, -5).caret, 0);
    assert.equal(moveCaret(middle, 5).caret, 4);
    assert.equal(moveCaret(middle, 1).caret, 3);
  });

  it('clears text and caret', () => {
    assert.deepEqual(clearText(middle), { ...middle, text: '', caret: 0 });
  });

  it('counts accented characters as one caret step', () => {
    const next = deleteBeforeCaret(createKeyboardState('pão'));
    assert.equal(next.text, 'pã');
    assert.equal(next.caret, 2);
  });
});

describe('shift', () => {
  it('cycles off, once, lock and back', () => {
    const states = [cycleShift, cycleShift, cycleShift].reduce(
      (list, step) => [...list, step(list.at(-1))],
      [{ ...createKeyboardState('x'), shift: 'off' }],
    );
    assert.deepEqual(
      states.map((state) => state.shift),
      ['off', 'once', 'lock', 'off'],
    );
  });

  it('turns off after one typed character when set once', () => {
    const next = typeCharacter(createKeyboardState(''), 'q');
    assert.equal(next.text, 'Q');
    assert.equal(next.shift, 'off');
  });

  it('stays on when locked', () => {
    const locked = { ...createKeyboardState(''), shift: 'lock' };
    const next = typeCharacter(typeCharacter(locked, 'a'), 'b');
    assert.equal(next.text, 'AB');
    assert.equal(next.shift, 'lock');
  });

  it('uppercases accented characters', () => {
    assert.equal(applyShift('ã', 'once'), 'Ã');
    assert.equal(applyShift('ã', 'off'), 'ã');
  });
});

describe('pages', () => {
  it('wraps around in both directions', () => {
    const state = createKeyboardState('');
    assert.equal(cyclePage(state, 1).pageIndex, 1);
    assert.equal(cyclePage(state, -1).pageIndex, KEYBOARD_PAGES.length - 1);
    assert.equal(cyclePage({ ...state, pageIndex: 2 }, 1).pageIndex, 0);
  });

  it('selects a page from a tab action', () => {
    assert.equal(applyKeyboardAction(createKeyboardState(''), 'page-2').pageIndex, 2);
  });
});

describe('applyKeyboardAction', () => {
  it('maps controller actions to state changes', () => {
    const state = { ...createKeyboardState('ab'), caret: 1 };
    assert.equal(applyKeyboardAction(state, 'space').text, 'a b');
    assert.equal(applyKeyboardAction(state, 'caretStart').caret, 0);
    assert.equal(applyKeyboardAction(state, 'caretEnd').caret, 2);
    assert.equal(applyKeyboardAction(state, 'unknown'), state);
  });
});

describe('visible text', () => {
  it('masks every character', () => {
    assert.equal(formatVisibleText('senha', true), '•••••');
    assert.equal(formatVisibleText('senha', false), 'senha');
  });

  it('splits around the caret', () => {
    const state = { ...createKeyboardState('abc'), caret: 1 };
    assert.deepEqual(splitAtCaret(state, false), { before: 'a', after: 'bc' });
    assert.deepEqual(splitAtCaret(state, true), { before: '•', after: '••' });
  });
});
