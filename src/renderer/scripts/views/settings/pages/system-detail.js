import { invokeMain } from '../../../core/api.js';
import { SYSTEM_COLOR_PALETTE } from '../../../constants/systems.js';
import { ICONS } from '../../../ui/icons.js';
import { openConfirm } from '../../../ui/modal.js';
import { showToast } from '../../../ui/toast.js';
import { buildPcSystemRows } from '../../pc-games/pc-system-rows.js';
import { buildEmulatorFromExe, parseExtensions } from '../settings-helpers.js';
import { buildSystemsRows } from './systems.js';

export const buildColorRow = (system) => ({
  type: 'select',
  label: 'Cor',
  swatch: true,
  options: SYSTEM_COLOR_PALETTE.map((color) => ({ v: color, l: color })),
  get: () => system.color,
  set: (value) => {
    system.color = value;
  },
});

const openEmulator = async (emulator) => {
  const isOpened = await invokeMain('emu:open', emulator.exe);
  if (!isOpened) showToast('Executável não encontrado', emulator.exe, { kind: 'emuMissing' });
};

const addEmulator = async (context, system) => {
  const exe = await invokeMain('dialog:pick', { kind: 'file', title: 'Executável do emulador' });
  if (!exe) return;
  const emulator = buildEmulatorFromExe(exe, system.emulators);
  system.emulators.push(emulator);
  if (!system.defaultEmulator) system.defaultEmulator = emulator.id;
  await context.refreshExists();
  context.changed();
  showToast(
    'Emulador adicionado',
    `${emulator.name} — confira os argumentos de linha de comando.`,
    {
      kind: 'emulator',
    },
  );
};

const addRomDir = async (context, system) => {
  const romDir = await invokeMain('dialog:pick', { kind: 'folder', title: 'Pasta de ROMs' });
  if (!romDir) return;
  system.romDirs.push(romDir);
  await context.refreshExists();
  context.changed(true);
};

const removeEmulator = async (context, system, emulator, index) => {
  const isConfirmed = await openConfirm(
    'Remover emulador?',
    `${emulator.name} será removido de ${system.name}. Os arquivos não são apagados.`,
    { ok: 'Remover' },
  );
  if (!isConfirmed) return;
  system.emulators.splice(index, 1);
  if (system.defaultEmulator === emulator.id) {
    system.defaultEmulator = system.emulators[0] ? system.emulators[0].id : '';
  }
  context.changed();
};

const removeSystem = async (context, system) => {
  const isConfirmed = await openConfirm(
    'Remover sistema?',
    `${system.name} e seus emuladores serão removidos da configuração. Nenhum arquivo é apagado.`,
    { ok: 'Remover' },
  );
  if (!isConfirmed) return;
  const draft = context.getDraft();
  draft.systems = draft.systems.filter((candidate) => candidate !== system);
  context.markSystemsDirty();
  context.commitDraft();
  context.saveSoon();
  context.go('systems');
  context.focusContent();
};

const buildRomDirRows = (system) =>
  system.romDirs.map((_, index) => ({
    type: 'path',
    kind: 'folder',
    label: system.romDirs.length > 1 ? `Pasta de ROMs ${index + 1}` : 'Pasta de ROMs',
    desc:
      system.romDirs.length > 1
        ? 'Subpastas também são lidas. △/Y remove esta pasta.'
        : 'Subpastas também são lidas.',
    get: () => system.romDirs[index],
    set: (value) => {
      if (value) system.romDirs[index] = value;
    },
    remove: system.romDirs.length > 1 ? () => system.romDirs.splice(index, 1) : null,
    systems: true,
  }));

