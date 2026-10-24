import { PAD_TYPES } from '../../constants/controllers.js';
import { invokeMain } from '../../core/api.js';
import { registerCommands } from '../../core/commands.js';
import { escapeHtml, queryAll, queryOne } from '../../core/dom.js';
import { renderGlyph } from '../../ui/glyphs.js';
import { ICONS } from '../../ui/icons.js';
import { closeModal, openModal } from '../../ui/modal.js';
import { playSound } from '../../ui/sound.js';
import {
  formatAxisValue,
  formatPadButtonLabel,
  listPadTestButtons,
  renderPadDiagram,
} from './pad-diagram.js';
import { renderPadIcon } from './pad-icon.js';
import {
  calculateExitProgress,
  calculateTriggerWidth,
  formatStickTransform,
  listPressedButtons,
  listPressedLabels,
  withTestedButtons,
} from './pad-test-state.js';

let session = null;

const renderPadTestHtml = (device, type, buttons) =>
  `<div class="pt-head"><div class="pt-ico">${renderPadIcon(type)}</div><div><h3>Testar controle</h3>` +
  `<div class="sub">${escapeHtml(device.name || PAD_TYPES[type].name)}${device.slot >= 0 ? ` · Jogador ${device.slot + 1}` : ''}</div></div>` +
  `<div class="pt-count"><b>0</b> de ${buttons.length} testados</div></div>` +
  `<div class="pt-body"><div class="pt-stage">${renderPadDiagram(type)}<div class="pt-off hidden">Controle desconectado</div></div>` +
  `<div class="pt-side">` +
  `<div class="pt-k">Pressionados agora</div><div class="pt-now">—</div>` +
  `<div class="pt-k">Analógicos</div><div class="pt-axes"></div>` +
  `<div class="pt-k">Botões</div><div class="pt-list">${buttons.map((button) => `<span data-c="${button}">${escapeHtml(formatPadButtonLabel(button, type))}</span>`).join('')}</div>` +
  `</div></div>` +
  `<div class="pt-foot"><div class="pt-exit"><i></i><span>Segure ${renderGlyph('b')} para sair</span></div>` +
  `<button class="btn-pill focusable" data-group="pt" data-v="rumble">Vibrar</button><button class="btn-pill focusable" data-group="pt" data-v="close">Fechar</button></div>`;

export const openPadTest = async (device) => {
  const type = device.type || 'xbox';
  const buttons = listPadTestButtons(type);
  session = { device, type, buttons, testedButtons: new Set(), holdSince: 0, box: null };
  invokeMain('pads:watch', device.key);
  await openModal({
    className: 'pad-test',
    html: renderPadTestHtml(device, type, buttons),
    hints: [['b', 'Segure para sair']],
    onButton: () => true,
    onKey: (event) => {
      if (event.key === 'Escape') closeModal();
      return true;
    },
    onMount: (box) => {
      session.box = box;
      box.addEventListener('click', (event) => {
        const button = event.target.closest('[data-v]');
        if (!button) return;
        if (button.dataset.v === 'rumble') invokeMain('pads:rumble', device.key);
        else closeModal();
      });
    },
  });
  invokeMain('pads:watch', null);
  session = null;
};

const renderLiveDiagram = (box, padState, pressedButtons) => {
  for (const element of queryAll('[data-b]', box)) {
    element.classList.toggle('on', pressedButtons.has(element.dataset.b));
  }
  for (const element of queryAll('[data-t]', box)) {
    element.setAttribute('width', calculateTriggerWidth(padState[element.dataset.t]));
  }
  for (const stick of queryAll('[data-stick]', box)) {
    const axes =
      stick.dataset.stick === 'ls' ? [padState.lx, padState.ly] : [padState.rx, padState.ry];
    queryOne('.pd-cap', stick).setAttribute('transform', formatStickTransform(axes));
  }
};

const renderProgress = (box, padState) => {
  for (const element of queryAll('.pt-list [data-c]', box)) {
    element.classList.toggle('ok', session.testedButtons.has(element.dataset.c));
  }
  const testedCount = session.buttons.filter((button) => session.testedButtons.has(button)).length;
  queryOne('.pt-count b', box).textContent = testedCount;
  queryOne('.pt-count', box).classList.toggle('all', testedCount === session.buttons.length);
  queryOne('.pt-now', box).textContent = listPressedLabels(padState, (button) =>
    formatPadButtonLabel(button, session.type),
  );
  queryOne('.pt-axes', box).innerHTML =
    `<span>Esq.</span><span>X ${formatAxisValue(padState.lx)}</span><span>Y ${formatAxisValue(padState.ly)}</span>` +
    `<span>Dir.</span><span>X ${formatAxisValue(padState.rx)}</span><span>Y ${formatAxisValue(padState.ry)}</span>`;
};

const updateExitHold = (box, isHoldingBack) => {
  if (isHoldingBack && !session.holdSince) session.holdSince = performance.now();
  if (!isHoldingBack) session.holdSince = 0;
  const progress = calculateExitProgress(session.holdSince, performance.now());
  queryOne('.pt-exit i', box).style.width = `${progress * 100}%`;
  if (progress >= 1) {
    session.holdSince = 0;
    playSound('back');
    closeModal();
  }
};

export const handlePadState = (padState) => {
  if (!session || !session.box || padState.key !== session.device.key) return;
  const { box } = session;
  queryOne('.pt-off', box).classList.toggle('hidden', padState.connected);
  if (!padState.connected) return;
  const pressedButtons = listPressedButtons(padState);
  renderLiveDiagram(box, padState, pressedButtons);
  session.testedButtons = withTestedButtons(session.testedButtons, padState);
  renderProgress(box, padState);
  updateExitHold(box, pressedButtons.has('b'));
};

export const detectPad = async (title, subtitle) => {
  let isClosed = false;
  const shown = openModal({
    className: 'pad-detect',
    html:
      `<div class="pd-wait"><div class="pd-pulse">${ICONS.gamepad}</div><h3>${escapeHtml(title)}</h3>` +
      `<div class="sub">${escapeHtml(subtitle || 'Pressione qualquer botão no controle.')}</div><div class="sub faint">Esc ou 15 s sem resposta para cancelar.</div></div>`,
    hints: [],
    onButton: () => true,
    onKey: (event) => {
      if (event.key === 'Escape') invokeMain('pads:cancelDetect');
      return true;
    },
  });
  shown.then(() => {
    isClosed = true;
  });
  const device = await invokeMain('pads:detect');
  if (!isClosed) closeModal();
  return device;
};

export const initPadTest = () => {
  registerCommands({ openPadTest, detectPad, handlePadState });
};
