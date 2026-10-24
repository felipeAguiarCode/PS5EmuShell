import { invokeMain } from '../../../core/api.js';
import { getState } from '../../../core/store.js';
import { ICONS } from '../../../ui/icons.js';
import { openConfirm } from '../../../ui/modal.js';
import { showToast } from '../../../ui/toast.js';
import { buildCoverProgressText } from '../settings-helpers.js';

const fetchCovers = async (isForced, title) => {
  const count = await invokeMain('covers:fetch', null, isForced);
  showToast(title, `${count} jogos na fila.`, { kind: 'cover' });
};

const clearCoverCache = async () => {
  const isConfirmed = await openConfirm(
    'Limpar cache?',
    'As capas baixadas serão apagadas. Imagens manuais são mantidas.',
    { ok: 'Limpar' },
  );
  if (!isConfirmed) return;
  await invokeMain('covers:clear');
  showToast('Cache de capas limpo', '', { kind: 'coverClear' });
};

export const buildCoversRows = (context) => {
  const config = context.getDraft();
  return [
    { type: 'title', label: 'Capas' },
    {
      type: 'toggle',
      label: 'Baixar capas automaticamente',
      desc: 'Busca capas e imagens de fundo no libretro-thumbnails (requer internet).',
      get: () => config.coverDownload,
      set: (value) => {
        config.coverDownload = value;
      },
    },
    {
      type: 'info',
      id: 'cover-progress',
      label: 'Status',
      right: buildCoverProgressText(getState().coverProgress),
    },
    {
      type: 'button',
      style: 'action',
      icon: ICONS.image,
      label: 'Baixar capas que faltam',
      run: () => fetchCovers(false, 'Buscando capas'),
    },
    {
      type: 'button',
      icon: ICONS.refresh,
      label: 'Baixar todas novamente',
      run: () => fetchCovers(true, 'Rebaixando capas'),
    },
    {
      type: 'button',
      style: 'danger',
      icon: ICONS.trash,
      label: 'Limpar cache de capas',
      run: () => clearCoverCache(),
    },
    { type: 'section', label: 'Imagens manuais' },
    {
      type: 'button',
      icon: ICONS.folder,
      label: 'Abrir pasta de capas manuais',
      desc: 'Salve como data/covers/<sistema>/<nome do arquivo da ROM>.png (ou .jpg). Têm prioridade sobre o download.',
      run: () => invokeMain('data:open', 'covers'),
    },
    {
      type: 'button',
      icon: ICONS.folder,
      label: 'Abrir pasta de fundos manuais',
      desc: 'data/backgrounds/<sistema>/<nome do arquivo da ROM>.png — usada como fundo da tela inicial.',
      run: () => invokeMain('data:open', 'backgrounds'),
    },
  ];
};
