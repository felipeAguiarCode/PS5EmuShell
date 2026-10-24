import { invokeMain } from '../../../core/api.js';
import { runCommand } from '../../../core/commands.js';
import { cloneJson, escapeHtml, queryAll } from '../../../core/dom.js';
import { formatFileSize } from '../../../core/format.js';
import { getState, updateState } from '../../../core/store.js';
import { findConsoleIcon } from '../../../ui/console-icons.js';
import { ICONS } from '../../../ui/icons.js';
import { openConfirm, openMenu } from '../../../ui/modal.js';
import { showToast } from '../../../ui/toast.js';
import {
  buildEmulatorDescription,
  buildProgressText,
  findEmulatorVersion,
  formatEmulatorVersion,
} from '../settings-helpers.js';

const FINISHED_PHASES = ['done', 'error'];
const EMPTY_SETUP_STATUS = { dirs: [], emulators: [], base: '' };

let setupStatus = null;
let versions = null;
let isLoadingVersions = false;
let progressByEmulator = {};

const findVersion = (emulator) => findEmulatorVersion(versions, emulator);

const describeProgress = (emulator) =>
  buildProgressText({
    emulator,
    progress: progressByEmulator[emulator.id],
    version: findVersion(emulator),
    formatSize: formatFileSize,
  });

export const loadSetupStatus = async () => {
  setupStatus = await invokeMain('setup:status');
  return setupStatus;
};

export const loadVersions = async (context, isForced) => {
  isLoadingVersions = true;
  const result = await invokeMain('setup:versions', isForced);
  isLoadingVersions = false;
  if (result.ok) versions = result.items;
  if (context.isPageVisible('setup')) context.render();
};

export const handleSetupProgress = (context, progress) => {
  progressByEmulator = { ...progressByEmulator, [progress.id]: progress };
  const emulator = setupStatus && setupStatus.emulators.find((item) => item.id === progress.id);
  if (!emulator) return;
  for (const value of queryAll(
    `.set-row[data-id="emu-${progress.id}"] .val`,
    context.getContentElement(),
  )) {
    value.innerHTML = `<span>${escapeHtml(describeProgress(emulator))}</span>`;
  }
};

const reloadSetup = async (context) => {
  updateState({ config: await invokeMain('config:get') });
  setupStatus = await invokeMain('setup:status');
  await context.refreshExists();
  if (context.isPageVisible('setup')) context.render();
};

export const createFolderStructure = async (context) => {
  const status = setupStatus || (await invokeMain('setup:status'));
  const missingCount = status.dirs.filter((dir) => !dir.exists).length;
  await invokeMain('setup:createDirs');
  await reloadSetup(context);
  showToast(
    'Estrutura de pastas pronta',
    missingCount
      ? `${missingCount} pastas criadas em ${getState().paths.base}.`
      : 'Todas as pastas já existiam.',
    { kind: 'folders' },
  );
};

const confirmUpdate = (emulator) => {
  const version = findVersion(emulator);
  const latest = version && version.latest ? formatEmulatorVersion(version.latest) : 'mais recente';
  const installed =
    version && version.installed ? formatEmulatorVersion(version.installed) || '—' : '—';
  return openConfirm(
    `Atualizar ${emulator.name}?`,
    `Instalada: ${installed} · Última: ${latest} (${version ? version.source : ''}). Os arquivos do programa serão substituídos; configurações, saves e BIOS são mantidos.`,
    { ok: 'Atualizar' },
  );
};

const installEmulator = async (context, emulator, { confirm = true } = {}) => {
  if (!emulator.downloadable) {
    showToast(
      'Sem download automático',
      `${emulator.name}: escolha o executável em Sistemas e emuladores.`,
      { kind: 'info' },
    );
    return false;
  }
  const progress = progressByEmulator[emulator.id];
  if (progress && !FINISHED_PHASES.includes(progress.phase)) return false;
  if (confirm && emulator.installed && !(await confirmUpdate(emulator))) return false;
  handleSetupProgress(context, { id: emulator.id, phase: 'resolve' });
  const result = await invokeMain('setup:install', emulator.system, emulator.id);
  if (result.ok) {
    showToast(
      `${emulator.name} instalado`,
      `Versão ${result.version || 'mais recente'} em ${result.exe}`,
      {
        kind: 'install',
      },
    );
  } else {
    showToast(`Falha ao instalar ${emulator.name}`, result.error, {
      kind: 'installFail',
      ms: 7000,
    });
  }
  await reloadSetup(context);
  await loadVersions(context, false);
  return result.ok;
};

