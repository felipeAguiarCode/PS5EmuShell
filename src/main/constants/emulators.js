export const BIOS_SYSTEM_IDS = ['psx', 'ps2', 'nds'];
export const VERSION_FILE = 'ps5emushell-version.json';
export const LEGACY_VERSION_FILE = 'playdeck-version.json';
export const LATEST_VERSIONS_FILE_PARTS = ['cache', 'latest-versions.json'];
export const LATEST_VERSIONS_TTL_MS = 60 * 60 * 1000;
export const VERSION_CHECK_CONCURRENCY = 3;
export const INSTALL_FRESHNESS_TOLERANCE_MS = 120000;
export const RELEASE_DATE_TOLERANCE_MS = 864e5;
export const DOWNLOAD_PROGRESS_INTERVAL_MS = 150;
export const DOWNLOADS_DIR = 'downloads';
export const EXTRACT_MAX_BUFFER_BYTES = 1 << 26;
export const RA_INTEGRATION_DLL = 'RA_Integration-x64.dll';
export const RA_INTEGRATION_PLAIN_DLL = 'RA_Integration.dll';
export const DEFAULT_ROM_ARGUMENT = '"{rom}"';
export const ARGUMENT_PREVIEW_VALUES = {
  rom: 'C:\\...\\jogo.iso',
  romDir: 'C:\\...',
  romName: 'jogo',
  exeDir: '...',
};
