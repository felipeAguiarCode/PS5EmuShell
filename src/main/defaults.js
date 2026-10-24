// Configuração padrão. Caminhos são relativos a baseDir (a pasta Emuladores).
const os = require('os');

function profileName() {
  try {
    return os.userInfo().username || 'Jogador';
  } catch {
    return 'Jogador';
  }
}

module.exports = () => ({
  version: 1,
  baseDir: '..',
  profileName: profileName(),
  avatar: 'YAK_Kiryu.png',
  fullscreen: true,
  showWelcome: true,
  sounds: true,
  volume: 60,
  particles: true,
  buttonGlyphs: 'playstation',
  hideOnLaunch: true,
  coverDownload: true,
  killCombo: { buttons: ['back', 'start'], holdMs: 1500 },
  homeCombo: { buttons: ['back', 'lb'], holdMs: 800 },
  keyboardShortcuts: true,
  setupDismissed: false,
  // Configurações › Aparência
  appearance: {
    theme: 'dark', // 'dark' | 'light'
    motion: true, // animações e anel de seleção deslizante
    heroBackground: true, // imagem do jogo no fundo da tela
    coverArt: true, // capas/miniaturas baixadas
    topNav: 'icons', // abas do topo: 'icons' (como no PS5) | 'labels' (nomes)
  },
  // Classificação dos troféus (aba Troféus). tierMode: 'points' (pelos pontos da conquista)
  // ou 'rarity' (pela % de jogadores que obtiveram). Raridade sempre pela % de jogadores.
  trophies: {
    tierMode: 'points',
    silverPoints: 10,
    goldPoints: 25,
    silverPct: 30,
    goldPct: 10,
    ultraRarePct: 5,
    veryRarePct: 15,
    rarePct: 50,
  },
  optimize: {
    trimOthers: true,
    // Programas que "Otimizar memória" pode fechar (sem .exe; * é coringa).
    killList: [
      'chrome', 'msedge', 'firefox', 'opera', 'brave', 'discord', 'spotify', 'onedrive', 'teams', 'ms-teams',
      'slack', 'zoom', 'skype', 'steam', 'steamwebhelper', 'epicgameslauncher', 'epicwebhelper', 'battle.net',
      'eadesktop', 'origin', 'upc', 'ubisoftconnect', 'galaxyclient', 'whatsapp', 'telegram', 'dropbox',
      'googledrivefs', 'acrotray', 'adobe*', 'creative cloud', 'utorrent', 'qbittorrent',
    ],
  },
  systems: [
    {
      id: 'psx',
      bios: true,
      name: 'PlayStation',
      shortName: 'PS1',
      color: '#8c96a8',
      enabled: true,
      romDirs: ['roms/psx'],
      extensions: ['.cue', '.chd', '.pbp', '.m3u', '.iso', '.bin', '.ecm', '.img'],
      thumbnailsRepo: 'Sony - PlayStation',
      defaultEmulator: 'duckstation',
      emulators: [
        {
          id: 'duckstation',
          name: 'DuckStation',
          exe: 'cores/psx/duckstation/duckstation-qt-x64-ReleaseLTCG.exe',
          args: '-batch -fullscreen "{rom}"',
        },
      ],
    },
    {
      id: 'ps2',
      bios: true,
      name: 'PlayStation 2',
      shortName: 'PS2',
      color: '#2f62e0',
      enabled: true,
      romDirs: ['roms/ps2'],
      extensions: ['.iso', '.chd', '.cso', '.zso', '.gz', '.bin', '.img', '.mdf', '.nrg'],
      thumbnailsRepo: 'Sony - PlayStation 2',
      defaultEmulator: 'pcsx2',
      emulators: [
        {
          id: 'pcsx2',
          name: 'PCSX2',
          exe: 'cores/ps2/pcsx2/pcsx2-qt.exe',
          args: '-batch -nogui -fullscreen -- "{rom}"',
        },
      ],
    },
    {
      id: 'psp',
      bios: false,
      name: 'PlayStation Portable',
      shortName: 'PSP',
      color: '#5b6b8a',
      enabled: true,
      romDirs: ['roms/psp'],
      extensions: ['.iso', '.cso', '.pbp', '.chd'],
      thumbnailsRepo: 'Sony - PlayStation Portable',
      defaultEmulator: 'ppsspp',
      emulators: [
        {
          id: 'ppsspp',
          name: 'PPSSPP',
          exe: 'cores/psp/ppsspp/PPSSPPWindows64.exe',
          args: '--fullscreen "{rom}"',
        },
      ],
    },
    {
      id: 'nds',
      bios: true,
      name: 'Nintendo DS',
      shortName: 'NDS',
      color: '#d64545',
      enabled: true,
      romDirs: ['roms/nds'],
      extensions: ['.nds', '.dsi', '.zip', '.7z'],
      thumbnailsRepo: 'Nintendo - Nintendo DS',
      defaultEmulator: 'melonds',
      emulators: [
        {
          id: 'melonds',
          name: 'melonDS',
          exe: 'cores/nds/melonds/melonDS.exe',
          args: '-f "{rom}"',
        },
        {
          id: 'desmume',
          name: 'DeSmuME',
          exe: 'cores/nds/desmume/DeSmuME_0.9.13_x64.exe',
          args: '"{rom}"',
        },
        {
          id: 'noods',
          name: 'NooDS',
          exe: 'cores/nds/noods/noods.exe',
          args: '"{rom}"',
        },
      ],
    },
    {
      id: 'gc',
      bios: false,
      name: 'GameCube',
      shortName: 'GC',
      color: '#7a5af0',
      enabled: true,
      romDirs: ['roms/gc'],
      extensions: ['.iso', '.gcm', '.rvz', '.gcz', '.ciso', '.wia', '.dol', '.elf'],
      thumbnailsRepo: 'Nintendo - GameCube',
      defaultEmulator: 'dolphin',
      emulators: [
        {
          id: 'dolphin',
          name: 'Dolphin',
          exe: 'cores/gc/dolphin/Dolphin.exe',
          args: '-b -e "{rom}"',
        },
      ],
    },
    pcSystem(),
  ],
});

