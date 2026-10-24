import { getState } from '../../../core/store.js';
import { SYSTEM_COLOR_PALETTE } from '../../../constants/systems.js';
import { ICONS } from '../../../ui/icons.js';
import { openKeyboard } from '../../../ui/virtual-keyboard.js';
import { buildNewSystem, countGamesBySystem } from '../settings-helpers.js';

const describeSystem = (system, gameCount) => {
  const emulators = system.native
    ? 'executáveis do Windows'
    : system.emulators.map((emulator) => emulator.name).join(', ') || 'sem emulador';
  const disabled = system.enabled === false ? ' · desativado' : '';
  return `${system.shortName} · ${gameCount} jogos · ${emulators}${disabled}`;
};

const addSystem = async (context) => {
  const name = await openKeyboard({ title: 'Nome do novo sistema' });
  if (!name) return;
  const draft = context.getDraft();
  const system = buildNewSystem({
    name,
    systems: draft.systems,
    palette: SYSTEM_COLOR_PALETTE,
  });
  draft.systems.push(system);
  context.markSystemsDirty();
  context.commitDraft();
  context.saveSoon();
  await context.go(`system:${system.id}`);
  context.focusContent();
};

export const buildSystemsRows = (context) => {
  const counts = countGamesBySystem(getState().games);
  return [
    { type: 'title', label: 'Sistemas e emuladores' },
    ...context.getDraft().systems.map((system) => ({
      type: 'link',
      label: system.name,
      swatch: system.color,
      desc: describeSystem(system, counts[system.id] || 0),
      ok: system.native
        ? null
        : system.emulators.length > 0 &&
          system.emulators.every((emulator) => context.isPathFound(emulator.exe)),
      go: `system:${system.id}`,
    })),
    {
      type: 'button',
      style: 'action',
      icon: ICONS.plus,
      label: 'Adicionar sistema',
      run: () => addSystem(context),
    },
  ];
};
