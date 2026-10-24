import {
  BOOT_FADE_MS,
  BOOT_SCREEN_MS,
  SETUP_CHECK_DELAY_MS,
  WELCOME_FADE_MS,
} from '../../constants/ui.js';
import { invokeMain } from '../../core/api.js';
import { runCommand } from '../../core/commands.js';
import { delay, queryOne } from '../../core/dom.js';
import { saveConfig } from '../../core/persistence.js';
import { resolveParticleLevel } from '../../core/selectors.js';
import { getState, updateState } from '../../core/store.js';
import { renderGlyph } from '../../ui/glyphs.js';
import { ICONS } from '../../ui/icons.js';
import { openMenu } from '../../ui/modal.js';
import { startWelcomeParticles, stopWelcomeParticles } from '../../ui/particles.js';
import { playSound } from '../../ui/sound.js';

const pluralize = (count, singular, plural) => `${count} ${count === 1 ? singular : plural}`;

export const buildSetupSummary = ({ missingDirs, missingEmulators }) => {
  const parts = [];
  if (missingDirs.length) parts.push(pluralize(missingDirs.length, 'pasta', 'pastas'));
  if (missingEmulators.length) {
    const names = missingEmulators.map((emulator) => emulator.name).join(', ');
    parts.push(`${pluralize(missingEmulators.length, 'emulador', 'emuladores')} (${names})`);
  }
  return parts.join(' e ');
};

const buildSetupItems = ({ missingDirs, missingEmulators }) => [
  ...(missingDirs.length
    ? [{ label: 'Criar estrutura de pastas', icon: ICONS.folder, value: 'dirs' }]
    : []),
  ...(missingEmulators.length
    ? [{ label: 'Criar pastas e baixar emuladores', icon: ICONS.plus, value: 'all' }]
    : []),
  { label: 'Ver detalhes em Configurações', icon: ICONS.gear, value: 'settings' },
  { label: 'Agora não', icon: ICONS.clock, value: 'later' },
  { label: 'Não perguntar novamente', icon: ICONS.exit, value: 'never' },
];

const runSetupChoice = async (choice) => {
  if (choice === 'dirs') {
    await runCommand('createFolderStructure');
  } else if (choice === 'all') {
    await runCommand('openSettings', 'setup');
    await runCommand('createFolderStructure');
    await runCommand('installMissingEmulators');
    if (getState().games.length === 0) runCommand('rescanLibrary');
  } else if (choice === 'settings') {
    runCommand('openSettings', 'setup');
  } else if (choice === 'never') {
    saveConfig({ ...getState().config, setupDismissed: true });
  }
};

const checkSetup = async () => {
  if (getState().config.setupDismissed) return;
  const status = await invokeMain('setup:status');
  const missingDirs = status.dirs.filter((dir) => !dir.exists);
  const missingEmulators = status.emulators.filter(
    (emulator) => !emulator.installed && emulator.downloadable,
  );
  if (!missingDirs.length && !missingEmulators.length) return;
  const choice = await openMenu({
    title: 'Preparar o PS5 Emu Shell',
    sub: `Faltam ${buildSetupSummary({ missingDirs, missingEmulators })} em ${status.base}. O PS5 Emu Shell pode criar a mesma estrutura de bios, cores, roms, saves e screenshots.`,
    items: buildSetupItems({ missingDirs, missingEmulators }),
  });
  await runSetupChoice(choice);
};

export const dismissWelcome = () => {
  if (!getState().isWelcomeVisible) return;
  updateState({ isWelcomeVisible: false });
  playSound('select');
  const welcome = queryOne('#welcome');
  welcome.classList.add('out');
  setTimeout(() => {
    welcome.classList.add('hidden');
    stopWelcomeParticles();
  }, WELCOME_FADE_MS);
  runCommand('layoutHome', true);
  runCommand('updateHomeHero', true);
  setTimeout(checkSetup, SETUP_CHECK_DELAY_MS);
};

export const runBootSequence = async () => {
  playSound('boot');
  await delay(BOOT_SCREEN_MS);
  queryOne('#boot').classList.add('out');
  document.body.classList.add('ready');
  if (getState().config.showWelcome) {
    updateState({ isWelcomeVisible: true });
    queryOne('.welcome-press').innerHTML = `Pressione ${renderGlyph('a')} para continuar`;
    queryOne('#welcome').classList.remove('hidden');
    startWelcomeParticles(resolveParticleLevel(getState().config));
  } else {
    runCommand('updateHomeHero', true);
  }
  await delay(BOOT_FADE_MS);
  queryOne('#boot').remove();
  updateState({ isBooting: false });
  if (!getState().isWelcomeVisible) checkSetup();
};
