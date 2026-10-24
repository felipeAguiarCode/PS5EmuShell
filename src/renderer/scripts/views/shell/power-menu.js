import { QUIT_FADE_MS } from '../../constants/ui.js';
import { invokeMain } from '../../core/api.js';
import { runCommand } from '../../core/commands.js';
import { ICONS } from '../../ui/icons.js';
import { openMenu } from '../../ui/modal.js';

export const quitApp = () => {
  document.body.style.transition = 'opacity .4s';
  document.body.style.opacity = 0;
  setTimeout(() => invokeMain('app:quit'), QUIT_FADE_MS);
};

export const openPowerMenu = async () => {
  const choice = await openMenu({
    title: 'Energia',
    items: [
      { label: 'Sair do launcher', icon: ICONS.exit, value: 'quit' },
      { label: 'Buscar jogos novamente', icon: ICONS.refresh, value: 'rescan' },
      { label: 'Alternar tela cheia', icon: ICONS.expand, value: 'fs' },
    ],
  });
  if (choice === 'quit') quitApp();
  else if (choice === 'rescan') runCommand('rescanLibrary');
  else if (choice === 'fs') invokeMain('window:fullscreen');
};
