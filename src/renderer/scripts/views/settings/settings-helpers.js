const SLUG_MAX_LENGTH = 16;
const SHORT_NAME_MAX_LENGTH = 4;
const LOCALE = 'pt-BR';
const VERSION_PREFIX = /^[a-z]+[_-]?(?=\d)/i;
const VERSION_UNDERSCORE = /(\d)_(?=\d)/g;
const EXECUTABLE_EXTENSION = /\.(exe|bat|cmd)$/i;
const DEFAULT_EMULATOR_ARGS = '"{rom}"';
const DEFAULT_SYSTEM_EXTENSIONS = ['.iso', '.zip'];

export const buildSlug = (text) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, SLUG_MAX_LENGTH) || 'item';

export const buildUniqueId = (baseId, isTaken) => {
  let id = baseId;
  while (isTaken(id)) id += '2';
  return id;
};

export const clampValue = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

export const calculateRangePercent = (value, minimum, maximum) =>
  ((value - minimum) * 100) / (maximum - minimum);

export const findNextOptionValue = (options, currentValue, direction) => {
  const index = options.findIndex((option) => option.v === currentValue);
  const step = direction === 'right' ? 1 : -1;
  return options[(index + step + options.length) % options.length].v;
};

export const findPageRoot = (page) => (page.startsWith('system:') ? 'systems' : page);

export const formatEmulatorVersion = (versionInfo) => {
  if (!versionInfo) return '';
  if (versionInfo.version && /\d/.test(versionInfo.version)) {
    return versionInfo.version.replace(VERSION_PREFIX, '').replace(VERSION_UNDERSCORE, '$1.');
  }
  return versionInfo.published
    ? `build de ${new Date(`${versionInfo.published}T12:00`).toLocaleDateString(LOCALE)}`
    : versionInfo.version || '';
};

export const findEmulatorVersion = (versions, emulator) =>
  (versions || []).find(
    (version) => version.system === emulator.system && version.id === emulator.id,
  ) || null;

const describeInstalledVersion = (emulator, version) => {
  if (!emulator.installed) return 'não instalado';
  if (!version || !version.installed) return '…';
  return formatEmulatorVersion(version.installed) || 'versão não identificada';
};

const describeLatestVersion = (version, isLoading) => {
  if (version && version.latest) {
    return version.latest.error && !version.latest.version
      ? 'indisponível'
      : formatEmulatorVersion(version.latest);
  }
  return isLoading ? 'consultando…' : '—';
};

const describeEmulatorSource = (emulator, version) => {
  if (version && version.source) return ` · Fonte: ${version.source}`;
  return emulator.downloadable ? '' : ' · sem download automático';
};

export const buildEmulatorDescription = (emulator, version, isLoading) => {
  const installed = describeInstalledVersion(emulator, version);
  const latest = describeLatestVersion(version, isLoading);
  return [
    `${emulator.systemName}${describeEmulatorSource(emulator, version)}`,
    emulator.downloadable
      ? `Instalada: ${installed} · Última: ${latest}`
      : `Instalada: ${installed}`,
  ].join('\n');
};

const describeProgressPhase = (progress, formatSize) => {
  if (progress.phase === 'resolve') return 'Consultando…';
  if (progress.phase === 'download') {
    return progress.pct
      ? `Baixando ${Math.round(progress.pct * 100)}%`
      : `Baixando ${formatSize(progress.bytes)}`;
  }
  if (progress.phase === 'extract') return 'Extraindo…';
  if (progress.phase === 'install') return 'Instalando…';
  if (progress.phase === 'done') return `✓ Instalado ${progress.version || ''}`.trim();
  if (progress.phase === 'error') return 'Erro — tente de novo';
  return null;
};

export const buildProgressText = ({ emulator, progress, version, formatSize }) => {
  const phaseText = progress ? describeProgressPhase(progress, formatSize) : null;
  if (phaseText) return phaseText;
  if (!emulator.downloadable) return emulator.installed ? 'Instalado' : 'Sem download automático';
  const latest =
    version && version.latest && version.latest.version
      ? formatEmulatorVersion(version.latest)
      : '';
  if (!emulator.installed) return latest ? `Baixar ${latest}` : 'Baixar';
  if (version && version.state === 'ok') return '✓ Atualizado';
  if (version && version.state === 'old') return latest ? `Atualizar para ${latest}` : 'Atualizar';
  return 'Reinstalar última versão';
};

export const buildRaStatusLine = (emulator) => {
  if (!emulator.hasScript) return 'Sem script';
  if (!emulator.supported) {
    return emulator.alternative ? `Sem suporte · use ${emulator.alternative}` : 'Sem suporte';
  }
  if (!emulator.installed) return 'Não instalado';
  if (emulator.enabled && emulator.user) return `✓ Conectado como ${emulator.user}`;
  return 'Não configurado';
};

export const buildCoverProgressText = (progress) =>
  progress && progress.total && progress.done < progress.total
    ? `Baixando… ${progress.done}/${progress.total}`
    : 'Ocioso';

export const countGamesBySystem = (games) =>
  games.reduce(
    (counts, game) => ({ ...counts, [game.system]: (counts[game.system] || 0) + 1 }),
    {},
  );

export const parseExtensions = (text) =>
  text
    .split(/[,\s;]+/)
    .map((extension) => extension.trim().toLowerCase())
    .filter(Boolean)
    .map((extension) => (extension.startsWith('.') ? extension : `.${extension}`));

export const buildShortName = (name, id) =>
  name
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(0, SHORT_NAME_MAX_LENGTH)
    .toUpperCase() || id.toUpperCase();

export const buildNewSystem = ({ name, systems, palette }) => {
  const id = buildUniqueId(buildSlug(name), (candidate) =>
    systems.some((system) => system.id === candidate),
  );
  return {
    id,
    name,
    shortName: buildShortName(name, id),
    color: palette[systems.length % palette.length],
    enabled: true,
    romDirs: [`roms/${id}`],
    extensions: [...DEFAULT_SYSTEM_EXTENSIONS],
    thumbnailsRepo: '',
    defaultEmulator: '',
    emulators: [],
  };
};

export const buildEmulatorFromExe = (exe, emulators) => {
  const baseName = exe.split(/[\\/]/).pop().replace(EXECUTABLE_EXTENSION, '');
  const id = buildUniqueId(buildSlug(baseName), (candidate) =>
    emulators.some((emulator) => emulator.id === candidate),
  );
  return { id, name: baseName, exe, args: DEFAULT_EMULATOR_ARGS };
};

export const normalizeKillListName = (value) =>
  (value || '')
    .trim()
    .toLowerCase()
    .replace(/\.exe$/, '');

export const pickRecommendedSystemId = ([first, second]) =>
  first && first.files && (first.hint > 0 || !second || first.files > second.files)
    ? first.id
    : null;

export const formatPlural = (count, singular, plural) => (count === 1 ? singular : plural);
