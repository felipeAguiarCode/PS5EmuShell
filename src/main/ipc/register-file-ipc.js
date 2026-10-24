import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { app, dialog, ipcMain, shell } from 'electron';
import { ARGUMENT_PREVIEW_VALUES } from '../constants/emulators.js';
import { MESSAGES } from '../constants/messages.js';
import { ensureDirectory, getDataDir, getRootDir, resolveDataPath } from '../core/app-paths.js';
import { getBaseDir, getConfig, resolveConfigPath, toPortablePath } from '../core/config-store.js';
import { buildEmulatorArguments } from '../emulators/command-line.js';
import { detectFolderSystems, listFilePlaces, listFolderEntries } from '../files/browse.js';

const EXECUTABLE_EXTENSIONS = ['exe', 'bat', 'cmd'];

const resolvePickerDefaultPath = ({ defaultPath, isRelativeToRoot }) => {
  if (!defaultPath) return getBaseDir();
  return isRelativeToRoot
    ? path.resolve(getRootDir(), defaultPath)
    : resolveConfigPath(defaultPath);
};

const mapPickedPath = (pickedPath, isRelativeToRoot) =>
  isRelativeToRoot
    ? path.relative(getRootDir(), pickedPath).split(path.sep).join('/') || '.'
    : toPortablePath(pickedPath);

export const registerFileIpc = (context) => {
  ipcMain.handle(
    'dialog:pick',
    async (_event, { kind, title, defaultPath, filters, relativeTo }) => {
      const isRelativeToRoot = relativeTo === 'root';
      const isFolder = kind === 'folder';
      const result = await dialog.showOpenDialog(context.getWindow(), {
        title,
        defaultPath: resolvePickerDefaultPath({ defaultPath, isRelativeToRoot }),
        properties: [isFolder ? 'openDirectory' : 'openFile'],
        filters: isFolder
          ? undefined
          : filters || [
              { name: MESSAGES.executablesFilterName, extensions: EXECUTABLE_EXTENSIONS },
            ],
      });
      if (result.canceled || !result.filePaths[0]) return null;
      return mapPickedPath(result.filePaths[0], isRelativeToRoot);
    },
  );

  ipcMain.handle(
    'path:exists',
    (_event, configuredPath) =>
      Boolean(configuredPath) && fs.existsSync(resolveConfigPath(configuredPath)),
  );

  ipcMain.handle('path:portable', (_event, absolutePath) => toPortablePath(absolutePath));

  ipcMain.handle('path:open', (_event, configuredPath, shouldSelect) => {
    const fullPath = resolveConfigPath(configuredPath);
    if (shouldSelect) shell.showItemInFolder(fullPath);
    else shell.openPath(fs.existsSync(fullPath) ? fullPath : path.dirname(fullPath));
    return true;
  });

  ipcMain.handle('data:open', (_event, subDir) => {
    shell.openPath(ensureDirectory(subDir ? resolveDataPath(subDir) : getDataDir()));
    return true;
  });

  ipcMain.handle('emu:open', (_event, exe) => {
    const exePath = resolveConfigPath(exe);
    if (!fs.existsSync(exePath)) return false;
    spawn(exePath, [], { cwd: path.dirname(exePath), detached: true, stdio: 'ignore' }).unref();
    return true;
  });

  ipcMain.handle('args:preview', (_event, template) =>
    buildEmulatorArguments(template, { ...ARGUMENT_PREVIEW_VALUES, baseDir: getBaseDir() }),
  );

  ipcMain.handle('fs:places', () => listFilePlaces({ readAppPath: (key) => app.getPath(key) }));

  ipcMain.handle('fs:list', (_event, dir, mode) => listFolderEntries(dir, mode));

  ipcMain.handle('roms:detect', (_event, dir) => detectFolderSystems(dir, getConfig().systems));
};