const buildEmulatorRows = (context, system, emulator, index) => [
  {
    type: 'section',
    label: `${emulator.name}${emulator.id === system.defaultEmulator ? ' · padrão' : ''}`,
  },
  {
    type: 'text',
    label: 'Nome',
    get: () => emulator.name,
    set: (value) => {
      emulator.name = value || emulator.name;
    },
  },
  {
    type: 'path',
    kind: 'file',
    label: 'Executável',
    desc: 'A/✕ escolhe o arquivo · □/X edita o caminho como texto.',
    get: () => emulator.exe,
    set: (value) => {
      if (value) emulator.exe = value;
    },
  },
  {
    type: 'text',
    label: 'Argumentos',
    desc: 'Variáveis: {rom} {romDir} {romName} {baseDir} {exeDir}. Use aspas em caminhos.',
    get: () => emulator.args,
    set: (value) => {
      emulator.args = value;
    },
  },
  {
    type: 'button',
    style: 'action',
    icon: ICONS.play,
    label: 'Abrir emulador',
    desc: 'Abre sem jogo, para configurar BIOS, controles e vídeo.',
    run: () => openEmulator(emulator),
  },
  {
    type: 'button',
    style: 'danger',
    icon: ICONS.trash,
    label: 'Remover emulador',
    run: () => removeEmulator(context, system, emulator, index),
  },
];

export const buildSystemDetailRows = (context, systemId) => {
  const system = context.getDraft().systems.find((candidate) => candidate.id === systemId);
  if (!system) return buildSystemsRows(context);
  if (system.native) return buildPcSystemRows(system, buildColorRow(system));
  const defaultEmulatorRows = system.emulators.length
    ? [
        {
          type: 'select',
          label: 'Emulador padrão',
          desc: 'Cada jogo pode usar outro emulador pelo menu de opções (△/Y).',
          options: system.emulators.map((emulator) => ({ v: emulator.id, l: emulator.name })),
          get: () => system.defaultEmulator,
          set: (value) => {
            system.defaultEmulator = value;
          },
        },
      ]
    : [];
  return [
    { type: 'title', label: system.name },
    {
      type: 'toggle',
      label: 'Ativado',
      desc: 'Sistemas desativados não aparecem na biblioteca.',
      get: () => system.enabled !== false,
      set: (value) => {
        system.enabled = value;
      },
      systems: true,
    },
    {
      type: 'text',
      label: 'Nome',
      get: () => system.name,
      set: (value) => {
        system.name = value || system.name;
      },
    },
    {
      type: 'text',
      label: 'Sigla',
      desc: 'Usada nos filtros e etiquetas (ex.: PS2).',
      get: () => system.shortName,
      set: (value) => {
        system.shortName = value || system.shortName;
      },
    },
    buildColorRow(system),
    { type: 'section', label: 'Jogos' },
    ...buildRomDirRows(system),
    {
      type: 'button',
      style: 'action',
      icon: ICONS.plus,
      label: 'Adicionar pasta de ROMs',
      run: () => addRomDir(context, system),
    },
    {
      type: 'text',
      label: 'Extensões',
      desc: 'Separadas por vírgula. Arquivos citados em .cue/.m3u são agrupados automaticamente.',
      get: () => system.extensions.join(', '),
      set: (value) => {
        system.extensions = parseExtensions(value);
      },
      systems: true,
    },
    {
      type: 'text',
      label: 'Repositório de capas',
      desc: 'Pasta em thumbnails.libretro.com (ex.: Sony - PlayStation 2). Vazio desativa o download.',
      get: () => system.thumbnailsRepo || '',
      set: (value) => {
        system.thumbnailsRepo = value.trim();
      },
    },
    { type: 'section', label: 'Emuladores' },
    ...defaultEmulatorRows,
    ...system.emulators.flatMap((emulator, index) =>
      buildEmulatorRows(context, system, emulator, index),
    ),
    {
      type: 'button',
      style: 'action',
      icon: ICONS.plus,
      label: 'Adicionar emulador',
      run: () => addEmulator(context, system),
    },
    { type: 'section', label: 'Zona de perigo' },
    {
      type: 'button',
      style: 'danger',
      icon: ICONS.trash,
      label: 'Remover sistema',
      run: () => removeSystem(context, system),
    },
  ];
};
