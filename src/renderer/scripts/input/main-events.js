import { listenToMain } from '../core/api.js';
import { runCommand } from '../core/commands.js';
import { getState, updateState } from '../core/store.js';
import { isModalOpen } from '../ui/modal.js';
import { showToast } from '../ui/toast.js';
import { closeOverlay, handleGameState, openOverlay } from '../views/game/game-session.js';
import { setGames, updateGameArt } from '../views/shell/library-data.js';

const CONNECTION_NAMES = { usb: 'USB', bt: 'Bluetooth' };

export const formatPadToastText = (pad) => {
  const slotText = pad.slot >= 0 ? `Jogador ${pad.slot + 1}` : 'Sem slot livre';
  return [pad.name, CONNECTION_NAMES[pad.conn], slotText].filter(Boolean).join(' · ');
};

const handleCoverUpdate = (art) => {
  if (!updateGameArt(art)) return;
  runCommand('updateHomeArt', art.id);
  runCommand('updateLibraryArt', art.id);
  runCommand('updateCollectionsArt', art.id);
};

const handlePadConnection = (pad) => {
  const { xinput } = getState();
  updateState({ xinput: { ...xinput, count: pad.count } });
  showToast(
    pad.connected ? 'Controle conectado' : 'Controle desconectado',
    formatPadToastText(pad),
    {
      kind: pad.connected ? 'padOn' : 'padOff',
      ms: 2600,
    },
  );
  if (pad.connected && !getState().isGameRunning) runCommand('setPadType', pad.type);
};

const handlePadsChanged = (pads) => {
  updateState({ pads });
  const state = getState();
  if (state.view === 'settings' && runCommand('getSettingsPage') === 'controls' && !isModalOpen()) {
    runCommand('renderSettings');
  }
};

export const bindMainEvents = (handleButton) => {
  listenToMain('input', ({ button, repeat }) => handleButton(button, repeat));
  listenToMain('library', (games) => setGames(games));
  listenToMain('game:state', handleGameState);
  listenToMain('game:overlay', ({ open }) => (open ? openOverlay() : closeOverlay()));
  listenToMain('cover', handleCoverUpdate);
  listenToMain('covers:progress', (progress) => {
    updateState({ coverProgress: progress });
    if (getState().view === 'settings') runCommand('updateSettingsCoverProgress');
  });
  listenToMain('pad', handlePadConnection);
  listenToMain('pads:changed', handlePadsChanged);
  listenToMain('pads:active', (padType) => runCommand('setPadType', padType));
  listenToMain('pads:state', (padState) => runCommand('handlePadState', padState));
};
