import { invokeMain } from '../../core/api.js';
import { runCommand } from '../../core/commands.js';
import { ICONS } from '../../ui/icons.js';
import { openMenu } from '../../ui/modal.js';

const buildCoverMenuItems = (collection) => [
  {
    label: collection.coverUrl ? 'Trocar imagem de capa' : 'Escolher imagem de capa',
    icon: ICONS.image,
    value: 'pick',
  },
  ...(collection.coverUrl
    ? [{ label: 'Voltar às capas dos jogos', icon: ICONS.refresh, value: 'clear' }]
    : []),
];

export const chooseCollectionCover = async (collection) => {
  const choice = await openMenu({
    title: 'Capa da coleção',
    sub: collection.coverUrl
      ? `${collection.name} · usando imagem personalizada`
      : `${collection.name} · usando as capas dos jogos`,
    items: buildCoverMenuItems(collection),
  });
  if (!choice) return null;
  const file =
    choice === 'pick'
      ? await runCommand('openFileBrowser', {
          mode: 'image',
          title: `Capa de “${collection.name}”`,
        })
      : null;
  if (choice === 'pick' && !file) return null;
  const coverPatch = await invokeMain('collections:setCover', collection.id, file);
  return { collection: { ...collection, ...coverPatch }, file };
};
