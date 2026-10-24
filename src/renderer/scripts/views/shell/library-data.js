import { invokeMain } from '../../core/api.js';
import { runCommand } from '../../core/commands.js';
import { buildGamesById } from '../../core/selectors.js';
import { getState, updateState } from '../../core/store.js';
import { getFocusedElement } from '../../navigation/spatial-navigation.js';
import { showToast } from '../../ui/toast.js';

export const formatFoundGamesText = (count) =>
  `${count} ${count === 1 ? 'jogo encontrado' : 'jogos encontrados'}.`;

export const setGames = (games, isSilent) => {
  const nextGames = games || [];
  updateState({ games: nextGames, gamesById: buildGamesById(nextGames) });
  if (isSilent) return;
  runCommand('refreshHome');
  runCommand('refreshLibrary');
  const { view } = getState();
  if (view === 'collections') {
    const focused = getFocusedElement();
    runCommand('renderCollections', focused && focused.dataset.id);
  }
  if (view === 'settings') runCommand('renderSettings');
};

export const updateGameArt = ({ id, cover, snap }) => {
  const { games } = getState();
  if (!games.some((game) => game.id === id)) return false;
  const nextGames = games.map((game) => (game.id === id ? { ...game, cover, snap } : game));
  updateState({ games: nextGames, gamesById: buildGamesById(nextGames) });
  return true;
};

export const rescanLibrary = async () => {
  showToast('Buscando jogos…', 'Lendo as pastas de ROMs.', { kind: 'scan', ms: 1800 });
  const games = await invokeMain('library:rescan');
  setGames(games);
  showToast('Biblioteca atualizada', formatFoundGamesText(games.length), { kind: 'library' });
};
