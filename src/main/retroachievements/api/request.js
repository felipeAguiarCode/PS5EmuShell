import { MESSAGES } from '../../constants/messages.js';
import { HTTP_HEADERS, RETROACHIEVEMENTS_URL } from '../../constants/network.js';
import {
  RA_INVALID_CREDENTIALS_CODE,
  RA_LATEST_CLIENT_QUERY,
  RA_LATEST_INTEGRATION_QUERY,
} from '../../constants/retroachievements.js';

const UNAUTHORIZED_STATUS = 401;
const DOREQUEST_URL = `${RETROACHIEVEMENTS_URL}/dorequest.php`;

export const parseRaJsonResponse = async (response) => {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(MESSAGES.raUnexpectedResponse(response.status), { cause: error });
  }
};

export const fetchRaLogin = async (username, password) => {
  const response = await fetch(DOREQUEST_URL, {
    method: 'POST',
    headers: { ...HTTP_HEADERS, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ r: 'login2', u: username, p: password }),
  });
  const login = await parseRaJsonResponse(response);
  if (login.Success && login.Token) return login;
  if (login.Code === RA_INVALID_CREDENTIALS_CODE || response.status === UNAUTHORIZED_STATUS) {
    throw new Error(MESSAGES.raInvalidCredentials);
  }
  throw new Error(login.Error || MESSAGES.raLoginFailed);
};

const fetchLatestRelease = async (query) => {
  const release = await parseRaJsonResponse(
    await fetch(`${DOREQUEST_URL}?${query}`, { headers: HTTP_HEADERS }),
  );
  if (!release.Success) throw new Error(release.Error || MESSAGES.raVersionNotFound);
  return {
    version: release.LatestVersion,
    url: (release.LatestVersionUrlX64 || release.LatestVersionUrl || '').replace(
      /^http:/,
      'https:',
    ),
  };
};

export const fetchLatestRaClient = (clientId) =>
  fetchLatestRelease(`${RA_LATEST_CLIENT_QUERY}${clientId}`);

export const fetchLatestRaIntegration = () => fetchLatestRelease(RA_LATEST_INTEGRATION_QUERY);
