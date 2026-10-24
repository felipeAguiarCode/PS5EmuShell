import fs from 'node:fs';
import { ipcMain } from 'electron';
import { PC_SYSTEM_ID } from '../constants/library.js';
import { buildGameArt, saveGeneratedCover } from '../library/game-art.js';
import {
  createPcGame,
  deletePcGame,
  findPcGameIconFile,
  listPcGames,
  readPcGameInfo,
  savePcGameIcon,
  updatePcGame,
} from '../library/pc-games.js';

const buildIconDataUrl = (iconFile) => {
  const mimeType = iconFile.endsWith('.png') ? 'image/png' : 'image/x-icon';
  return `data:${mimeType};base64,${fs.readFileSync(iconFile).toString('base64')}`;
};

export const registerPcGamesIpc = (context) => {
  ipcMain.handle('pcgames:info', (_event, exe) => readPcGameInfo(exe));

  ipcMain.handle('pcgames:add', async (_event, exe, title) => {
    const result = await createPcGame(exe, title, context.readFileIcon);
    if (result.ok) await context.rescanLibrary();
    return result;
  });

  ipcMain.handle('pcgames:update', async (_event, gameId, patch) => {
    const updatedGame = updatePcGame(gameId, patch);
    if (updatedGame && patch.exe)
      await savePcGameIcon(gameId, updatedGame.exe, context.readFileIcon);
    await context.rescanLibrary();
    return updatedGame;
  });

  ipcMain.handle('pcgames:remove', async (_event, gameId) => {
    deletePcGame(gameId);
    await context.rescanLibrary();
    return true;
  });

  ipcMain.handle('pcgames:refreshIcon', async (_event, gameId) => {
    const pcGame = listPcGames().find((candidate) => candidate.id === gameId);
    if (!pcGame) return false;
    return Boolean(await savePcGameIcon(gameId, pcGame.exe, context.readFileIcon));
  });

  ipcMain.handle('pcgames:icon', (_event, gameId) => {
    const iconFile = findPcGameIconFile(gameId);
    return iconFile ? buildIconDataUrl(iconFile) : null;
  });

  ipcMain.handle('pcgames:saveCover', (_event, gameId, dataUrl) => {
    saveGeneratedCover(gameId, PC_SYSTEM_ID, dataUrl);
    const game = context.getLibrary().find((candidate) => candidate.id === gameId);
    if (game) context.sendToRenderer('cover', { id: gameId, ...buildGameArt(game) });
    return true;
  });

  ipcMain.handle('pcgames:list', () => listPcGames());
};
