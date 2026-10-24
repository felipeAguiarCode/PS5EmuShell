import { MESSAGES } from '../../constants/messages.js';
import { HTTP_HEADERS, RETROACHIEVEMENTS_URL } from '../../constants/network.js';
import { parseRaJsonResponse } from './request.js';

const REJECTED_KEY_STATUSES = new Set([401, 403]);

export const fetchRaWebApi = async (endpoint, params, apiKey) => {
  const query = new URLSearchParams({ ...params, y: apiKey });
  const response = await fetch(`${RETROACHIEVEMENTS_URL}/API/${endpoint}.php?${query}`, {
    headers: HTTP_HEADERS,
  });
  if (REJECTED_KEY_STATUSES.has(response.status)) throw new Error(MESSAGES.raInvalidApiKey);
  if (!response.ok) throw new Error(MESSAGES.raResponded(response.status));
  return parseRaJsonResponse(response);
};
