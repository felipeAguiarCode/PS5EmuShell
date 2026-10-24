import { dialog, ipcMain } from 'electron';
import { MESSAGES } from '../constants/messages.js';
import { findAvatarUrl, listAvatars, saveCustomAvatar } from '../library/avatars.js';

const AVATAR_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif'];

export const registerProfileIpc = (context) => {
  ipcMain.handle('avatars:list', () => listAvatars());

  ipcMain.handle('avatar:pickCustom', async () => {
    const result = await dialog.showOpenDialog(context.getWindow(), {
      title: MESSAGES.pickAvatarTitle,
      properties: ['openFile'],
      filters: [{ name: MESSAGES.imagesFilterName, extensions: AVATAR_EXTENSIONS }],
    });
    if (result.canceled || !result.filePaths[0]) return null;
    return saveCustomAvatar(result.filePaths[0]);
  });

  ipcMain.handle('avatar:url', (_event, avatar) => findAvatarUrl(avatar));
};
