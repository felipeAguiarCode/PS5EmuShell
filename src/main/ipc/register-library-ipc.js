import { ipcMain } from 'electron';
import { resolveConfigPath } from '../core/config-store.js';
import { listCollections, saveCollectionCover, saveCollections } from '../library/collections.js';
import { clearCoverCache, enqueueCoverDownloads } from '../library/cover-downloads.js';
import { mapGamesWithArt, saveGameBackground } from '../library/game-art.js';

export const registerLibraryIpc = (context) => {
  ipcMain.handle('library:rescan', async () => mapGamesWithArt(await context.rescanLibrary()));

  ipcMain.handle('covers:fetch', (_event, gameIds, isForced) => {
    const selectedIds = gameIds ? new Set(gameIds) : null;
    const games = selectedIds
      ? context.getLibrary().filter((game) => selectedIds.has(game.id))
      : context.getLibrary();
    enqueueCoverDownloads(games, { isForced: Boolean(isForced), ...context.buildCoverCallbacks() });
    return games.length;
  });

  ipcMain.handle('covers:clear', async () => {
    await clearCoverCache();
    context.sendToRenderer('library', mapGamesWithArt(context.getLibrary()));
    return true;
  });

  ipcMain.handle('games:setBackground', (_event, gameId, sourceFile) => {
    const game = context.getLibrary().find((candidate) => candidate.id === gameId);
    if (!game) return null;
    const art = saveGameBackground(game, sourceFile ? resolveConfigPath(sourceFile) : null);
    context.sendToRenderer('cover', { id: gameId, ...art });
    return art;
  });

  ipcMain.handle('collections:get', () => listCollections());

  ipcMain.handle('collections:save', (_event, collections) => saveCollections(collections));

  ipcMain.handle('collections:setCover', (_event, collectionId, sourceFile) =>
    saveCollectionCover(collectionId, sourceFile),
  );
};
