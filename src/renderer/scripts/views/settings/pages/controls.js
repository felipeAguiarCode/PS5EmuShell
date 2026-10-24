import { invokeMain } from '../../../core/api.js';
import { runCommand } from '../../../core/commands.js';
import { queryOne } from '../../../core/dom.js';
import { getState, updateState } from '../../../core/store.js';
import { PAD_TYPES, PLAYER_COLORS } from '../../../constants/controllers.js';
import { ICONS } from '../../../ui/icons.js';
import { openMenu } from '../../../ui/modal.js';
import { showToast } from '../../../ui/toast.js';
import { focusElement } from '../../../navigation/spatial-navigation.js';
import { CONNECTION_NAMES } from '../settings-constants.js';
import { buildButtonGlyphOptions } from './appearance.js';

const PLAYER_SLOT_INDEXES = [0, 1, 2, 3];
const EMPTY_PADS = { slots: [], unassigned: [], sources: { xinput: {}, hid: {} } };
const COMMAND_HINTS = [
  ['a', 'Confirmar / Jogar'],
  ['b', 'Voltar'],
  ['y', 'Opções do jogo'],
  ['x', 'Favoritar'],
  ['lb+rb', 'Sistema anterior / próximo'],
  ['lt+rt', 'Aba anterior / próxima (Jogos, Biblioteca, Coleções, Troféus)'],
  ['start', 'Configurações'],
  ['back', 'Buscar'],
];

const findConnectionName = (device) => CONNECTION_NAMES[device.conn] || '';

const listConnectedPads = (pads) => [
  ...pads.slots.filter((slot) => slot.connected),
  ...pads.unassigned,
];

const storePads = (pads) => updateState({ pads });

const buildSlotMenuItems = (slot) => {
  const items = [];
  if (slot.connected) {
    items.push(
      { label: 'Testar controle', icon: ICONS.bolt, value: 'test' },
      { label: 'Vibrar (identificar)', icon: ICONS.gamepad, value: 'rumble' },
    );
  }
  if (slot.slot >= 0)
    items.push({ label: 'Autodetectar para este slot', icon: ICONS.refresh, value: 'detect' });
  if (!slot.empty) {
    const { slots } = getState().pads;
    items.push(
      ...PLAYER_SLOT_INDEXES.filter((index) => index !== slot.slot).map((index) => ({
        label:
          slot.slot >= 0 ? `Mover para Jogador ${index + 1}` : `Usar como Jogador ${index + 1}`,
        icon: ICONS.chevR,
        right: slots[index].empty ? 'livre' : `troca com ${slots[index].name}`,
        value: `to:${index}`,
      })),
    );
  }
  if (slot.slot >= 0 && !slot.empty)
    items.push({ label: 'Liberar slot', icon: ICONS.trash, value: 'clear' });
  return items;
};

const findDetectionTarget = (slot, device) => {
  if (slot !== null) return slot;
  const { slots } = getState().pads;
  if (device.slot >= 0) return device.slot;
  const emptySlot = slots.findIndex((candidate) => candidate.empty);
  return emptySlot >= 0 ? emptySlot : slots.findIndex((candidate) => !candidate.connected);
};

const detectPad = async (context, slot = null) => {
  const device = await runCommand(
    'detectPad',
    slot === null ? 'Autodetectar controle' : `Controle do Jogador ${slot + 1}`,
    'Pressione qualquer botão no controle que você quer usar.',
  );
  if (!device) {
    showToast('Nenhum controle detectado', 'Nenhum botão foi pressionado.', {
      kind: 'padOff',
      ms: 2600,
    });
    return;
  }
  runCommand('setPadType', device.type);
  const target = findDetectionTarget(slot, device);
  if (target >= 0 && target !== device.slot)
    storePads(await invokeMain('pads:assign', target, device.key));
  const connection = CONNECTION_NAMES[device.conn];
  showToast(
    'Controle detectado',
    `${device.name} · ${connection} · ${target >= 0 ? `Jogador ${target + 1}` : 'todos os slots ocupados'}`,
    { kind: 'padOn', ms: 3200 },
  );
  context.render();
  const row =
    target >= 0 && queryOne(`.set-row[data-id="slot-${target}"]`, context.getContentElement());
  if (row) focusElement(row, { silent: true });
};

