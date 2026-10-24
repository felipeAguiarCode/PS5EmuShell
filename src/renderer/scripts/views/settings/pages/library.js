import { invokeMain } from '../../../core/api.js';
import { runCommand } from '../../../core/commands.js';
import { cloneJson } from '../../../core/dom.js';
import { getState } from '../../../core/store.js';
import { ICONS } from '../../../ui/icons.js';
import { openConfirm } from '../../../ui/modal.js';
import { countGamesBySystem } from '../settings-helpers.js';

const restoreDefaultSystems = async (context) => {
  const isConfirmed = await openConfirm(
    'Restaurar sistemas?',
    'Suas alterações em sistemas e emuladores serão perdidas.',
    { ok: 'Restaurar' },
  );
  if (!isConfirmed) return;
  context.getDraft().systems = cloneJson(getState().defaultSystems);
  await context.refreshExists();
  context.changed(true);
};

export const buildLibraryRows = (context) => {
  const { games } = getState();
  const counts = countGamesBySystem(games);
  return [
    { type: 'title', label: 'Biblioteca' },
    { type: 'info', label: 'Total de jogos', right: String(games.length) },
    ...context.getDraft().systems.map((system) => ({
      type: 'info',
      label: system.name,
      swatch: system.color,
      right: `${counts[system.id] || 0} jogos`,
    })),
    { type: 'section', label: 'Ações' },
    {
      type: 'button',
      style: 'action',
      icon: ICONS.refresh,
      label: 'Buscar jogos novamente',
      run: () => runCommand('rescanLibrary'),
    },
    {
      type: 'button',
      icon: ICONS.folder,
      label: 'Abrir pasta de dados do launcher',
      desc: 'config.json, histórico, cache de capas.',
      run: () => invokeMain('data:open'),
    },
    {
      type: 'button',
      style: 'danger',
      icon: ICONS.trash,
      label: 'Restaurar configuração padrão de sistemas',
      desc: 'Volta os 5 sistemas e 7 emuladores originais.',
      run: () => restoreDefaultSystems(context),
    },
  ];
};
