export const EMULATOR_SOURCES = {
  duckstation: {
    github: 'stenzek/duckstation',
    asset: /windows-x64-release\.zip$/i,
    exe: /^duckstation-qt.*\.exe$/i,
    portable: ['portable.txt'],
  },
  pcsx2: {
    github: 'PCSX2/pcsx2',
    asset: /windows-x64-Qt\.7z$/i,
    exe: /^pcsx2-qt\.exe$/i,
    portable: ['portable.ini'],
  },
  ppsspp: {
    github: 'hrydgard/ppsspp',
    asset: /Windows-x64\.zip$/i,
    exe: /^PPSSPPWindows64\.exe$/i,
    portable: [],
  },
  melonds: {
    github: 'melonDS-emu/melonDS',
    asset: /windows-x86_64\.zip$/i,
    exe: /^melonDS\.exe$/i,
    portable: ['portable'],
  },
  desmume: {
    github: 'TASEmulators/desmume',
    asset: /win64\.zip$/i,
    exe: /^DeSmuME.*x64.*\.exe$/i,
    portable: [],
  },
  noods: { github: 'Hydr8gon/NooDS', asset: /windows\.zip$/i, exe: /^noods\.exe$/i, portable: [] },
  dolphin: {
    page: 'https://dolphin-emu.org/download/',
    link: /href="([^"]*x64\.7z)"/i,
    exe: /^Dolphin\.exe$/i,
    portable: ['portable.txt'],
  },
  mgba: {
    github: 'mgba-emu/mgba',
    asset: /win64\.7z$/i,
    exe: /^mGBA\.exe$/i,
    portable: ['portable.ini'],
  },
  mesen: {
    github: 'SourMesen/Mesen2',
    asset: /_Windows\.zip$/i,
    exe: /^Mesen\.exe$/i,
    portable: [],
  },
  fceux: {
    github: 'TASEmulators/fceux',
    asset: /win64\.zip$/i,
    exe: /^fceux(64)?\.exe$/i,
    portable: [],
  },
  snes9x: {
    github: 'snes9xgit/snes9x',
    asset: /win32-x64\.zip$/i,
    exe: /^snes9x-x64\.exe$/i,
    portable: [],
  },
  flycast: {
    github: 'flyinghead/flycast',
    asset: /^flycast-win64.*\.zip$/i,
    exe: /^flycast\.exe$/i,
    portable: [],
  },
  rmg: {
    github: 'Rosalie241/RMG',
    asset: /^RMG-Portable-Windows64.*\.zip$/i,
    exe: /^RMG\.exe$/i,
    portable: [],
  },
  project64: {
    page: 'https://www.pj64-emu.com/nightly-builds',
    link: /href="(\/file\/project64-win32-dev-[^"]+)"/i,
    version: /dev-(\d+)-(\d+)-(\d+)-(\d+)/i,
    formatVersion: (match) => `${match[1]}.${match[2]}.${match[3]}-${match[4]}`,
    buildFileName: (url) => `${url.replace(/\/+$/, '').split('/').pop()}.zip`,
    exe: /^Project64\.exe$/i,
    portable: [],
  },
  rpcs3: {
    github: 'RPCS3/rpcs3-binaries-win',
    asset: /_win64.*\.7z$/i,
    version: /rpcs3-v([\d.]+-\d+)/i,
    exe: /^rpcs3\.exe$/i,
    portable: [],
  },
  shadps4: {
    github: 'shadps4-emu/shadPS4',
    asset: /^shadps4-win64.*\.zip$/i,
    exe: /^shadps4\.exe$/i,
    portable: [],
  },
  azahar: {
    github: 'azahar-emu/azahar',
    asset: /^azahar-windows-msvc-[\d.]+\.zip$/i,
    exe: /^azahar(-qt)?\.exe$/i,
    portable: ['user/'],
  },
  cemu: {
    github: 'cemu-project/Cemu',
    asset: /windows-x64\.zip$/i,
    exe: /^Cemu\.exe$/i,
    portable: ['portable/'],
  },
  xemu: {
    github: 'xemu-project/xemu',
    asset: /^xemu-win-x86_64-release\.zip$/i,
    exe: /^xemu\.exe$/i,
    portable: [],
  },
  xenia: {
    github: 'xenia-canary/xenia-canary-releases',
    asset: /^xenia_canary_windows.*\.zip$/i,
    exe: /^xenia_canary\.exe$/i,
    portable: ['portable.txt'],
  },
  ares: {
    github: 'ares-emulator/ares',
    asset: /^ares-windows-x64\.zip$/i,
    exe: /^ares\.exe$/i,
    portable: [],
  },
  ranes: { ra: 5, exe: /^RANes\.exe$/i, portable: [], hasRaIntegration: true },
  rasnes9x: { ra: 2, exe: /^RASnes9x\.exe$/i, portable: [], hasRaIntegration: true },
  ravba: { ra: 3, exe: /^RAVisualBoyAdvance-M\.exe$/i, portable: [], hasRaIntegration: true },
};

export const findEmulatorSource = (emulatorId) => EMULATOR_SOURCES[emulatorId] ?? null;

export const formatSourceLabel = (source) => {
  if (!source) return '';
  if (source.ra) return 'retroachievements.org';
  if (source.github) return `github.com/${source.github}`;
  return new URL(source.page).hostname;
};
