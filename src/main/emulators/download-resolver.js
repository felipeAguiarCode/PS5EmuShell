import { MESSAGES } from '../constants/messages.js';
import { GITHUB_API_URL, HTTP_HEADERS } from '../constants/network.js';
import { fetchLatestRaClient } from '../retroachievements/api/request.js';

const DOLPHIN_VERSION_PATTERN = /(\d[\w.-]*?)-x64/;
const YEAR_MONTH_PATTERN = /^(\d{2})(\d{2})/;
const MAX_MONTH = 12;

const buildFileNameFromUrl = (url) => decodeURIComponent(url.split('/').pop());

export const calculateDolphinReleaseDate = (version) => {
  const yearMonth = version.match(YEAR_MONTH_PATTERN);
  const month = yearMonth ? Number(yearMonth[2]) : 0;
  return month >= 1 && month <= MAX_MONTH ? `20${yearMonth[1]}-${yearMonth[2]}-01` : '';
};

const fetchRaDownload = async (source) => {
  const { version, url } = await fetchLatestRaClient(source.ra);
  if (!url) throw new Error(MESSAGES.raDownloadNotFound);
  return { url, name: buildFileNameFromUrl(url), version };
};

const fetchGithubDownload = async (source) => {
  const response = await fetch(`${GITHUB_API_URL}/repos/${source.github}/releases/latest`, {
    headers: HTTP_HEADERS,
  });
  if (!response.ok) throw new Error(MESSAGES.githubResponded(response.status));
  const release = await response.json();
  const asset = (release.assets ?? []).find((candidate) => source.asset.test(candidate.name));
  if (!asset) throw new Error(MESSAGES.windowsPackageNotFound);
  const versionFromName = source.version ? asset.name.match(source.version)?.[1] : null;
  return {
    url: asset.browser_download_url,
    name: asset.name,
    version: versionFromName || release.tag_name,
    published: (asset.updated_at || release.published_at || '').slice(0, 10),
  };
};

export const buildPageDownload = (source, url) => {
  const name = source.buildFileName ? source.buildFileName(url) : buildFileNameFromUrl(url);
  if (source.version) {
    const versionMatch = url.match(source.version);
    const version = versionMatch ? (source.formatVersion?.(versionMatch) ?? versionMatch[1]) : '';
    return { url, name, version, published: '' };
  }
  const version = url.match(DOLPHIN_VERSION_PATTERN)?.[1] ?? '';
  return { url, name, version, published: calculateDolphinReleaseDate(version) };
};

const fetchPageDownload = async (source) => {
  const response = await fetch(source.page, { headers: HTTP_HEADERS });
  if (!response.ok) throw new Error(MESSAGES.siteResponded(response.status));
  const linkMatch = (await response.text()).match(source.link);
  if (!linkMatch) throw new Error(MESSAGES.downloadLinkNotFound);
  return buildPageDownload(source, new URL(linkMatch[1], source.page).href);
};

export const fetchLatestDownload = (source) => {
  if (source.ra) return fetchRaDownload(source);
  if (source.github) return fetchGithubDownload(source);
  return fetchPageDownload(source);
};
