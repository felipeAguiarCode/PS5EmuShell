import { invokeMain } from '../../../core/api.js';
import { escapeHtml } from '../../../core/dom.js';
import { ICONS } from '../../../ui/icons.js';
import { closeModal, openConfirm, openModal } from '../../../ui/modal.js';
import { showToast } from '../../../ui/toast.js';
import { openKeyboard } from '../../../ui/virtual-keyboard.js';
import { PASSWORD_MASK_MAX_LENGTH, TROPHY_DEFAULTS } from '../settings-constants.js';
import { buildRaStatusLine, clampValue, formatPlural } from '../settings-helpers.js';

const RESULT_ICONS = {
  ok: ICONS.checkCircle,
  unsupported: ICONS.info,
  missing: ICONS.download,
  noscript: ICONS.info,
  error: ICONS.xCircle,
};
const RESULT_LABELS = {
  ok: 'Configurado',
  unsupported: 'Sem suporte',
  missing: 'Não instalado',
  noscript: 'Sem script',
  error: 'Erro',
};
const MASKED_API_KEY = '••••••••••••••••';
const EMPTY_RA_STATUS = { connected: false, emulators: [] };

let raStatus = null;
let raForm = { username: '', password: '', apiKey: '' };
let raAvatarUrl = null;

const updateRaForm = (patch) => {
  raForm = { ...raForm, ...patch };
};

export const loadRaStatus = async () => {
  raStatus = await invokeMain('ra:status');
  if (!raForm.username && raStatus.username) updateRaForm({ username: raStatus.username });
  if (raStatus.avatar && !raAvatarUrl) {
    const images = await invokeMain('ra:images', [raStatus.avatar]);
    raAvatarUrl = images[raStatus.avatar];
  }
};

const renderResultDetail = (result) => {
  if (result.message) return ` · ${escapeHtml(result.message)}`;
  return result.file ? ` · ${escapeHtml(result.file)}` : '';
};

const showRaResults = (title, results) =>
  openModal({
    className: 'ra-results',
    html:
      `<h3>${escapeHtml(title)}</h3><div class="sub">Resultado dos scripts de cada emulador.</div>` +
      results
        .map(
          (result) =>
            `<div class="menu-item ra-res st-${result.status}"><span class="ico">${RESULT_ICONS[result.status] || ICONS.info}</span>` +
            `<span class="rr"><b>${escapeHtml(result.name)}</b><small>${escapeHtml(result.systems.join(', '))}${renderResultDetail(result)}</small></span>` +
            `<span class="r">${RESULT_LABELS[result.status] || result.status}</span></div>`,
        )
        .join('') +
      `<div class="modal-buttons"><button class="btn-pill focusable" data-group="mb">OK</button></div>`,
    onMount: (box) =>
      box.addEventListener('click', (event) => {
        if (event.target.closest('.btn-pill')) closeModal();
      }),
  });

const loginToRa = async (context) => {
  if (!raForm.username || !raForm.password) {
    showToast(
      'Informe usuário e senha',
      'A senha é usada só para obter o token de acesso e não fica salva.',
      { kind: 'raError' },
    );
    return;
  }
  showToast('Entrando no RetroAchievements…', raForm.username, { kind: 'raBusy', ms: 2500 });
  const result = await invokeMain(
    'ra:login',
    raForm.username.trim(),
    raForm.password,
    raForm.apiKey.trim(),
    raStatus && raStatus.hardcore,
  );
  updateRaForm({ password: '' });
  if (!result.ok) {
    showToast('Não foi possível entrar', result.error, { kind: 'raError', ms: 6000 });
    context.render();
    return;
  }
  raAvatarUrl = null;
  await loadRaStatus();
  context.render();
  const configuredCount = result.results.filter((item) => item.status === 'ok').length;
  showToast(
    `Conectado como ${result.user}`,
    `${result.points} pontos · ${configuredCount} ${formatPlural(configuredCount, 'emulador configurado', 'emuladores configurados')}`,
    { kind: 'raLogin' },
  );
  await showRaResults('Emuladores configurados', result.results);
};

const runRaAction = async (context, channel, argument, title) => {
  const result = await invokeMain(channel, argument);
  if (!result.ok) {
    showToast('RetroAchievements', result.error, { kind: 'raError', ms: 6000 });
    return null;
  }
  await loadRaStatus();
  context.render();
  if (result.results && result.results.length && title) await showRaResults(title, result.results);
  return result;
};

const logoutFromRa = async (context) => {
  const isConfirmed = await openConfirm(
    'Sair do RetroAchievements?',
    'O login será removido de todos os emuladores.',
    { ok: 'Sair' },
  );
  if (!isConfirmed) return;
  raAvatarUrl = null;
  await runRaAction(context, 'ra:logout', null, 'Login removido dos emuladores');
};

const saveApiKey = async (context, status, value) => {
  if (!value || /^•+$/.test(value)) return;
  updateRaForm({ apiKey: value.trim() });
  const patch =
    !status.connected && raForm.username
      ? { apiKey: raForm.apiKey, username: raForm.username }
      : { apiKey: raForm.apiKey };
  await runRaAction(context, 'ra:update', patch);
  updateRaForm({ apiKey: '' });
  showToast('Chave da Web API salva', 'A aba Troféus já pode sincronizar.', { kind: 'raLogin' });
};

