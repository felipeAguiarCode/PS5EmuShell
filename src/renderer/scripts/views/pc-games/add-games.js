import { invokeMain } from '../../core/api.js';
import { registerCommands, runCommand } from '../../core/commands.js';
import { cloneJson } from '../../core/dom.js';
import { getState } from '../../core/store.js';
import { saveConfig } from '../../core/persistence.js';
import { findConsoleIcon } from '../../ui/console-icons.js';
import { ICONS } from '../../ui/icons.js';
import { openMenu } from '../../ui/modal.js';
import { showToast } from '../../ui/toast.js';
import { formatPlural, pickRecommendedSystemId } from '../settings/settings-helpers.js';
import { addPcGame } from './pc-game-actions.js';
import { openPcGameOptions } from './pc-game-options.js';

const countSystemGames = (systemId) =>
  getState().games.filter((game) => game.system === systemId).length;

const describeDetectedFiles = (system) => {
  if (!system.files) return '—';
  const extensions = system.exts
    .slice(0, 2)
    .map((extension) => extension.ext)
    .join(' ');
  return `${system.files} ${formatPlural(system.files, 'arquivo', 'arquivos')} ${extensions}`;
};

const saveRomDir = async (systemId, romDir) => {
  const config = cloneJson(getState().config);
  const system = config.systems.find((candidate) => candidate.id === systemId);
  system.romDirs.push(romDir);
  await saveConfig(config);
  return system;
};

const addRomDir = async () => {
  const dir = await runCommand('openFileBrowser', {
    mode: 'dir',
    title: 'Escolha a pasta de ROMs',
  });
  if (!dir) return;
  const detectedSystems = await invokeMain('roms:detect', dir);
  const configuredSystem = detectedSystems.find((system) => system.already);
  if (configuredSystem) {
    showToast('Pasta já cadastrada', `Ela já é lida pelo sistema ${configuredSystem.name}.`, {
      kind: 'info',
    });
    return;
  }
  const recommendedId = pickRecommendedSystemId(detectedSystems);
  const systemId = await openMenu({
    title: 'Para qual sistema?',
    sub: dir,
    items: detectedSystems.map((system) => ({
      label: system.id === recommendedId ? `${system.name} (recomendado)` : system.name,
      icon: findConsoleIcon(system.id),
      right: describeDetectedFiles(system),
      value: system.id,
    })),
  });
  if (!systemId) return;
  const system = await saveRomDir(systemId, await invokeMain('path:portable', dir));
  const gamesBefore = countSystemGames(systemId);
  runCommand('setGames', await invokeMain('library:rescan'));
  const newGames = countSystemGames(systemId) - gamesBefore;
  showToast(
    'Pasta de ROMs adicionada',
    `${system.name} · ${newGames} ${formatPlural(newGames, 'jogo novo', 'jogos novos')}`,
    { kind: 'library' },
  );
};

export const openAddGamesMenu = async () => {
  const choice = await openMenu({
    title: 'Adicionar',
    sub: 'Escolha o que você quer colocar no launcher.',
    items: [
      { label: 'Jogo de PC (executável .exe)', icon: ICONS.gamepad, value: 'pc' },
      { label: 'Pasta de ROMs (emuladores)', icon: ICONS.folder, value: 'roms' },
    ],
  });
  if (choice === 'pc') return addPcGame();
  if (choice === 'roms') return addRomDir();
  return undefined;
};

export const registerPcGamesCommands = () =>
  registerCommands({ openAddGamesMenu, openPcGameOptions });
