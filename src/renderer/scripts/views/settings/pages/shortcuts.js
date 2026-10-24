import { formatComboId } from '../../../core/selectors.js';
import { formatButtonName, renderGlyph } from '../../../ui/glyphs.js';
import { HOLD_TIMES_MS, SHORTCUT_COMBOS } from '../settings-constants.js';

const OTHER_COMBO_KEY = { killCombo: 'homeCombo', homeCombo: 'killCombo' };

const listComboOptions = (comboId) => {
  const combos = SHORTCUT_COMBOS.some((option) => option.v === comboId)
    ? SHORTCUT_COMBOS
    : [...SHORTCUT_COMBOS, { v: comboId }];
  return combos.map((option) => ({
    v: option.v,
    l: formatButtonName(option.v),
    html: renderGlyph(option.v),
  }));
};

const buildComboRows = (config, comboKey, label, description) => {
  const comboId = formatComboId(config[comboKey]);
  const otherComboId = formatComboId(config[OTHER_COMBO_KEY[comboKey]]);
  return [
    {
      type: 'select',
      label,
      desc:
        comboId === otherComboId
          ? '⚠ Igual ao outro atalho — escolha combinações diferentes.'
          : description,
      options: listComboOptions(comboId),
      get: () => comboId,
      set: (value) => {
        config[comboKey].buttons = value.split('+');
      },
    },
    {
      type: 'select',
      label: 'Tempo segurando',
      desc: 'Quanto tempo os botões precisam ficar pressionados juntos.',
      options: HOLD_TIMES_MS.map((ms) => ({ v: ms, l: ms ? `${ms / 1000} s` : 'Imediato' })),
      get: () => config[comboKey].holdMs,
      set: (value) => {
        config[comboKey].holdMs = value;
      },
    },
  ];
};

export const buildShortcutsRows = (context) => {
  const config = context.getDraft();
  return [
    { type: 'title', label: 'Atalhos' },
    {
      type: 'info',
      label: 'Funcionam durante o jogo',
      desc: 'O launcher continua lendo o controle mesmo escondido atrás do emulador.',
    },
    { type: 'section', label: 'Fechar jogo e voltar ao launcher' },
    ...buildComboRows(
      config,
      'killCombo',
      'Combinação',
      'Encerra o emulador e volta para o launcher.',
    ),
    { type: 'section', label: 'Voltar ao launcher (sem fechar o jogo)' },
    ...buildComboRows(
      config,
      'homeCombo',
      'Combinação',
      'Mostra o launcher por cima do jogo, com as opções Retomar e Fechar. Repita para voltar ao jogo.',
    ),
    { type: 'section', label: 'Teclado' },
    {
      type: 'toggle',
      label: 'Atalhos de teclado durante o jogo',
      desc: 'Ctrl+Shift+Q fecha o jogo · Ctrl+Shift+L volta ao launcher. Desative se conflitar com algum emulador.',
      get: () => config.keyboardShortcuts !== false,
      set: (value) => {
        config.keyboardShortcuts = value;
      },
    },
  ];
};
