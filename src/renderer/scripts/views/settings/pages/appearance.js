import { runCommand } from '../../../core/commands.js';
import { renderGlyphPreview } from '../../../ui/glyphs.js';

export const buildButtonGlyphOptions = (autoLabel) => [
  { v: 'auto', l: autoLabel },
  {
    v: 'playstation',
    l: 'PlayStation',
    html: `${renderGlyphPreview('playstation')}<span>PlayStation</span>`,
  },
  { v: 'xbox', l: 'Xbox', html: `${renderGlyphPreview('xbox')}<span>Xbox</span>` },
];

const applyAppearance = () => runCommand('applyAppearance');

export const buildAppearanceRows = (context) => {
  const config = context.getDraft();
  const appearance = config.appearance;
  return [
    { type: 'title', label: 'Aparência' },
    {
      type: 'select',
      label: 'Tema',
      desc: 'Escuro (padrão, como o PS5) ou claro.',
      options: [
        { v: 'dark', l: 'Escuro' },
        { v: 'light', l: 'Claro' },
      ],
      get: () => appearance.theme,
      set: (value) => {
        appearance.theme = value;
      },
      after: applyAppearance,
    },
    {
      type: 'toggle',
      label: 'Animações (Motion)',
      desc: 'Seleção deslizante, transições e efeitos. Desligado, tudo muda na hora — mais leve em PCs modestos.',
      get: () => appearance.motion !== false,
      set: (value) => {
        appearance.motion = value;
      },
      after: applyAppearance,
    },
    {
      type: 'select',
      label: 'Menu do topo',
      desc: 'Ícones (como no PS5, com L2/R2 nas pontas) ou os nomes Jogos, Biblioteca, Coleções e Troféus.',
      options: [
        { v: 'icons', l: 'Ícones' },
        { v: 'labels', l: 'Nomes' },
      ],
      get: () => (appearance.topNav === 'labels' ? 'labels' : 'icons'),
      set: (value) => {
        appearance.topNav = value;
      },
      after: applyAppearance,
    },
    { type: 'section', label: 'Imagens' },
    {
      type: 'toggle',
      label: 'Imagem de fundo do jogo',
      desc: 'Mostra a arte do jogo selecionado no fundo da tela inicial. Desligado, usa um fundo neutro.',
      get: () => appearance.heroBackground !== false,
      set: (value) => {
        appearance.heroBackground = value;
      },
      after: applyAppearance,
    },
    {
      type: 'toggle',
      label: 'Miniaturas dos jogos',
      desc: 'Capas baixadas nos cards da tela inicial, Biblioteca e Coleções. Desligado, mostra o nome sobre a cor do sistema.',
      get: () => appearance.coverArt !== false,
      set: (value) => {
        appearance.coverArt = value;
      },
      after: applyAppearance,
    },
    {
      type: 'toggle',
      label: 'Partículas de fundo',
      desc: 'Pontos de luz flutuando no fundo (só no tema escuro).',
      get: () => config.particles,
      set: (value) => {
        config.particles = value;
      },
      after: applyAppearance,
    },
    { type: 'section', label: 'Controle' },
    {
      type: 'select',
      label: 'Ícones dos botões',
      desc: 'Como os botões aparecem nas dicas da tela.',
      options: buildButtonGlyphOptions('Automático (segue o controle)'),
      get: () => config.buttonGlyphs,
      set: (value) => {
        config.buttonGlyphs = value;
      },
      after: () => {
        applyAppearance();
        runCommand('updateHints');
      },
    },
  ];
};