export const installMissingEmulators = async (context) => {
  const status = await invokeMain('setup:status');
  const missing = status.emulators.filter(
    (emulator) => !emulator.installed && emulator.downloadable,
  );
  if (!missing.length) {
    showToast(
      'Nada para baixar',
      'Todos os emuladores com download automático já estão instalados.',
      { kind: 'success' },
    );
    return;
  }
  if (status.dirs.some((dir) => !dir.exists)) await invokeMain('setup:createDirs');
  for (const emulator of missing) await installEmulator(context, emulator, { confirm: false });
};

const syncFolders = async (context) => {
  showToast('Sincronizando emuladores…', 'Procurando executáveis nas pastas dos emuladores.', {
    kind: 'scan',
    ms: 1800,
  });
  const report = await invokeMain('setup:sync');
  await reloadSetup(context);
  await loadVersions(context, true);
  const found = report.filter((item) => item.status === 'found');
  const missing = report.filter((item) => item.status === 'missing');
  const foundText = found.length
    ? ` · ${found.length} encontrados (${found.map((item) => item.name).join(', ')})`
    : '';
  const missingText = missing.length ? ` · ${missing.length} sem executável` : '';
  showToast(
    'Pastas sincronizadas',
    `${report.length - missing.length} instalados${foundText}${missingText}`,
    { kind: 'folders', ms: 5000 },
  );
};

const updateAll = async (context) => {
  const status = await invokeMain('setup:status');
  const outdated = status.emulators.filter((emulator) => {
    const version = findVersion(emulator);
    return emulator.installed && emulator.downloadable && version && version.state === 'old';
  });
  if (!outdated.length) {
    showToast('Tudo atualizado', 'Todos os emuladores estão na última versão.', {
      kind: 'success',
    });
    return;
  }
  const seenIds = new Set();
  for (const emulator of outdated) {
    if (seenIds.has(emulator.id)) continue;
    seenIds.add(emulator.id);
    await installEmulator(context, emulator, { confirm: false });
  }
};

const pickExistingEmulator = (item) =>
  runCommand('openFileBrowser', {
    mode: 'exe',
    title: `Executável do ${item.emulators[0]} (ou de outro emulador de ${item.name})`,
  });

const saveSystemEmulatorExe = async (systemId, exe) => {
  const config = cloneJson(getState().config);
  const system = config.systems.find((candidate) => candidate.id === systemId);
  const emulator =
    system.emulators.find((candidate) => candidate.id === system.defaultEmulator) ||
    system.emulators[0];
  emulator.exe = await invokeMain('path:portable', exe);
  updateState({ config });
  await invokeMain('config:save', config);
};

const addCatalogSystem = async (context, item) => {
  if (item.added) {
    showToast(`${item.name} já foi adicionado`, 'Veja em Sistemas e emuladores.', { kind: 'info' });
    return;
  }
  const choice = await openMenu({
    title: `Adicionar ${item.name}`,
    sub: `Cria a pasta roms/${item.id}. Emulador padrão: ${item.emulators[0]}${item.source ? ` (${item.source})` : ''}.`,
    items: [
      {
        label: `Adicionar e baixar o ${item.emulators[0]}`,
        icon: ICONS.download,
        right: 'última versão',
        value: 'download',
      },
      {
        label: 'Adicionar e apontar o meu emulador',
        icon: ICONS.folder,
        right: '.exe já instalado',
        value: 'point',
      },
      { label: 'Só adicionar o sistema', icon: ICONS.plus, value: 'add' },
    ],
  });
  if (!choice) return;
  const exe = choice === 'point' ? await pickExistingEmulator(item) : null;
  if (choice === 'point' && !exe) return;
  await invokeMain('setup:addSystem', item.id);
  updateState({ config: await invokeMain('config:get') });
  if (exe) await saveSystemEmulatorExe(item.id, exe);
  const system = getState().config.systems.find((candidate) => candidate.id === item.id);
  context.markSystemsDirty();
  await reloadSetup(context);
  showToast(`${item.name} adicionado`, `Coloque as ROMs em roms/${item.id}.`, {
    kind: 'systemAdd',
  });
  const emulator = setupStatus.emulators.find(
    (candidate) => candidate.system === item.id && candidate.id === system.defaultEmulator,
  );
  if (choice === 'download' && emulator && !emulator.installed) {
    await installEmulator(context, emulator, { confirm: false });
  }
};

