export const MAX_ROM_SCAN_DEPTH = 4;
export const PLAYLIST_EXTENSIONS = ['.cue', '.m3u', '.gdi'];
export const TITLE_LOCALE = 'pt-BR';
export const GAME_ID_LENGTH = 12;
export const INVALID_FILENAME_CHARACTERS = /[&*/:`<>?\\|"]/g;

export const COVER_KINDS = { cover: 'Named_Boxarts', snap: 'Named_Snaps' };
export const COVER_INDEX_TTL_MS = 14 * 864e5;
export const COVER_MISS_TTL_MS = 7 * 864e5;
export const COVER_DOWNLOAD_CONCURRENCY = 4;
export const COVER_REGION_PREFERENCE = ['(USA', '(World', '(Europe', '(Brazil', '(Japan'];
export const COVER_MATCH_MIN_SCORE = 0.82;
export const COVER_MATCH_LENGTH_TOLERANCE = 0.4;
export const KEPT_CACHE_DIRS = ['icons', 'ra'];
export const PC_SYSTEM_ID = 'pc';

export const MIN_COUNTED_SESSION_MS = 5000;
export const PLAYTIME_CHECKPOINT_MS = 60000;

export const PC_GAME_WATCH_MS = 3000;
export const PC_GAME_EMPTY_POLLS_TO_FINISH = 2;
export const PC_GAME_GENERIC_NAMES = /^(launcher|game|application|setup|windows)$/i;
export const PC_GAME_BINARY_DIRS = /^(bin|binaries|win64|win32|x64|x86|game)$/i;
export const PC_GAME_INFO_TIMEOUT_MS = 8000;
export const WINDOWS_EMULATOR = { id: 'windows', name: 'Windows' };

export const FILE_BROWSER_HIDDEN_NAMES =
  /^(\$|System Volume Information$|Recovery$|PerfLogs$|Config\.Msi$|desktop\.ini$|thumbs\.db$)/i;
export const FILE_BROWSER_EXE_PATTERN = /\.exe$/i;
export const FILE_BROWSER_IMAGE_PATTERN = /\.(png|jpe?g|webp)$/i;
export const ROM_DETECTION_MAX_ENTRIES = 20000;
export const ROM_DETECTION_DEPTH = 4;