// Jogos de PC (Windows): cadastrados pelo botão "+" (data/pcgames.json), sem pasta de ROMs nem emulador.
function pcSystem() {
  return {
    id: 'pc',
    native: true,
    bios: false,
    name: 'PC (Windows)',
    shortName: 'PC',
    color: '#5b6b8a',
    enabled: true,
    romDirs: [],
    extensions: [],
    thumbnailsRepo: '',
    defaultEmulator: '',
    emulators: [],
  };
}
module.exports.pcSystem = pcSystem;

// Sistemas opcionais que podem ser adicionados em Configurações › Instalação (com download do emulador).
// Emuladores compartilhados (mGBA, Mesen) apontam para a mesma pasta e só são baixados uma vez.
const MGBA = { id: 'mgba', name: 'mGBA', exe: 'cores/gba/mgba/mGBA.exe', args: '-f "{rom}"' };
const MESEN = { id: 'mesen', name: 'Mesen', exe: 'cores/nes/mesen/Mesen.exe', args: '"{rom}" --fullscreen' };
// Versões oficiais do RetroAchievements (conquistas via RAIntegration).
const RAVBA = { id: 'ravba', name: 'RAVBA', exe: 'cores/gba/ravba/RAVisualBoyAdvance-M.exe', args: '"{rom}"' };
const RANES = { id: 'ranes', name: 'RANes', exe: 'cores/nes/ranes/RANes.exe', args: '"{rom}"' };
const RASNES9X = { id: 'rasnes9x', name: 'RASnes9x', exe: 'cores/snes/rasnes9x/RASnes9x.exe', args: '"{rom}"' };

