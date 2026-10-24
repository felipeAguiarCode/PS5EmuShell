import { CUSTOM_AVATAR_PREFIX } from '../constants/app.js';

const MERGED_SECTIONS = ['killCombo', 'homeCombo', 'optimize', 'trophies', 'appearance'];

const mergeWithDefaults = (savedConfig, defaultConfig) => {
  const mergedSections = Object.fromEntries(
    MERGED_SECTIONS.map((section) => [
      section,
      { ...defaultConfig[section], ...(savedConfig[section] ?? {}) },
    ]),
  );
  return {
    ...defaultConfig,
    ...savedConfig,
    ...mergedSections,
    systems: Array.isArray(savedConfig.systems) ? savedConfig.systems : defaultConfig.systems,
  };
};

const withMissingCatalogEmulators = (systems, catalogSystems) => {
  let hasChanged = false;
  const nextSystems = systems.map((system) => {
    const catalogSystem = catalogSystems.find((candidate) => candidate.id === system.id);
    if (!catalogSystem) return system;
    const missingEmulators = catalogSystem.emulators.filter(
      (emulator) => !system.emulators.some((existing) => existing.id === emulator.id),
    );
    if (!missingEmulators.length) return system;
    hasChanged = true;
    return { ...system, emulators: [...system.emulators, ...missingEmulators] };
  });
  return { systems: nextSystems, hasChanged };
};

const isMissingBundledAvatar = (avatar, avatarFileNames) =>
  Boolean(avatar) && !avatar.startsWith(CUSTOM_AVATAR_PREFIX) && !avatarFileNames.includes(avatar);

const pickFallbackAvatar = (defaultAvatar, avatarFileNames) =>
  avatarFileNames.includes(defaultAvatar) ? defaultAvatar : (avatarFileNames[0] ?? '');

export const migrateConfig = ({
  savedConfig,
  defaultConfig,
  catalogSystems,
  pcSystem,
  avatarFileNames,
}) => {
  if (!savedConfig) return { config: defaultConfig, hasChanged: true };

  const mergedConfig = mergeWithDefaults(savedConfig, defaultConfig);
  const catalogResult = withMissingCatalogEmulators(mergedConfig.systems, catalogSystems);
  const hasStaleAvatar = isMissingBundledAvatar(mergedConfig.avatar, avatarFileNames);
  const hasPcSystem = catalogResult.systems.some((system) => system.id === pcSystem.id);

  const config = {
    ...mergedConfig,
    avatar: hasStaleAvatar
      ? pickFallbackAvatar(defaultConfig.avatar, avatarFileNames)
      : mergedConfig.avatar,
    systems: hasPcSystem ? catalogResult.systems : [...catalogResult.systems, pcSystem],
  };

  return { config, hasChanged: catalogResult.hasChanged || hasStaleAvatar || !hasPcSystem };
};
