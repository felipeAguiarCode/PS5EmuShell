import { execFile } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import sevenZipBinary from '7zip-bin';
import {
  DOWNLOADS_DIR,
  DOWNLOAD_PROGRESS_INTERVAL_MS,
  EXTRACT_MAX_BUFFER_BYTES,
  LEGACY_VERSION_FILE,
  RA_INTEGRATION_DLL,
  RA_INTEGRATION_PLAIN_DLL,
  VERSION_FILE,
} from '../constants/emulators.js';
import { MESSAGES } from '../constants/messages.js';
import { HTTP_HEADERS } from '../constants/network.js';
import { ensureDirectory, resolveDataPath } from '../core/app-paths.js';
import { getConfig, resolveConfigPath, saveConfig, toPortablePath } from '../core/config-store.js';
import { fetchLatestRaIntegration } from '../retroachievements/api/request.js';
import { fetchLatestDownload } from './download-resolver.js';
import { findFileByPattern, makeExactFileNamePattern } from './file-search.js';
import { isRelativePath } from './folder-structure.js';
import { findEmulatorSource, formatSourceLabel } from './sources.js';
import { forgetLatestVersion } from './versions.js';

const installingEmulatorIds = new Set();

const removeTemporaryPath = (targetPath) =>
  fsPromises
    .rm(targetPath, { recursive: true, force: true })
    .catch((error) => console.error('Failed to remove temporary path', targetPath, error));

const resolveSevenZipPath = () =>
  sevenZipBinary.path7za.replace(`app.asar${path.sep}`, `app.asar.unpacked${path.sep}`);

const downloadFile = async (url, targetFile, onProgress) => {
  const response = await fetch(url, { headers: HTTP_HEADERS, redirect: 'follow' });
  if (!response.ok || !response.body) throw new Error(MESSAGES.downloadFailed(response.status));
  const totalBytes = Number(response.headers.get('content-length')) || 0;
  let receivedBytes = 0;
  let lastReportAt = 0;
  const output = fs.createWriteStream(targetFile);
  try {
    for await (const chunk of response.body) {
      receivedBytes += chunk.length;
      if (!output.write(chunk)) await once(output, 'drain');
      if (Date.now() - lastReportAt > DOWNLOAD_PROGRESS_INTERVAL_MS) {
        lastReportAt = Date.now();
        onProgress(totalBytes ? receivedBytes / totalBytes : 0, receivedBytes);
      }
    }
  } finally {
    output.end();
    await once(output, 'finish');
  }
};

const extractArchive = (archive, targetDir) =>
  new Promise((resolve, reject) => {
    execFile(
      resolveSevenZipPath(),
      ['x', '-y', `-o${targetDir}`, archive],
      { windowsHide: true, maxBuffer: EXTRACT_MAX_BUFFER_BYTES },
      (error) =>
        error
          ? reject(new Error(MESSAGES.extractFailed(error.message), { cause: error }))
          : resolve(),
    );
  });

const ensurePortableMarkers = (targetDir, markers) => {
  for (const marker of markers) {
    const markerPath = path.join(targetDir, marker);
    if (fs.existsSync(markerPath)) continue;
    if (marker.endsWith('/')) fs.mkdirSync(markerPath, { recursive: true });
    else fs.writeFileSync(markerPath, '');
  }
};

const installRaIntegration = async (targetDir) => {
  const integration = await fetchLatestRaIntegration();
  const dllPath = path.join(targetDir, RA_INTEGRATION_DLL);
  await downloadFile(integration.url, dllPath, () => {});
  const plainDllPath = path.join(targetDir, RA_INTEGRATION_PLAIN_DLL);
  if (!fs.existsSync(plainDllPath)) fs.copyFileSync(dllPath, plainDllPath);
};

const findSystemEmulator = (config, systemId, emulatorId) => {
  const system = config.systems.find((candidate) => candidate.id === systemId);
  return system?.emulators.find((emulator) => emulator.id === emulatorId) ?? null;
};