const openSlotMenu = async (context, slot) => {
  const choice = await openMenu({
    title: slot.slot >= 0 ? `Jogador ${slot.slot + 1}` : slot.name,
    sub: slot.empty ? 'Slot livre' : slot.name,
    items: buildSlotMenuItems(slot),
  });
  if (!choice) return;
  if (choice === 'test') runCommand('openPadTest', slot);
  else if (choice === 'rumble') invokeMain('pads:rumble', slot.key);
  else if (choice === 'detect') detectPad(context, slot.slot);
  else if (choice === 'clear') storePads(await invokeMain('pads:clear', slot.slot));
  else if (choice.startsWith('to:')) {
    const targetSlot = Number(choice.slice(3));
    storePads(await invokeMain('pads:assign', targetSlot, slot.key));
    showToast('Controle movido', `${slot.name} agora é o Jogador ${targetSlot + 1}.`, {
      kind: 'padOn',
      ms: 2400,
    });
  }
  context.render();
};

const testPad = async () => {
  const connected = listConnectedPads(getState().pads);
  if (!connected.length) {
    showToast('Nenhum controle conectado', 'Conecte um controle por USB ou Bluetooth.', {
      kind: 'padOff',
    });
    return;
  }
  if (connected.length === 1) {
    runCommand('openPadTest', connected[0]);
    return;
  }
  const device = await runCommand(
    'detectPad',
    'Qual controle testar?',
    'Pressione um botão no controle que você quer testar.',
  );
  if (device) runCommand('openPadTest', device);
};

const describeSlot = (slot) => {
  if (slot.empty)
    return 'Conecte um controle: ele entra sozinho no próximo slot livre. Ou use Autodetectar.';
  if (!slot.connected) {
    return 'Desconectado · o slot fica reservado; um controle novo só o ocupa se não houver slot vazio.';
  }
  const typeName = PAD_TYPES[slot.type] ? PAD_TYPES[slot.type].name : slot.type;
  return `${typeName} · conectado por ${findConnectionName(slot)}`;
};

const describeSlotState = (slot) => {
  if (slot.empty) return '';
  return slot.connected ? '● Conectado' : '○ Desconectado';
};

const buildSlotRow = (context, slot) => ({
  type: 'button',
  id: `slot-${slot.slot}`,
  leadHtml: `<span class="slot-badge${slot.connected ? ' on' : ''}" style="--c:${PLAYER_COLORS[slot.slot]}">${slot.slot + 1}</span>`,
  label: slot.empty
    ? `Jogador ${slot.slot + 1} · livre`
    : `Jogador ${slot.slot + 1} · ${slot.name}`,
  desc: describeSlot(slot),
  right: describeSlotState(slot),
  remove: slot.empty ? null : () => invokeMain('pads:clear', slot.slot).then(storePads),
  removeLabel: 'Liberar slot',
  xLabel: slot.connected ? 'Testar' : null,
  xRun: slot.connected ? () => runCommand('openPadTest', slot) : null,
  run: () => openSlotMenu(context, slot),
});

const buildUnassignedRow = (context, device) => ({
  type: 'button',
  leadHtml: `<span class="slot-badge">–</span>`,
  label: `${device.name} · sem slot`,
  desc: `Conectado por ${findConnectionName(device)}. Todos os slots estão ocupados: escolha um para ele.`,
  run: () => openSlotMenu(context, { ...device, slot: -1, connected: true }),
});

const describeSource = (source, availableText) =>
  source.available ? availableText : `Indisponível (${source.error || 'erro'}).`;

