import fs from 'node:fs';
import path from 'node:path';

const HARDCORE_PREFERENCE_KEY = 'Hardcore Active';

const readPreferences = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
};

const writePreferences = (file, preferences) =>
  fs.writeFileSync(file, JSON.stringify(preferences, null, 2));

export const withLoginPreferences = (preferences, { username, token, hardcore }) => ({
  ...preferences,
  Username: username,
  Token: token,
  [HARDCORE_PREFERENCE_KEY]: Boolean(hardcore),
});

export const withoutLoginPreferences = (preferences) => {
  const loggedOutPreferences = Object.fromEntries(
    Object.entries(preferences).filter(([key]) => key !== 'Token'),
  );
  return { ...loggedOutPreferences, Username: '' };
};

export const makeRaIntegrationScript = ({ id, name, client }) => {
  const resolvePreferencesFile = (dir) => path.join(dir, `RAPrefs_${client}.cfg`);
  return {
    id,
    name,
    supported: true,
    configure: ({ dir, username, token, hardcore }) => {
      const file = resolvePreferencesFile(dir);
      fs.mkdirSync(dir, { recursive: true });
      writePreferences(
        file,
        withLoginPreferences(readPreferences(file) ?? {}, { username, token, hardcore }),
      );
      return { ok: true, file };
    },
    clear: ({ dir }) => {
      const file = resolvePreferencesFile(dir);
      const preferences = readPreferences(file);
      if (preferences) writePreferences(file, withoutLoginPreferences(preferences));
      return { ok: true, file };
    },
    readStatus: ({ dir }) => {
      const preferences = readPreferences(resolvePreferencesFile(dir)) ?? {};
      return { user: preferences.Username || null, enabled: Boolean(preferences.Token) };
    },
  };
};