const saveEmulatorExecutable = (systemId, emulatorId, exePath) => {
  const config = getConfig();
  saveConfig({
    ...config,
    systems: config.systems.map((system) =>
      system.id === systemId
        ? {
            ...system,
            emulators: system.emulators.map((emulator) =>
              emulator.id === emulatorId ? { ...emulator, exe: exePath } : emulator,
            ),
          }
        : system,
    ),
  });
};

const writeInstallRecord = ({ targetDir, download, source, exeName }) => {
  fs.writeFileSync(
    path.join(targetDir, VERSION_FILE),
    JSON.stringify(
      {
        version: download.version,
        published: download.published || '',
        source: formatSourceLabel(source),
        exe: exeName,
        installedAt: Date.now(),
      },
      null,
      2,
    ),
  );
  fs.rmSync(path.join(targetDir, LEGACY_VERSION_FILE), { force: true });
};

const findPackagedExecutable = async (extractDir, emulator, source) => {
  const configuredExeName = path.basename(emulator.exe || '');
  const byConfiguredName = emulator.exe
    ? await findFileByPattern(extractDir, makeExactFileNamePattern(configuredExeName))
    : null;
  return byConfiguredName ?? (await findFileByPattern(extractDir, source.exe));
};

const runInstall = async ({
  systemId,
  emulatorId,
  emulator,
  source,
  onProgress,
  workDir,
  extractDir,
}) => {
  onProgress({ phase: 'resolve' });
  const download = await fetchLatestDownload(source);
  const archive = path.join(workDir, `${emulatorId}-${download.name}`);
  try {
    await downloadFile(download.url, archive, (progress, bytes) =>
      onProgress({ phase: 'download', pct: progress, bytes, version: download.version }),
    );
    onProgress({ phase: 'extract' });
    await removeTemporaryPath(extractDir);
    await extractArchive(archive, extractDir);
    const packagedExe = await findPackagedExecutable(extractDir, emulator, source);
    if (!packagedExe) throw new Error(MESSAGES.executableNotInPackage);

    onProgress({ phase: 'install' });
    const targetRelativeDir = isRelativePath(emulator.exe)
      ? path.dirname(emulator.exe)
      : `cores/${systemId}/${emulatorId}`;
    const targetDir = resolveConfigPath(targetRelativeDir);
    fs.mkdirSync(targetDir, { recursive: true });
    fs.cpSync(path.dirname(packagedExe), targetDir, { recursive: true, force: true });
    ensurePortableMarkers(targetDir, source.portable);
    if (source.hasRaIntegration) {
      onProgress({ phase: 'install' });
      await installRaIntegration(targetDir);
    }
    const exeName = path.basename(packagedExe);
    const portableExePath = toPortablePath(path.join(targetDir, exeName));
    if (portableExePath !== emulator.exe)
      saveEmulatorExecutable(systemId, emulatorId, portableExePath);
    writeInstallRecord({ targetDir, download, source, exeName });
    forgetLatestVersion(emulatorId);
    onProgress({ phase: 'done', version: download.version });
    return { ok: true, version: download.version, exe: portableExePath };
  } finally {
    await removeTemporaryPath(archive);
  }
};

export const installEmulator = async (systemId, emulatorId, onProgress) => {
  const emulator = findSystemEmulator(getConfig(), systemId, emulatorId);
  const source = findEmulatorSource(emulatorId);
  if (!emulator || !source) throw new Error(MESSAGES.noAutomaticDownload);
  if (installingEmulatorIds.has(emulatorId)) throw new Error(MESSAGES.emulatorAlreadyInstalling);
  installingEmulatorIds.add(emulatorId);
  const workDir = ensureDirectory(resolveDataPath(DOWNLOADS_DIR));
  const extractDir = path.join(workDir, `x-${emulatorId}`);
  try {
    return await runInstall({
      systemId,
      emulatorId,
      emulator,
      source,
      onProgress,
      workDir,
      extractDir,
    });
  } finally {
    installingEmulatorIds.delete(emulatorId);
    await removeTemporaryPath(extractDir);
  }
};