export const buildControlsRows = (context) => {
  const pads = getState().pads || EMPTY_PADS;
  const config = context.getDraft();
  const connected = listConnectedPads(pads);
  return [
    { type: 'title', label: 'Controles' },
    { type: 'section', label: 'Jogadores' },
    ...pads.slots.map((slot) => buildSlotRow(context, slot)),
    ...pads.unassigned.map((device) => buildUnassignedRow(context, device)),
    {
      type: 'button',
      style: 'action',
      icon: ICONS.gamepad,
      label: 'Autodetectar controle',
      desc: 'Pressione um botão no controle: ele é reconhecido e colocado no próximo slot livre (ou no que já tinha).',
      run: () => detectPad(context),
    },
    {
      type: 'button',
      icon: ICONS.bolt,
      label: 'Testar controle',
      desc: connected.length
        ? 'Mostra o diagrama do controle e acende cada botão, direcional, gatilho e analógico pressionado.'
        : 'Nenhum controle conectado.',
      run: () => testPad(),
    },
    {
      type: 'toggle',
      label: 'Associar automaticamente ao conectar',
      desc: 'Todo controle conectado entra sozinho no próximo slot livre. A barra de luz do DualShock 4/DualSense acende na cor do jogador.',
      get: () => pads.autoAssign !== false,
      set: (value) => {
        storePads({ ...getState().pads, autoAssign: value });
        invokeMain('pads:autoAssign', value).then(storePads);
      },
    },
    {
      type: 'select',
      label: 'Ícones dos botões',
      desc: 'Automático segue o controle em uso: Xbox mostra A/B/X/Y; DualShock 4 e DualSense mostram ✕/○/□/△.',
      options: buildButtonGlyphOptions('Automático'),
      get: () => config.buttonGlyphs,
      set: (value) => {
        config.buttonGlyphs = value;
      },
      after: () => {
        runCommand('applyAppearance');
        runCommand('updateHints');
      },
    },
    { type: 'section', label: 'Compatibilidade' },
    {
      type: 'info',
      label: 'Xbox e compatíveis (XInput)',
      desc: describeSource(
        pads.sources.xinput,
        'Leitura direta, inclusive com o launcher oculto atrás do jogo.',
      ),
      right: pads.sources.xinput.available ? 'Ativo' : 'Indisponível',
    },
    {
      type: 'info',
      label: 'DualShock 4 e DualSense (PS4 e PS5)',
      desc: describeSource(
        pads.sources.hid,
        'Nativo, por USB ou Bluetooth, sem Steam nem DS4Windows. Os atalhos de fechar/voltar ao launcher também funcionam durante o jogo.',
      ),
      right: pads.sources.hid.available ? 'Ativo' : 'Indisponível',
    },
    {
      type: 'info',
      label: 'Dentro dos emuladores',
      desc: 'Cada emulador lê o controle por conta própria: DuckStation, PCSX2, PPSSPP e Dolphin aceitam DualShock 4/DualSense nativamente (SDL). A ordem dos jogadores é configurada em cada emulador.',
    },
    {
      type: 'link',
      label: 'Atalhos do launcher',
      desc: 'Fechar o jogo, voltar ao launcher durante o jogo e atalhos de teclado.',
      go: 'shortcuts',
    },
    { type: 'section', label: 'Comandos' },
    ...COMMAND_HINTS.map(([button, label]) => ({ type: 'info', label, glyph: button })),
    { type: 'section', label: 'Teclado e mouse' },
    { type: 'info', label: 'Setas · Enter · Esc', right: 'Navegar · Confirmar · Voltar' },
    { type: 'info', label: 'Q / E · F · O', right: 'Sistema · Favoritar · Opções' },
    { type: 'info', label: 'Ctrl+F · F1 · F11', right: 'Buscar · Configurações · Tela cheia' },
    { type: 'info', label: 'Mouse', right: 'O cursor só aparece ao mexer o mouse' },
  ];
};
