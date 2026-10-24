import { escapeHtml } from '../../core/dom.js';
import { getState } from '../../core/store.js';
import { ICONS } from '../../ui/icons.js';
import { openMenu } from '../../ui/modal.js';
import { addPcGame, managePcGame } from './pc-game-actions.js';

const openPcGameSettingsMenu = async (game) => {
  const choice = await openMenu({
    title: game.title,
    sub: game.path,
    items: [
      { label: 'Renomear', icon: ICONS.gear, value: 'rename' },
      { label: 'Trocar executável', icon: ICONS.folder, value: 'exe' },
      { label: 'Thumbnails', icon: ICONS.image, right: '›', value: 'thumbs' },
      { label: 'Remover do launcher', icon: ICONS.trash, value: 'remove' },
    ],
  });
  if (choice) await managePcGame(game, choice);
};

const buildPcGameRow = (game) => ({
  type: 'button',
  leadHtml: `<span class="pc-thumb">${game.cover ? `<img src="${escapeHtml(game.cover)}" alt="">` : ICONS.gamepad}</span>`,
  label: game.title,
  desc: game.path,
  right: '△/Y remove',
  remove: () => managePcGame(game, 'remove'),
  run: () => openPcGameSettingsMenu(game),
});

export const buildPcSystemRows = (system, colorRow) => {
  const games = getState().games.filter((game) => game.system === system.id);
  return [
    { type: 'title', label: system.name },
    {
      type: 'info',
      label: 'Jogos de PC',
      desc: 'Executáveis do Windows adicionados pelo botão + (no topo do launcher). O launcher acompanha o jogo até o último processo da pasta dele fechar.',
    },
    colorRow,
    { type: 'section', label: `Jogos (${games.length})` },
    ...games.map(buildPcGameRow),
    {
      type: 'button',
      style: 'action',
      icon: ICONS.plus,
      label: 'Adicionar jogo de PC',
      run: () => addPcGame(),
    },
  ];
};
