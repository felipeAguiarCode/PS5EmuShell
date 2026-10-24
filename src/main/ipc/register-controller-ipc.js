import { ipcMain } from 'electron';

export const registerControllerIpc = ({ controllerHub }) => {
  ipcMain.handle('pads:list', () => controllerHub.listControllers());
  ipcMain.handle('pads:assign', (_event, slot, key) => controllerHub.assignSlot(slot, key));
  ipcMain.handle('pads:clear', (_event, slot) => controllerHub.clearSlot(slot));
  ipcMain.handle('pads:autoAssign', (_event, isEnabled) => controllerHub.setAutoAssign(isEnabled));
  ipcMain.handle('pads:detect', () => controllerHub.detectController());
  ipcMain.handle('pads:cancelDetect', () => controllerHub.cancelDetection());
  ipcMain.handle('pads:watch', (_event, key) => controllerHub.watchController(key));
  ipcMain.handle('pads:rumble', (_event, key) => controllerHub.rumble(key));
};