module.exports.catalog = () => [
  {
    id: 'gba',
    bios: true,
    name: 'Game Boy Advance',
    shortName: 'GBA',
    color: '#4b3fd1',
    enabled: true,
    romDirs: ['roms/gba'],
    extensions: ['.gba', '.zip', '.7z'],
    thumbnailsRepo: 'Nintendo - Game Boy Advance',
    defaultEmulator: 'mgba',
    emulators: [{ ...MGBA }, { ...RAVBA }],
  },
  {
    id: 'gbc',
    bios: false,
    name: 'Game Boy Color',
    shortName: 'GBC',
    color: '#2fa36b',
    enabled: true,
    romDirs: ['roms/gbc'],
    extensions: ['.gbc', '.gb', '.zip', '.7z'],
    thumbnailsRepo: 'Nintendo - Game Boy Color',
    defaultEmulator: 'mgba',
    emulators: [{ ...MGBA }, { ...RAVBA }],
  },
  {
    id: 'nes',
    bios: false,
    name: 'Nintendo (NES)',
    shortName: 'NES',
    color: '#c43c3c',
    enabled: true,
    romDirs: ['roms/nes'],
    extensions: ['.nes', '.fds', '.unf', '.zip', '.7z'],
    thumbnailsRepo: 'Nintendo - Nintendo Entertainment System',
    defaultEmulator: 'mesen',
    emulators: [{ ...MESEN }, { ...RANES }, { id: 'fceux', name: 'FCEUX', exe: 'cores/nes/fceux/fceux64.exe', args: '"{rom}"' }],
  },
  {
    id: 'snes',
    bios: false,
    name: 'Super Nintendo',
    shortName: 'SNES',
    color: '#7d6bb8',
    enabled: true,
    romDirs: ['roms/snes'],
    extensions: ['.sfc', '.smc', '.zip', '.7z'],
    thumbnailsRepo: 'Nintendo - Super Nintendo Entertainment System',
    defaultEmulator: 'snes9x',
    emulators: [{ id: 'snes9x', name: 'Snes9x', exe: 'cores/snes/snes9x/snes9x-x64.exe', args: '-fullscreen "{rom}"' }, { ...RASNES9X }, { ...MESEN }],
  },
  {
    id: 'md',
    bios: false,
    name: 'Mega Drive / Genesis',
    shortName: 'MD',
    color: '#2b2b2b',
    enabled: true,
    romDirs: ['roms/md'],
    extensions: ['.md', '.gen', '.smd', '.bin', '.zip', '.7z'],
    thumbnailsRepo: 'Sega - Mega Drive - Genesis',
    defaultEmulator: 'ares',
    emulators: [{ id: 'ares', name: 'ares', exe: 'cores/md/ares/ares.exe', args: '--system "Mega Drive" --fullscreen "{rom}"' }],
  },
  {
    id: 'n64',
    bios: false,
    name: 'Nintendo 64',
    shortName: 'N64',
    color: '#1f8f4e',
    enabled: true,
    romDirs: ['roms/n64'],
    extensions: ['.z64', '.n64', '.v64', '.zip', '.7z'],
    thumbnailsRepo: 'Nintendo - Nintendo 64',
    defaultEmulator: 'rmg',
    emulators: [
      { id: 'rmg', name: "Rosalie's Mupen GUI", exe: 'cores/n64/rmg/RMG.exe', args: '--fullscreen --quit-after-emulation "{rom}"' },
      { id: 'project64', name: 'Project64', exe: 'cores/n64/project64/Project64.exe', args: '"{rom}"' },
    ],
  },
  {
    id: 'dc',
    bios: true,
    name: 'Dreamcast',
    shortName: 'DC',
    color: '#e0702f',
    enabled: true,
    romDirs: ['roms/dc'],
    extensions: ['.gdi', '.cdi', '.chd', '.cue'],
    thumbnailsRepo: 'Sega - Dreamcast',
    defaultEmulator: 'flycast',
    emulators: [{ id: 'flycast', name: 'Flycast', exe: 'cores/dc/flycast/flycast.exe', args: '"{rom}"' }],
  },
  {
    id: 'wii',
    bios: false,
    name: 'Wii',
    shortName: 'WII',
    color: '#4aa8d8',
    enabled: true,
    romDirs: ['roms/wii'],
    extensions: ['.wbfs', '.iso', '.rvz', '.wia', '.gcz', '.ciso', '.wad'],
    thumbnailsRepo: 'Nintendo - Wii',
    defaultEmulator: 'dolphin',
    // Mesma instalação do Dolphin do GameCube.
    emulators: [{ id: 'dolphin', name: 'Dolphin', exe: 'cores/gc/dolphin/Dolphin.exe', args: '-b -e "{rom}"' }],
  },
  {
    id: 'wiiu',
    bios: false,
    name: 'Wii U',
    shortName: 'WIIU',
    color: '#2a7fc9',
    enabled: true,
    romDirs: ['roms/wiiu'],
    extensions: ['.wua', '.wud', '.wux', '.rpx'],
    thumbnailsRepo: 'Nintendo - Wii U',
    defaultEmulator: 'cemu',
    emulators: [{ id: 'cemu', name: 'Cemu', exe: 'cores/wiiu/cemu/Cemu.exe', args: '-f -g "{rom}"' }],
  },
  {
    id: 'n3ds',
    bios: false,
    name: 'Nintendo 3DS',
    shortName: '3DS',
    color: '#d1374b',
    enabled: true,
    romDirs: ['roms/3ds'],
    extensions: ['.3ds', '.cci', '.cxi', '.3dsx', '.app', '.zcci', '.zcxi', '.z3dsx'],
    thumbnailsRepo: 'Nintendo - Nintendo 3DS',
    defaultEmulator: 'azahar',
    emulators: [{ id: 'azahar', name: 'Azahar', exe: 'cores/3ds/azahar/azahar.exe', args: '"{rom}"' }],
  },
  {
    id: 'xbox',
    bios: true,
    name: 'Xbox',
    shortName: 'XBOX',
    color: '#5c9e31',
    enabled: true,
    romDirs: ['roms/xbox'],
    extensions: ['.iso', '.xiso'],
    thumbnailsRepo: 'Microsoft - Xbox',
    defaultEmulator: 'xemu',
    emulators: [{ id: 'xemu', name: 'xemu', exe: 'cores/xbox/xemu/xemu.exe', args: '-full-screen -dvd_path "{rom}"' }],
  },
  {
    id: 'x360',
    bios: false,
    name: 'Xbox 360',
    shortName: 'X360',
    color: '#78b82a',
    enabled: true,
    romDirs: ['roms/x360'],
    extensions: ['.iso', '.xex', '.zar'],
    thumbnailsRepo: 'Microsoft - Xbox 360',
    defaultEmulator: 'xenia',
    emulators: [{ id: 'xenia', name: 'Xenia Canary', exe: 'cores/x360/xenia/xenia_canary.exe', args: '--fullscreen "{rom}"' }],
  },
  // PS3 e PS4: jogos em pasta (EBOOT.BIN / eboot.bin); o nome vem do PARAM.SFO de cada jogo.
  {
    id: 'ps3',
    bios: false,
    name: 'PlayStation 3',
    shortName: 'PS3',
    color: '#3a3f4b',
    enabled: true,
    romDirs: ['roms/ps3'],
    extensions: ['.iso'],
    gameFiles: ['EBOOT.BIN'],
    thumbnailsRepo: 'Sony - PlayStation 3',
    defaultEmulator: 'rpcs3',
    emulators: [{ id: 'rpcs3', name: 'RPCS3', exe: 'cores/ps3/rpcs3/rpcs3.exe', args: '--no-gui "{rom}"' }],
  },
  {
    id: 'ps4',
    bios: false,
    name: 'PlayStation 4',
    shortName: 'PS4',
    color: '#1f4fa8',
    enabled: true,
    romDirs: ['roms/ps4'],
    extensions: [],
    gameFiles: ['eboot.bin'],
    thumbnailsRepo: 'Sony - PlayStation 4',
    defaultEmulator: 'shadps4',
    emulators: [{ id: 'shadps4', name: 'shadPS4', exe: 'cores/ps4/shadps4/shadPS4.exe', args: '-g "{rom}" -f true' }],
  },
];
