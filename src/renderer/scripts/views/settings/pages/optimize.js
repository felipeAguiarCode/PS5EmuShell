import { invokeMain } from '../../../core/api.js';
import { cloneJson, escapeHtml, queryOne } from '../../../core/dom.js';
import { getState } from '../../../core/store.js';
import { renderGlyph } from '../../../ui/glyphs.js';
import { ICONS } from '../../../ui/icons.js';
import { closeModal, openConfirm, openModal } from '../../../ui/modal.js';
import { playSound } from '../../../ui/sound.js';
import { showToast } from '../../../ui/toast.js';
import { openKeyboard } from '../../../ui/virtual-keyboard.js';
import { formatPlural, normalizeKillListName } from '../settings-helpers.js';

const BYTES_PER_GB = 1073741824;
const BYTES_PER_MB = 1048576;
const WARN_LEVEL_PERCENT = 60;
const HIGH_LEVEL_PERCENT = 85;
const GPU_CARD_KEYS = ['gpu', 'vram', 'disk'];
const PERF_CARDS = [
  ['cpu', 'CPU'],
  ['ram', 'Memória RAM'],
  ['gpu', 'GPU'],
  ['vram', 'Memória de vídeo'],
  ['disk', 'Disco'],
];

let isPerfActive = false;
let lastPerfSample = null;

const renderPerfCard = ([key, label]) =>
  `<div class="perf-card" data-k="${key}"><div class="pk">${label}</div><div class="pv"><b>—</b></div>` +
  `<div class="pbar"><i></i></div><div class="ps">Medindo…</div>${key === 'cpu' ? '<div class="cores"></div>' : ''}</div>`;

const renderPerfPanel = () =>
  `<div class="perf-grid">${PERF_CARDS.map(renderPerfCard).join('')}</div>` +
  `<div class="perf-top"><div class="pk">Programas que mais usam memória</div><div class="perf-list"></div></div>`;

const calculateLevel = (percent) => {
  if (percent < WARN_LEVEL_PERCENT) return 'ok';
  return percent < HIGH_LEVEL_PERCENT ? 'warn' : 'high';
};

const updatePerfCard = (panel, key, { percent, value, subtitle }) => {
  const card = queryOne(`.perf-card[data-k="${key}"]`, panel);
  if (!card) return;
  const clampedPercent = Math.max(0, Math.min(100, percent || 0));
  queryOne('.pv', card).innerHTML = value;
  queryOne('.ps', card).textContent = subtitle;
  queryOne('.pbar i', card).style.transform = `scaleX(${clampedPercent / 100})`;
  card.dataset.level = calculateLevel(clampedPercent);
};

const updateGpuCards = (panel, sample) => {
  const info = sample.gpuInfo || {};
  if (!sample.gpu) {
    for (const key of GPU_CARD_KEYS) {
      updatePerfCard(panel, key, {
        percent: 0,
        value: '<b>…</b>',
        subtitle: 'Lendo contadores do Windows…',
      });
    }
    return;
  }
  const { gpu } = sample;
  updatePerfCard(panel, 'gpu', {
    percent: gpu.load,
    value: `<b>${gpu.load}</b>%`,
    subtitle: info.name || 'Uso 3D',
  });
  const usedBytes = (gpu.dedicated || 0) + (gpu.shared || 0);
  const totalBytes = info.vram > 0 ? info.vram + sample.ram.total / 2 : 0;
  updatePerfCard(panel, 'vram', {
    percent: totalBytes ? (100 * usedBytes) / totalBytes : 0,
    value: `<b>${Math.round(usedBytes / BYTES_PER_MB)}</b> MB`,
    subtitle: `Dedicada ${Math.round((gpu.dedicated || 0) / BYTES_PER_MB)} MB · compartilhada ${Math.round((gpu.shared || 0) / BYTES_PER_MB)} MB`,
  });
  updatePerfCard(panel, 'disk', {
    percent: gpu.disk,
    value: `<b>${gpu.disk}</b>%`,
    subtitle: 'Atividade do disco',
  });
};

