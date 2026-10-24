import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {
  INSTALL_FRESHNESS_TOLERANCE_MS,
  LATEST_VERSIONS_FILE_PARTS,
  LATEST_VERSIONS_TTL_MS,
  LEGACY_VERSION_FILE,
  RELEASE_DATE_TOLERANCE_MS,
  VERSION_CHECK_CONCURRENCY,
  VERSION_FILE,
} from '../constants/emulators.js';
import { resolveDataPath } from '../core/app-paths.js';
import { resolveConfigPath } from '../core/config-store.js';
import { readJsonFileOrDefault, writeJsonFile } from '../core/json-file.js';
import { fetchLatestDownload } from './download-resolver.js';
import { buildEmulatorKey, listEmulatorStatus } from './emulator-status.js';
import { EMULATOR_SOURCES, findEmulatorSource, formatSourceLabel } from './sources.js';

const EXE_VERSION_SCRIPT =
  '$f = $env:PD_FILES | ConvertFrom-Json; $o = @{}; foreach ($p in $f) { try { $v = (Get-Item -LiteralPath $p).VersionInfo; ' +
  '$o[$p] = if ($v.ProductVersion) { $v.ProductVersion } else { $v.FileVersion } } catch {} }; $o | ConvertTo-Json -Compress';
const MIN_COMPARABLE_PARTS = 2;
const latestVersionsCache = { at: 0, items: {} };

const parseVersionNumbers = (version) => (String(version || '').match(/\d+/g) ?? []).map(Number);

const compareVersionNumbers = (installedNumbers, latestNumbers) => {
  const length = Math.max(installedNumbers.length, latestNumbers.length);
  for (let index = 0; index < length; index += 1) {
    const installedPart = installedNumbers[index] || 0;
    const latestPart = latestNumbers[index] || 0;
    if (installedPart !== latestPart) return installedPart > latestPart ? 'ok' : 'old';
  }
  return 'ok';
};

export const compareInstalledVersion = (installed, latest) => {
  if (!installed || !latest || !latest.version) return 'unknown';
  if (installed.by === 'shell') {
    if (installed.version !== latest.version) return 'old';
    const isFresh =
      !latest.published || !installed.published || installed.published >= latest.published;
    return isFresh ? 'ok' : 'old';
  }
  const installedNumbers = parseVersionNumbers(installed.version);
  const latestNumbers = parseVersionNumbers(latest.version);
  if (
    installedNumbers.length >= MIN_COMPARABLE_PARTS &&
    latestNumbers.length >= MIN_COMPARABLE_PARTS
  ) {
    return compareVersionNumbers(installedNumbers, latestNumbers);
  }
  if (installed.published && latest.published) {
    const differenceMs = Date.parse(installed.published) - Date.parse(latest.published);
    return differenceMs >= -RELEASE_DATE_TOLERANCE_MS ? 'ok' : 'old';
  }
  return 'unknown';
};

const resolveLatestVersionsFile = () => resolveDataPath(...LATEST_VERSIONS_FILE_PARTS);

const loadLatestVersionsCache = () => {
  if (latestVersionsCache.at) return;
  Object.assign(
    latestVersionsCache,
    readJsonFileOrDefault(resolveLatestVersionsFile(), { at: 0, items: {} }),
  );
};

const fetchLatestVersion = async (emulatorId) => {
  try {
    const download = await fetchLatestDownload(EMULATOR_SOURCES[emulatorId]);
    return { version: download.version, published: download.published || '', file: download.name };
  } catch (error) {
    return { ...(latestVersionsCache.items[emulatorId] ?? {}), error: error.message };
  }
};

const fetchLatestVersions = async (isForced) => {
  loadLatestVersionsCache();
  const isStale = isForced || Date.now() - latestVersionsCache.at > LATEST_VERSIONS_TTL_MS;
  const configuredIds = new Set(listEmulatorStatus().map((emulator) => emulator.id));
  const pendingIds = Object.keys(EMULATOR_SOURCES).filter(
    (emulatorId) =>
      configuredIds.has(emulatorId) &&
      (isStale ||
        !latestVersionsCache.items[emulatorId] ||
        latestVersionsCache.items[emulatorId].error),
  );
  if (!pendingIds.length) return latestVersionsCache.items;
  const queue = [...pendingIds];
  const processQueue = async () => {
    while (queue.length) {
      const emulatorId = queue.shift();
      latestVersionsCache.items[emulatorId] = await fetchLatestVersion(emulatorId);
    }
  };
  await Promise.all(Array.from({ length: VERSION_CHECK_CONCURRENCY }, processQueue));
  latestVersionsCache.at = Date.now();
  writeJsonFile(resolveLatestVersionsFile(), latestVersionsCache);
  return latestVersionsCache.items;
};

export const forgetLatestVersion = (emulatorId) => {
  delete latestVersionsCache.items[emulatorId];
};

const readExeVersions = (files) =>
  new Promise((resolve) => {
    if (!files.length) {
      resolve({});
      return;
    }
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', EXE_VERSION_SCRIPT],
      { windowsHide: true, env: { ...process.env, PD_FILES: JSON.stringify(files) } },
      (_error, output) => {
        try {
          resolve(JSON.parse(output || '{}') || {});
        } catch {
          resolve({});
        }
      },
    );
  });

const readInstallRecord = (emulatorDir) =>
  readJsonFileOrDefault(path.join(emulatorDir, VERSION_FILE), null) ??
  readJsonFileOrDefault(path.join(emulatorDir, LEGACY_VERSION_FILE), null);

export const isInstallRecordCurrent = (record, exePath, exeModifiedMs) =>
  Boolean(record?.exe) &&
  record.exe.toLowerCase() === path.basename(exePath).toLowerCase() &&
  exeModifiedMs <= record.installedAt + INSTALL_FRESHNESS_TOLERANCE_MS;

const readInstalledVersions = async () => {
  const installedVersions = {};
  const executablesToInspect = [];
  for (const emulator of listEmulatorStatus().filter((candidate) => candidate.installed)) {
    const exePath = resolveConfigPath(emulator.exe);
    const record = readInstallRecord(path.dirname(exePath));
    const exeModifiedMs = fs.statSync(exePath).mtimeMs;
    const key = buildEmulatorKey(emulator.system, emulator.id);
    if (isInstallRecordCurrent(record, exePath, exeModifiedMs)) {
      installedVersions[key] = {
        version: record.version,
        published: record.published,
        by: 'shell',
      };
    } else {
      executablesToInspect.push({ key, exePath, exeModifiedMs });
    }
  }
  const exeVersions = await readExeVersions(executablesToInspect.map(({ exePath }) => exePath));
  for (const { key, exePath, exeModifiedMs } of executablesToInspect) {
    const version = (exeVersions[exePath] || '').trim();
    installedVersions[key] = {
      version,
      published: new Date(exeModifiedMs).toISOString().slice(0, 10),
      by: version ? 'exe' : 'date',
    };
  }
  return installedVersions;
};

export const buildVersionReport = async (isForced) => {
  const [latestVersions, installedVersions] = await Promise.all([
    fetchLatestVersions(isForced),
    readInstalledVersions(),
  ]);
  return listEmulatorStatus().map((emulator) => {
    const installed = installedVersions[buildEmulatorKey(emulator.system, emulator.id)] ?? null;
    const latest = latestVersions[emulator.id] ?? null;
    return {
      system: emulator.system,
      id: emulator.id,
      source: formatSourceLabel(findEmulatorSource(emulator.id)),
      installed,
      latest,
      state: emulator.installed ? compareInstalledVersion(installed, latest) : 'missing',
    };
  });
};
