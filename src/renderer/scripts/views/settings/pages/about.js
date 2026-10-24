import { invokeMain } from '../../../core/api.js';
import { runCommand } from '../../../core/commands.js';
import { getState } from '../../../core/store.js';
import { ICONS } from '../../../ui/icons.js';

export const buildAboutRows = () => {
  const { paths, version } = getState();
  return [
    { type: 'title', label: 'Sobre' },
    { type: 'info', label: 'PS5 Emu Shell', right: `Versão ${version}` },
    { type: 'info', label: 'Pasta do launcher', desc: paths.root },
    { type: 'info', label: 'Pasta de dados', desc: paths.data },
    { type: 'info', label: 'Pasta base dos emuladores', desc: paths.base },
    {
      type: 'info',
      label: 'Ícones de botões',
      desc: 'Input Prompts por Kenney (kenney.nl) — licença CC0.',
    },
    { type: 'section', label: 'Janela' },
    {
      type: 'button',
      icon: ICONS.expand,
      label: 'Alternar tela cheia',
      run: () => invokeMain('window:fullscreen'),
    },
    {
      type: 'button',
      style: 'danger',
      icon: ICONS.exit,
      label: 'Sair do launcher',
      run: () => runCommand('quitApp'),
    },
  ];
};