const buildEmulatorRow = (context, emulator) => {
  const version = findVersion(emulator);
  const isHighlighted =
    emulator.downloadable && (!emulator.installed || (version && version.state === 'old'));
  return {
    type: 'button',
    id: `emu-${emulator.id}`,
    leadHtml: `<span class="ico console-lead">${findConsoleIcon(emulator.system)}</span>`,
    label: emulator.name,
    desc: buildEmulatorDescription(emulator, version, isLoadingVersions),
    right: describeProgress(emulator),
    style: isHighlighted ? 'action' : '',
    run: () => installEmulator(context, emulator),
  };
};

const buildCatalogRow = (context, item) => ({
  type: 'button',
  leadHtml: `<span class="ico console-lead">${findConsoleIcon(item.id)}</span>`,
  label: item.added ? item.name : `Adicionar ${item.name}`,
  desc: `${item.shortName} · emuladores: ${item.emulators.join(', ')}${item.source ? ` · ${item.source}` : ''}`,
  right: item.added ? '✓ Adicionado' : 'Adicionar',
  style: item.added ? '' : 'action',
  run: () => addCatalogSystem(context, item),
});

export const buildSetupRows = (context) => {
  const status = setupStatus || EMPTY_SETUP_STATUS;
  const missingDirs = status.dirs.filter((dir) => !dir.exists);
  const missingEmulators = status.emulators.filter(
    (emulator) => !emulator.installed && emulator.downloadable,
  );
  return [
    { type: 'title', label: 'Instalação' },
    { type: 'info', label: 'Pasta base', desc: status.base, right: 'Altere em Geral › Pasta base' },
    { type: 'section', label: 'Estrutura de pastas' },
    {
      type: 'info',
      label: 'bios · cores · roms · saves · screenshots',
      desc: 'Uma pasta por sistema e por emulador, conforme a configuração de Sistemas e emuladores.',
      leadHtml: `<span class="status-dot${missingDirs.length ? '' : ' ok'}"></span>`,
      right: missingDirs.length
        ? `${missingDirs.length} de ${status.dirs.length} faltando`
        : `Completa (${status.dirs.length} pastas)`,
    },
    ...missingDirs.map((dir) => ({
      type: 'info',
      label: dir.rel,
      desc: dir.label,
      right: 'Não existe',
    })),
    {
      type: 'button',
      style: 'action',
      icon: ICONS.folder,
      label: missingDirs.length ? 'Criar estrutura de pastas' : 'Recriar pastas que faltarem',
      run: () => createFolderStructure(context),
    },
    {
      type: 'button',
      icon: ICONS.folder,
      label: 'Abrir pasta base',
      run: () => invokeMain('path:open', '.'),
    },
    { type: 'section', label: 'Emuladores' },
    {
      type: 'button',
      style: 'action',
      icon: ICONS.refresh,
      label: 'Sincronizar pastas dos emuladores',
      desc: 'Baixou ou atualizou um emulador por fora? Extraia na pasta dele em cores\\… e sincronize: o PS5 Emu Shell acha o executável e lê a versão.',
      run: () => syncFolders(context),
    },
    ...status.emulators.map((emulator) => buildEmulatorRow(context, emulator)),
    {
      type: 'button',
      icon: ICONS.download,
      label: 'Atualizar todos os desatualizados',
      desc: 'Baixa a última versão de cada emulador que estiver atrás. Configurações, saves e BIOS são mantidos.',
      run: () => updateAll(context),
    },
    {
      type: 'button',
      style: 'action',
      icon: ICONS.plus,
      label: missingEmulators.length
        ? `Baixar os ${missingEmulators.length} emuladores que faltam`
        : 'Todos os emuladores estão instalados',
      desc: 'Baixa a versão mais recente do site oficial / GitHub de cada emulador e instala em modo portable.',
      run: () => installMissingEmulators(context),
    },
    { type: 'section', label: 'Adicionar mais sistemas' },
    {
      type: 'info',
      label: 'Baixe a última versão ou use o seu emulador',
      desc: 'Cada sistema pode baixar o emulador oficial (sempre a versão mais recente) ou apontar para um executável que você já tem. Depois dá para trocar em Sistemas e emuladores.',
    },
    ...(status.catalog || []).map((item) => buildCatalogRow(context, item)),
  ];
};
