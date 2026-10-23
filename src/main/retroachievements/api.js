// Comunicação com o RetroAchievements: login de emulador (dorequest), Web API e cache de imagens.
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const paths = require('../paths');

const HOST = 'https://retroachievements.org';
const MEDIA = 'https://media.retroachievements.org';
const HEADERS = { 'User-Agent': 'PlayDeck-Launcher' };

async function json(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Resposta inesperada do RetroAchievements (${res.status}).`);
  }
}

// Mesmo pedido que os emuladores fazem (rcheevos): POST r=login2 com usuário e senha.
async function login(username, password) {
  const body = new URLSearchParams({ r: 'login2', u: username, p: password });
  const res = await fetch(`${HOST}/dorequest.php`, {
    method: 'POST',
    headers: { ...HEADERS, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const j = await json(res);
  if (!j.Success || !j.Token) {
    if (j.Code === 'invalid_credentials' || res.status === 401) throw new Error('Usuário ou senha inválidos.');
    throw new Error(j.Error || 'Não foi possível entrar no RetroAchievements.');
  }
  return j;
}

// Versão mais recente dos emuladores oficiais (RANes=5, RASnes9x=2, RAVBA=3) e da DLL RAIntegration.
async function latest(kind, id) {
  const q = kind === 'integration' ? 'r=latestintegration' : `r=latestclient&e=${id}`;
  const j = await json(await fetch(`${HOST}/dorequest.php?${q}`, { headers: HEADERS }));
  if (!j.Success) throw new Error(j.Error || 'Versão não encontrada.');
  return { version: j.LatestVersion, url: (j.LatestVersionUrlX64 || j.LatestVersionUrl || '').replace(/^http:/, 'https:') };
}

// Web API (exige a chave pessoal "Web API Key" do usuário).
async function web(endpoint, params, apiKey) {
  const q = new URLSearchParams({ ...params, y: apiKey });
  const res = await fetch(`${HOST}/API/${endpoint}.php?${q}`, { headers: HEADERS });
  if (res.status === 401 || res.status === 403) throw new Error('Chave da Web API inválida.');
  if (!res.ok) throw new Error(`RetroAchievements respondeu ${res.status}.`);
  return json(res);
}

// ---- imagens (cache local, para funcionar offline e não depender da CSP) ----

const imgDir = () => paths.file('cache', 'ra', 'img');
const pending = new Map();
const queue = [];
let active = 0;
const MAX = 6;

function localFile(rel) {
  return path.join(imgDir(), rel.replace(/^\/+/, '').replace(/[\\/:*?"<>|]+/g, '_'));
}

function pump() {
  while (active < MAX && queue.length) {
    const job = queue.shift();
    active++;
    job().finally(() => {
      active--;
      pump();
    });
  }
}

// rel: caminho do RA ("/Badge/123.png", "/Images/0456.png", "/UserPic/x.png").
function image(rel) {
  if (!rel) return Promise.resolve(null);
  const file = localFile(rel);
  if (fs.existsSync(file)) return Promise.resolve(pathToFileURL(file).href);
  if (pending.has(file)) return pending.get(file);
  const p = new Promise((resolve) => {
    queue.push(async () => {
      try {
        const res = await fetch(MEDIA + (rel.startsWith('/') ? rel : '/' + rel), { headers: HEADERS });
        if (!res.ok) return resolve(null);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
        resolve(pathToFileURL(file).href);
      } catch {
        resolve(null);
      } finally {
        pending.delete(file);
      }
    });
    pump();
  });
  pending.set(file, p);
  return p;
}

module.exports = { login, latest, web, image };
