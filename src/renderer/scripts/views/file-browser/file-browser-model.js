export const FILE_BROWSER_PAGE_SIZE = 300;

const START_PLACE_MATCHERS = {
  dir: (place) => place.kind === 'base' && /ROMs/.test(place.label),
  image: (place) => place.label === 'Imagens',
  exe: (place) => place.kind === 'games',
};

const DEFAULT_TITLES = {
  dir: 'Escolha a pasta',
  image: 'Escolha a imagem',
  exe: 'Escolha o executável do jogo',
};

const EMPTY_MESSAGES = {
  dir: 'Nenhuma subpasta aqui.',
  image: 'Nenhuma pasta ou imagem aqui.',
};

const FILE_WORDS = {
  exe: ['executável', 'executáveis'],
  image: ['imagem', 'imagens'],
};

const NATIVE_PICKER_TITLES = { dir: 'Pasta de ROMs', image: 'Imagem' };

export const findBaseName = (filePath) =>
  filePath
    .replace(/[\\/]+$/, '')
    .split(/[\\/]/)
    .pop();

export const buildEntryPath = (dir, name) => `${dir.replace(/[\\/]+$/, '')}\\${name}`;

export const findStartPath = ({ mode, start, places }) =>
  start ||
  (
    places.find(START_PLACE_MATCHERS[mode]) ||
    places.find((place) => place.kind === 'user') ||
    places[0] ||
    {}
  ).path;

export const findDefaultTitle = (mode) => DEFAULT_TITLES[mode];

export const findEmptyMessage = (mode) =>
  EMPTY_MESSAGES[mode] || 'Nenhuma pasta ou executável aqui.';

export const formatEntryCount = (mode, entries) => {
  const fileCount = entries.filter((entry) => entry.type !== 'dir').length;
  const dirCount = entries.length - fileCount;
  const fileWords = FILE_WORDS[mode];
  const filesText = fileWords ? ` · ${fileCount} ${fileWords[fileCount === 1 ? 0 : 1]}` : '';
  return `${dirCount} ${dirCount === 1 ? 'pasta' : 'pastas'}${filesText}`;
};

export const buildNativePickerOptions = (mode, dir) => ({
  kind: mode === 'dir' ? 'folder' : 'file',
  title: NATIVE_PICKER_TITLES[mode] || 'Executável do jogo',
  defaultPath: dir,
  filters:
    mode === 'image'
      ? [{ name: 'Imagens', extensions: ['png', 'jpg', 'jpeg', 'webp'] }]
      : [{ name: 'Executáveis', extensions: ['exe'] }],
});

export const listFileBrowserHints = (mode) => [
  ['a', 'Abrir'],
  ['b', 'Voltar'],
  ...(mode === 'dir' ? [['y', 'Usar esta pasta']] : []),
  ['x', 'Explorer do Windows'],
  ['lb+rb', 'Locais / lista'],
];
