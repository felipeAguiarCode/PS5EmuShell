const buildMgba = () => ({
  id: 'mgba',
  name: 'mGBA',
  exe: 'cores/gba/mgba/mGBA.exe',
  args: '-f "{rom}"',
});

const buildMesen = () => ({
  id: 'mesen',
  name: 'Mesen',
  exe: 'cores/nes/mesen/Mesen.exe',
  args: '"{rom}" --fullscreen',
});

const buildRavba = () => ({
  id: 'ravba',
  name: 'RAVBA',
  exe: 'cores/gba/ravba/RAVisualBoyAdvance-M.exe',
  args: '"{rom}"',
});

const buildRanes = () => ({
  id: 'ranes',
  name: 'RANes',
  exe: 'cores/nes/ranes/RANes.exe',
  args: '"{rom}"',
});

const buildRasnes9x = () => ({
  id: 'rasnes9x',
  name: 'RASnes9x',
  exe: 'cores/snes/rasnes9x/RASnes9x.exe',
  args: '"{rom}"',
});

const buildCatalogSystem = ({ romDir, enabled = true, ...system }) => ({
  ...system,
  enabled,
  romDirs: [`roms/${romDir ?? system.id}`],
});

export const buildSystemCatalog = () => [
  buildCatalogSystem({
    id: 'gba',
    bios: true,
    name: 'Game Boy Advance',
    shortName: 'GBA',
    color: '#4b3fd1',
    extensions: ['.gba', '.zip', '.7z'],
    thumbnailsRepo: 'Nintendo - Game Boy Advance',
    defaultEmulator: 'mgba',
    emulators: [buildMgba(), buildRavba()],
  }),
  buildCatalogSystem({
    id: 'gbc',
    bios: false,
    name: 'Game Boy Color',
    shortName: 'GBC',
    color: '#2fa36b',
    extensions: ['.gbc', '.gb', '.zip', '.7z'],
    thumbnailsRepo: 'Nintendo - Game Boy Color',
    defaultEmulator: 'mgba',
    emulators: [buildMgba(), buildRavba()],
  }),
  buildCatalogSystem({
    id: 'nes',
    bios: false,
    name: 'Nintendo (NES)',
    shortName: 'NES',
    color: '#c43c3c',
    extensions: ['.nes', '.fds', '.unf', '.zip', '.7z'],
    thumbnailsRepo: 'Nintendo - Nintendo Entertainment System',
    defaultEmulator: 'mesen',
    emulators: [
      buildMesen(),
      buildRanes(),
      { id: 'fceux', name: 'FCEUX', exe: 'cores/nes/fceux/fceux64.exe', args: '"{rom}"' },
    ],
  }),
  buildCatalogSystem({
    id: 'snes',
    bios: false,
    name: 'Super Nintendo',
    shortName: 'SNES',
    color: '#7d6bb8',
    extensions: ['.sfc', '.smc', '.zip', '.7z'],
    thumbnailsRepo: 'Nintendo - Super Nintendo Entertainment System',
    defaultEmulator: 'snes9x',
    emulators: [
      {
        id: 'snes9x',
        name: 'Snes9x',
        exe: 'cores/snes/snes9x/snes9x-x64.exe',
        args: '-fullscreen "{rom}"',
      },
      buildRasnes9x(),
      buildMesen(),
    ],
  }),
  buildCatalogSystem({
    id: 'md',
    bios: false,
    name: 'Mega Drive / Genesis',
    shortName: 'MD',
    color: '#2b2b2b',
    extensions: ['.md', '.gen', '.smd', '.bin', '.zip', '.7z'],
    thumbnailsRepo: 'Sega - Mega Drive - Genesis',
    defaultEmulator: 'ares',
    emulators: [
      {
        id: 'ares',
        name: 'ares',
        exe: 'cores/md/ares/ares.exe',
        args: '--system "Mega Drive" --fullscreen "{rom}"',
      },
    ],
  }),
  buildCatalogSystem({
    id: 'n64',
    bios: false,
    name: 'Nintendo 64',
    shortName: 'N64',
    color: '#1f8f4e',
    extensions: ['.z64', '.n64', '.v64', '.zip', '.7z'],
    thumbnailsRepo: 'Nintendo - Nintendo 64',
    defaultEmulator: 'rmg',
    emulators: [
      {
        id: 'rmg',
        name: "Rosalie's Mupen GUI",
        exe: 'cores/n64/rmg/RMG.exe',
        args: '--fullscreen --quit-after-emulation "{rom}"',
      },
      {
        id: 'project64',
        name: 'Project64',
        exe: 'cores/n64/project64/Project64.exe',
        args: '"{rom}"',
      },
    ],
  }),
  buildCatalogSystem({
    id: 'dc',
    bios: true,
    name: 'Dreamcast',
    shortName: 'DC',
    color: '#e0702f',
    extensions: ['.gdi', '.cdi', '.chd', '.cue'],
    thumbnailsRepo: 'Sega - Dreamcast',
    defaultEmulator: 'flycast',
    emulators: [
      { id: 'flycast', name: 'Flycast', exe: 'cores/dc/flycast/flycast.exe', args: '"{rom}"' },
    ],
  }),
  buildCatalogSystem({
    id: 'wii',
    bios: false,
    name: 'Wii',
    shortName: 'WII',
    color: '#4aa8d8',
    extensions: ['.wbfs', '.iso', '.rvz', '.wia', '.gcz', '.ciso', '.wad'],
    thumbnailsRepo: 'Nintendo - Wii',
    defaultEmulator: 'dolphin',
    emulators: [
      {
        id: 'dolphin',
        name: 'Dolphin',
        exe: 'cores/gc/dolphin/Dolphin.exe',
        args: '-b -e "{rom}"',
      },
    ],
  }),
  buildCatalogSystem({
    id: 'wiiu',
    bios: false,
    name: 'Wii U',
    shortName: 'WIIU',
    color: '#2a7fc9',
    extensions: ['.wua', '.wud', '.wux', '.rpx'],
    thumbnailsRepo: 'Nintendo - Wii U',
    defaultEmulator: 'cemu',
    emulators: [
      { id: 'cemu', name: 'Cemu', exe: 'cores/wiiu/cemu/Cemu.exe', args: '-f -g "{rom}"' },
    ],
  }),
  buildCatalogSystem({
    id: 'n3ds',
    romDir: '3ds',
    bios: false,
    name: 'Nintendo 3DS',
    shortName: '3DS',
    color: '#d1374b',
    extensions: ['.3ds', '.cci', '.cxi', '.3dsx', '.app', '.zcci', '.zcxi', '.z3dsx'],
    thumbnailsRepo: 'Nintendo - Nintendo 3DS',
    defaultEmulator: 'azahar',
    emulators: [
      { id: 'azahar', name: 'Azahar', exe: 'cores/3ds/azahar/azahar.exe', args: '"{rom}"' },
    ],
  }),
  buildCatalogSystem({
    id: 'xbox',
    bios: true,
    name: 'Xbox',
    shortName: 'XBOX',
    color: '#5c9e31',
    extensions: ['.iso', '.xiso'],
    thumbnailsRepo: 'Microsoft - Xbox',
    defaultEmulator: 'xemu',
    emulators: [
      {
        id: 'xemu',
        name: 'xemu',
        exe: 'cores/xbox/xemu/xemu.exe',
        args: '-full-screen -dvd_path "{rom}"',
      },
    ],
  }),
  buildCatalogSystem({
    id: 'x360',
    bios: false,
    name: 'Xbox 360',
    shortName: 'X360',
    color: '#78b82a',
    extensions: ['.iso', '.xex', '.zar'],
    thumbnailsRepo: 'Microsoft - Xbox 360',
    defaultEmulator: 'xenia',
    emulators: [
      {
        id: 'xenia',
        name: 'Xenia Canary',
        exe: 'cores/x360/xenia/xenia_canary.exe',
        args: '--fullscreen "{rom}"',
      },
    ],
  }),
  buildCatalogSystem({
    id: 'ps3',
    bios: false,
    name: 'PlayStation 3',
    shortName: 'PS3',
    color: '#3a3f4b',
    extensions: ['.iso'],
    gameFiles: ['EBOOT.BIN'],
    thumbnailsRepo: 'Sony - PlayStation 3',
    defaultEmulator: 'rpcs3',
    emulators: [
      { id: 'rpcs3', name: 'RPCS3', exe: 'cores/ps3/rpcs3/rpcs3.exe', args: '--no-gui "{rom}"' },
    ],
  }),
  buildCatalogSystem({
    id: 'ps4',
    bios: false,
    name: 'PlayStation 4',
    shortName: 'PS4',
    color: '#1f4fa8',
    extensions: [],
    gameFiles: ['eboot.bin'],
    thumbnailsRepo: 'Sony - PlayStation 4',
    defaultEmulator: 'shadps4',
    emulators: [
      {
        id: 'shadps4',
        name: 'shadPS4',
        exe: 'cores/ps4/shadps4/shadPS4.exe',
        args: '-g "{rom}" -f true',
      },
    ],
  }),
];

export const findCatalogSystemById = (systemId) =>
  buildSystemCatalog().find((system) => system.id === systemId) ?? null;