const renderTopProcesses = (processes) => {
  const maxMemory = Math.max(1, ...processes.map((process) => process.memMB));
  return processes
    .map(
      (process) =>
        `<div class="perf-proc"><span class="n">${escapeHtml(process.image)}${process.count > 1 ? ` <em>×${process.count}</em>` : ''}</span><span class="b"><i style="transform:scaleX(${process.memMB / maxMemory})"></i></span><span class="m">${process.memMB} MB</span></div>`,
    )
    .join('');
};

export const handlePerfSample = (context, sample) => {
  if (!isPerfActive) return;
  lastPerfSample = sample;
  const content = context.getContentElement();
  const panel = queryOne('.perf-grid', content);
  if (!panel) return;
  updatePerfCard(panel, 'cpu', {
    percent: sample.cpu.total,
    value: `<b>${sample.cpu.total}</b>%`,
    subtitle: sample.cpu.model,
  });
  queryOne('.perf-card[data-k="cpu"] .cores', panel).innerHTML = sample.cpu.per
    .map((value) => `<span style="--v:${value / 100}" title="${value}%"></span>`)
    .join('');
  const ramPercent = Math.round((100 * sample.ram.used) / sample.ram.total);
  updatePerfCard(panel, 'ram', {
    percent: ramPercent,
    value: `<b>${(sample.ram.used / BYTES_PER_GB).toFixed(1)}</b> / ${(sample.ram.total / BYTES_PER_GB).toFixed(1)} GB`,
    subtitle: `${ramPercent}% em uso · ${((sample.ram.total - sample.ram.used) / BYTES_PER_GB).toFixed(1)} GB livres`,
  });
  updateGpuCards(panel, sample);
  queryOne('.perf-list', content).innerHTML = renderTopProcesses(sample.top);
};

export const restorePerfSample = (context) => {
  if (lastPerfSample) handlePerfSample(context, lastPerfSample);
};

export const syncPerfMonitor = (isWanted) => {
  isPerfActive = isWanted;
  if (!isWanted) lastPerfSample = null;
  invokeMain(isWanted ? 'perf:start' : 'perf:stop');
};

const renderPickItem = (item) =>
  `<button class="menu-item pick checked focusable" data-group="pick" data-name="${escapeHtml(item.name)}"><span class="pick-art opt">${ICONS.chip}</span>` +
  `<span class="pick-t">${escapeHtml(item.image)}${item.count > 1 ? ` <em class="faint">×${item.count}</em>` : ''}</span><span class="r">${item.memMB} MB<span class="check">${ICONS.check}</span></span></button>`;

const pickProcessesToClose = async (items) => {
  let selectedNames = new Set(items.map((item) => item.name));
  const calculateTotal = () =>
    items
      .filter((item) => selectedNames.has(item.name))
      .reduce((total, item) => total + item.memMB, 0);
  const isConfirmed = await openModal({
    className: 'pick-games',
    html:
      `<h3>Otimizar memória</h3><div class="sub">Estes programas da lista estão abertos e serão fechados. <b class="opt-total"></b>` +
      `<br>Salve seu trabalho antes. ${renderGlyph('a')} marcar · ${renderGlyph('start')} otimizar</div>` +
      `<div class="pick-list">${items.map(renderPickItem).join('')}</div>` +
      `<div class="modal-buttons"><button class="btn-pill focusable" data-group="mb" data-done="1">Otimizar agora</button></div>`,
    hints: [
      ['a', 'Marcar'],
      ['start', 'Otimizar'],
      ['b', 'Cancelar'],
    ],
    onMount: (box) => {
      const updateTotal = () => {
        queryOne('.opt-total', box).textContent = `Libera até ~${calculateTotal()} MB.`;
      };
      updateTotal();
      box.addEventListener('click', (event) => {
        if (event.target.closest('[data-done]')) {
          closeModal(true);
          return;
        }
        const item = event.target.closest('.pick');
        if (!item) return;
        const { name } = item.dataset;
        selectedNames = selectedNames.has(name)
          ? new Set([...selectedNames].filter((selected) => selected !== name))
          : new Set([...selectedNames, name]);
        item.classList.toggle('checked', selectedNames.has(name));
        playSound('toggle');
        updateTotal();
      });
    },
    onButton: (button) => {
      if (button !== 'start') return false;
      closeModal(true);
      return true;
    },
  });
  return isConfirmed ? [...selectedNames] : null;
};

