import { PC_SYSTEM_ID } from '../constants/library.js';

export const buildPcSystem = () => ({
  id: PC_SYSTEM_ID,
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
});
