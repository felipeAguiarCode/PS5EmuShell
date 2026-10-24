import { invokeMain } from '../../../core/api.js';
import { runCommand } from '../../../core/commands.js';
import { escapeHtml, queryOne } from '../../../core/dom.js';
import { getState } from '../../../core/store.js';
import { ICONS } from '../../../ui/icons.js';
import { closeModal, openModal } from '../../../ui/modal.js';
import { playSound } from '../../../ui/sound.js';
import { showToast } from '../../../ui/toast.js';

const CUSTOM_AVATAR_PREFIX = 'custom:';
const CUSTOM_AVATAR_OPTION = '__custom';
const DEFAULT_PROFILE_NAME = 'Jogador';
const DEFAULT_BASE_DIR = '..';
const VOLUME_STEPS = 11;

const readProfileInitial = (config) => (config.profileName || 'J').charAt(0).toUpperCase();

const describeAvatar = (avatar) => {
  if (!avatar) return 'Inicial do nome';
  return avatar.startsWith(CUSTOM_AVATAR_PREFIX) ? 'Imagem personalizada' : 'Alterar';
};

const describeAvatarOption = (option) => {
  if (option.classList.contains('current')) return 'Avatar atual';
  if (option.dataset.v === CUSTOM_AVATAR_OPTION) return 'Escolher uma imagem do computador';
  if (option.dataset.v === '') return 'Usar a inicial do nome';
  return 'Pressione para usar este avatar';
};

const renderAvatarPicker = ({ base, items, currentAvatar, initial }) => {
  const renderOption = (value, inner, extraClass = '') =>
    `<button class="avatar-opt focusable${extraClass}${value === currentAvatar ? ' current' : ''}" data-group="av" data-v="${escapeHtml(value)}">${inner}</button>`;
  const customClass = ` custom${currentAvatar.startsWith(CUSTOM_AVATAR_PREFIX) ? ' current' : ''}`;
  return (
    `<div class="avatar-head"><div class="avatar-preview"></div><div><h3>Escolha seu avatar</h3>` +
    `<div class="sub">${items.length} avatares em launcher\\assets\\avatars — adicione imagens nessa pasta para ter mais opções.</div>` +
    `<div class="avatar-state"></div></div></div>` +
    `<div class="avatar-grid">` +
    items
      .map((fileName) =>
        renderOption(
          fileName,
          `<img src="${escapeHtml(base + encodeURIComponent(fileName))}" alt="" loading="lazy" decoding="async" draggable="false">`,
        ),
      )
      .join('') +
    renderOption(CUSTOM_AVATAR_OPTION, ICONS.image, customClass) +
    renderOption('', `<span style="font-size:34px;font-weight:600">${initial}</span>`, ' custom') +
    `</div>`
  );
};

const pickAvatar = async (context) => {
  const draft = context.getDraft();
  const { base, items } = await invokeMain('avatars:list');
  const html = renderAvatarPicker({
    base,
    items,
    currentAvatar: draft.avatar || '',
    initial: escapeHtml((draft.profileName || 'J').trim().charAt(0).toUpperCase()),
  });
  const choice = await openModal({
    className: 'avatars',
    html,
    initial: '.avatar-opt.current',
    onMount: (box) => {
      box.addEventListener('click', (event) => {
        const option = event.target.closest('.avatar-opt');
        if (!option) return;
        playSound('select');
        closeModal(option.dataset.v);
      });
      box.addEventListener('navfocus', (event) => {
        const option = event.target.closest('.avatar-opt');
        if (!option) return;
        queryOne('.avatar-preview', box).innerHTML = option.innerHTML;
        queryOne('.avatar-state', box).textContent = describeAvatarOption(option);
      });
    },
  });
  if (choice === null) return;
  const avatar = choice === CUSTOM_AVATAR_OPTION ? await invokeMain('avatar:pickCustom') : choice;
  if (avatar === null) return;
  context.getDraft().avatar = avatar;
  context.commitDraft();
  context.saveSoon();
  await runCommand('applyProfile');
  context.render();
  showToast('Avatar atualizado', '', { kind: 'avatar', ms: 2000 });
};

export const buildGeneralRows = (context) => {
  const config = context.getDraft();
  const { avatarUrl, paths } = getState();
  return [
    { type: 'title', label: 'Geral' },
    {
      type: 'text',
      label: 'Nome do perfil',
      desc: 'Exibido na tela de boas-vindas.',
      get: () => config.profileName,
      set: (value) => {
        config.profileName = value || DEFAULT_PROFILE_NAME;
      },
      after: () => runCommand('applyProfile'),
    },
    {
      type: 'button',
      label: 'Avatar',
      desc: 'Escolha entre os avatares incluídos ou use uma imagem sua.',
      leadHtml: `<span class="avatar-thumb">${avatarUrl ? `<img src="${escapeHtml(avatarUrl)}" alt="">` : escapeHtml(readProfileInitial(config))}</span>`,
      right: describeAvatar(config.avatar),
      run: () => pickAvatar(context),
    },
    {
      type: 'toggle',
      label: 'Tela cheia',
      desc: 'Também pode ser alternado com F11.',
      get: () => config.fullscreen,
      set: (value) => {
        config.fullscreen = value;
      },
    },
    {
      type: 'toggle',
      label: 'Tela de boas-vindas',
      desc: 'Mostra o perfil ao abrir o launcher.',
      get: () => config.showWelcome,
      set: (value) => {
        config.showWelcome = value;
      },
    },
    {
      type: 'toggle',
      label: 'Ocultar launcher durante o jogo',
      desc: 'Desativado, o launcher apenas minimiza.',
      get: () => config.hideOnLaunch,
      set: (value) => {
        config.hideOnLaunch = value;
      },
    },
    {
      type: 'link',
      label: 'Aparência',
      desc: 'Tema, animações, imagem de fundo, miniaturas e ícones dos botões.',
      go: 'appearance',
    },
    { type: 'section', label: 'Som' },
    {
      type: 'toggle',
      label: 'Sons da interface',
      get: () => config.sounds,
      set: (value) => {
        config.sounds = value;
      },
    },
    {
      type: 'select',
      label: 'Volume',
      options: Array.from({ length: VOLUME_STEPS }, (_, index) => ({
        v: index * 10,
        l: `${index * 10}%`,
      })),
      get: () => config.volume,
      set: (value) => {
        config.volume = value;
      },
      after: () => playSound('select'),
    },
    { type: 'section', label: 'Pastas' },
    {
      type: 'path',
      kind: 'folder',
      relativeTo: 'root',
      label: 'Pasta base',
      desc: `Caminhos relativos partem daqui. Padrão ".." (pasta acima do launcher). Atual: ${paths.base}`,
      get: () => config.baseDir,
      set: (value) => {
        config.baseDir = value || DEFAULT_BASE_DIR;
      },
      systems: true,
      noCheck: true,
    },
  ];
};