const optimizeNow = async () => {
  const items = await invokeMain('optimize:preview');
  const shouldTrim = getState().config.optimize.trimOthers !== false;
  let processNames = [];
  if (!items.length) {
    const isConfirmed = await openConfirm(
      'Nenhum programa da lista está aberto',
      shouldTrim
        ? 'Deseja apenas compactar a memória dos programas abertos?'
        : 'Ative "Compactar memória dos outros programas" ou adicione programas à lista.',
      { ok: shouldTrim ? 'Compactar' : 'OK' },
    );
    if (!isConfirmed || !shouldTrim) return;
  } else {
    const pickedNames = await pickProcessesToClose(items);
    if (!pickedNames) return;
    processNames = pickedNames;
    if (!processNames.length && !shouldTrim) return;
  }
  showToast(
    'Otimizando…',
    processNames.length
      ? `Fechando ${processNames.length} ${formatPlural(processNames.length, 'programa', 'programas')}.`
      : 'Compactando memória.',
    { kind: 'optimizing', ms: 1600 },
  );
  const result = await invokeMain('optimize:run', processNames, shouldTrim);
  playSound('select');
  showToast(
    `${result.freedMB} MB liberados`,
    `${result.closed} ${formatPlural(result.closed, 'programa fechado', 'programas fechados')}${shouldTrim ? ` · memória de ${result.trimmed} processos compactada` : ''}`,
    { kind: 'optimized', ms: 5000 },
  );
};

const addKillListProgram = async (context, optimize) => {
  const value = await openKeyboard({ title: 'Programa a fechar (sem .exe)' });
  const name = normalizeKillListName(value);
  if (!name || optimize.killList.includes(name)) return;
  optimize.killList.push(name);
  context.changed();
};

const restoreKillList = async (context, optimize) => {
  const isConfirmed = await openConfirm(
    'Restaurar lista?',
    'A lista de programas volta ao padrão do PS5 Emu Shell.',
    { ok: 'Restaurar' },
  );
  if (!isConfirmed) return;
  optimize.killList = cloneJson(getState().defaultOptimize.killList);
  context.changed();
};

export const buildOptimizeRows = (context) => {
  const { optimize } = context.getDraft();
  return [
    { type: 'title', label: 'Otimização' },
    { type: 'panel', html: renderPerfPanel() },
    {
      type: 'button',
      style: 'action',
      icon: ICONS.gauge,
      label: 'Otimizar memória',
      desc: 'Fecha os programas da lista abaixo que estiverem abertos (você confirma antes) e libera RAM para o jogo.',
      run: () => optimizeNow(),
    },
    {
      type: 'toggle',
      label: 'Compactar memória dos outros programas',
      desc: 'Pede ao Windows para devolver a memória ociosa dos programas que continuam abertos. Não fecha nada.',
      get: () => optimize.trimOthers !== false,
      set: (value) => {
        optimize.trimOthers = value;
      },
    },
    { type: 'section', label: `Programas que podem ser fechados (${optimize.killList.length})` },
    ...optimize.killList.map((name, index) => ({
      type: 'info',
      label: name,
      desc: name.includes('*') ? 'Coringa: qualquer programa que comece assim' : `${name}.exe`,
      right: '△/Y remove',
      remove: () => optimize.killList.splice(index, 1),
    })),
    {
      type: 'button',
      style: 'action',
      icon: ICONS.plus,
      label: 'Adicionar programa',
      desc: 'Nome do executável sem .exe (veja em "Programas que mais usam memória"). Use * como coringa.',
      run: () => addKillListProgram(context, optimize),
    },
    {
      type: 'button',
      icon: ICONS.refresh,
      label: 'Restaurar lista padrão',
      run: () => restoreKillList(context, optimize),
    },
  ];
};