const typePassword = async (context) => {
  const password = await openKeyboard({ title: 'Senha do RetroAchievements', mask: true });
  if (password === null) return;
  updateRaForm({ password });
  context.render();
};

const describePasswordRow = (status) => {
  if (raForm.password)
    return '•'.repeat(Math.min(PASSWORD_MASK_MAX_LENGTH, raForm.password.length));
  return status.connected ? 'Já conectado' : 'Toque para digitar';
};

const renderAccountHead = (status) => {
  if (!status.connected) {
    return (
      `<div class="ra-head off"><div class="ra-avatar">${ICONS.trophy}</div><div><div class="ra-k">Não conectado</div>` +
      `<div class="ra-pts">Entre com sua conta do retroachievements.org: o PS5 Emu Shell configura e loga a conta em todos os emuladores compatíveis.</div></div></div>`
    );
  }
  const avatar = raAvatarUrl ? `<img src="${escapeHtml(raAvatarUrl)}" alt="">` : ICONS.user;
  const hardcore = status.hardcore ? ' · hardcore' : '';
  const apiKeyNote = status.hasApiKey ? '' : ' · sem chave da Web API (aba Troféus desativada)';
  return (
    `<div class="ra-head"><div class="ra-avatar">${avatar}</div>` +
    `<div><div class="ra-k">Conectado</div><div class="ra-user">${escapeHtml(status.username)}</div><div class="ra-pts">${status.points} pontos${hardcore}${apiKeyNote}</div></div></div>`
  );
};

const formatPercent = (value) => `${value}%`;
const formatPoints = (value) => `${value} pts`;

const describeTierRules = (rules) =>
  rules.tierMode === 'points'
    ? `Bronze: até ${rules.silverPoints - 1} pts · Prata: ${rules.silverPoints}–${rules.goldPoints - 1} pts · Ouro: ${rules.goldPoints}+ pts`
    : `Ouro: até ${rules.goldPct}% dos jogadores · Prata: até ${rules.silverPct}% · Bronze: acima de ${rules.silverPct}%`;

const buildTierRangeRows = (rules) =>
  rules.tierMode === 'points'
    ? [
        {
          type: 'range',
          label: 'Prata a partir de',
          desc: 'Conquistas com menos pontos que isso são bronze.',
          min: 1,
          max: 99,
          def: TROPHY_DEFAULTS.silverPoints,
          get: () => rules.silverPoints,
          set: (value) => {
            rules.silverPoints = clampValue(value, 1, rules.goldPoints - 1);
          },
          format: formatPoints,
        },
        {
          type: 'range',
          label: 'Ouro a partir de',
          desc: 'Conquistas com essa pontuação ou mais são ouro.',
          min: 2,
          max: 100,
          def: TROPHY_DEFAULTS.goldPoints,
          get: () => rules.goldPoints,
          set: (value) => {
            rules.goldPoints = clampValue(value, rules.silverPoints + 1, 100);
          },
          format: formatPoints,
        },
      ]
    : [
        {
          type: 'range',
          label: 'Ouro: obtido por até',
          desc: 'Conquistas mais raras que isso são ouro.',
          min: 1,
          max: 98,
          def: TROPHY_DEFAULTS.goldPct,
          get: () => rules.goldPct,
          set: (value) => {
            rules.goldPct = clampValue(value, 1, rules.silverPct - 1);
          },
          format: formatPercent,
        },
        {
          type: 'range',
          label: 'Prata: obtido por até',
          desc: 'Entre o limite do ouro e este valor: prata. Acima: bronze.',
          min: 2,
          max: 99,
          def: TROPHY_DEFAULTS.silverPct,
          get: () => rules.silverPct,
          set: (value) => {
            rules.silverPct = clampValue(value, rules.goldPct + 1, 99);
          },
          format: formatPercent,
        },
      ];

const buildRarityRangeRows = (rules) => [
  {
    type: 'range',
    label: 'Ultra raro: até',
    min: 1,
    max: 97,
    def: TROPHY_DEFAULTS.ultraRarePct,
    get: () => rules.ultraRarePct,
    set: (value) => {
      rules.ultraRarePct = clampValue(value, 1, rules.veryRarePct - 1);
    },
    format: formatPercent,
  },
  {
    type: 'range',
    label: 'Muito raro: até',
    min: 2,
    max: 98,
    def: TROPHY_DEFAULTS.veryRarePct,
    get: () => rules.veryRarePct,
    set: (value) => {
      rules.veryRarePct = clampValue(value, rules.ultraRarePct + 1, rules.rarePct - 1);
    },
    format: formatPercent,
  },
  {
    type: 'range',
    label: 'Raro: até',
    min: 3,
    max: 99,
    def: TROPHY_DEFAULTS.rarePct,
    get: () => rules.rarePct,
    set: (value) => {
      rules.rarePct = clampValue(value, rules.veryRarePct + 1, 99);
    },
    format: formatPercent,
  },
];

const withRecommendedDescription = (row) =>
  row.type === 'range'
    ? { ...row, desc: `${row.desc ? `${row.desc} ` : ''}Recomendado: ${row.format(row.def)}.` }
    : row;

const buildTrophyRuleRows = (context) => {
  const rules = context.getDraft().trophies;
  return [
    { type: 'section', label: 'Classificação dos troféus' },
    {
      type: 'select',
      label: 'Tipo de troféu definido por',
      desc: `${describeTierRules(rules)}\nPlatina: jogo com todas as conquistas obtidas.`,
      options: [
        { v: 'points', l: 'Pontos da conquista' },
        { v: 'rarity', l: '% de jogadores que obtiveram' },
      ],
      get: () => rules.tierMode,
      set: (value) => {
        rules.tierMode = value;
      },
    },
    ...buildTierRangeRows(rules),
    { type: 'section', label: 'Raridade (% de jogadores que obtiveram)' },
    {
      type: 'info',
      label: 'Faixas atuais',
      desc: `Ultra raro: até ${rules.ultraRarePct}% · Muito raro: até ${rules.veryRarePct}% · Raro: até ${rules.rarePct}% · Comum: acima de ${rules.rarePct}%`,
    },
    ...buildRarityRangeRows(rules),
    {
      type: 'button',
      icon: ICONS.refresh,
      label: 'Restaurar todos os valores recomendados',
      desc: 'Volta o tipo de troféu e todos os sliders acima ao padrão.',
      run: () => {
        Object.assign(rules, TROPHY_DEFAULTS);
        context.changed();
        showToast('Valores recomendados restaurados', 'Classificação dos troféus', {
          kind: 'success',
          ms: 2200,
          sound: false,
        });
      },
    },
  ].map(withRecommendedDescription);
};

const buildAccountRows = (context, status) => [
  {
    type: 'text',
    label: 'Usuário',
    get: () => raForm.username,
    set: (value) => {
      updateRaForm({ username: value.trim() });
      if (!status.connected && raForm.username) {
        invokeMain('ra:update', { username: raForm.username });
      }
    },
  },
  {
    type: 'button',
    label: 'Senha',
    desc: 'Usada só para obter o token de acesso; não é salva.',
    right: describePasswordRow(status),
    run: () => typePassword(context),
  },
  {
    type: 'text',
    label: 'Chave da Web API',
    desc: `Usada pela aba Troféus e salva na hora (não precisa de login). Em retroachievements.org › Settings › Keys › Web API Key.${status.hasApiKey ? `\nSalva: ${status.apiKeyHint}` : ''}`,
    get: () => raForm.apiKey || (status.hasApiKey ? MASKED_API_KEY : ''),
    set: (value) => saveApiKey(context, status, value),
  },
  {
    type: 'toggle',
    label: 'Modo hardcore',
    desc: 'Conquistas valem pontos completos, mas save states, slow-motion e cheats ficam bloqueados nos emuladores.',
    get: () => Boolean(status.hardcore),
    set: (value) => {
      raStatus = { ...status, hardcore: value };
      if (status.connected) {
        runRaAction(
          context,
          'ra:update',
          { hardcore: value },
          value ? 'Hardcore ativado' : 'Hardcore desativado',
        );
      }
    },
  },
  {
    type: 'button',
    style: 'action',
    icon: ICONS.trophy,
    label: status.connected ? 'Entrar novamente e reconfigurar' : 'Entrar e configurar emuladores',
    desc: 'Faz login no RetroAchievements e roda o script de cada emulador.',
    run: () => loginToRa(context),
  },
];

const buildConnectedRows = (context) => [
  {
    type: 'button',
    icon: ICONS.refresh,
    label: 'Reaplicar nos emuladores',
    desc: 'Útil depois de instalar ou atualizar um emulador.',
    run: () => runRaAction(context, 'ra:apply', null, 'Emuladores configurados'),
  },
  {
    type: 'button',
    style: 'danger',
    icon: ICONS.exit,
    label: 'Sair da conta',
    desc: 'Remove o login de todos os emuladores e apaga o token salvo.',
    run: () => logoutFromRa(context),
  },
];

const describeEmulatorDot = (emulator) => {
  if (emulator.enabled && emulator.user) return 'on';
  return emulator.supported ? '' : 'na';
};

export const buildRetroAchievementsRows = (context) => {
  const status = raStatus || EMPTY_RA_STATUS;
  return [
    { type: 'title', label: 'RetroAchievements' },
    { type: 'panel', html: renderAccountHead(status) },
    { type: 'section', label: 'Conta' },
    ...buildAccountRows(context, status),
    ...(status.connected ? buildConnectedRows(context) : []),
    ...buildTrophyRuleRows(context),
    { type: 'section', label: 'Emuladores (um script para cada)' },
    ...status.emulators.map((emulator) => ({
      type: 'info',
      leadHtml: `<span class="ra-dot ${describeEmulatorDot(emulator)}"></span>`,
      label: emulator.name,
      desc: emulator.systems.join(', '),
      right: buildRaStatusLine(emulator),
    })),
  ];
};
