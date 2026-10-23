// "Otimizar memória": fecha programas de uma lista editável e compacta a memória dos demais.
const os = require('os');
const { execFile } = require('child_process');

// Processos do Windows e do próprio launcher nunca são fechados, mesmo que estejam na lista.
const PROTECTED = new Set([
  'system', 'registry', 'smss', 'csrss', 'wininit', 'winlogon', 'services', 'lsass', 'lsaiso', 'svchost',
  'dwm', 'explorer', 'fontdrvhost', 'sihost', 'ctfmon', 'audiodg', 'conhost', 'dllhost', 'runtimebroker',
  'searchhost', 'searchindexer', 'startmenuexperiencehost', 'shellexperiencehost', 'textinputhost',
  'taskhostw', 'spoolsv', 'wudfhost', 'securityhealthservice', 'msmpeng', 'nissrv', 'memcompression',
  'secure system', 'system idle process', 'playdeck', 'electron', 'node', 'tasklist', 'taskkill', 'powershell',
]);

function tasklist() {
  return new Promise((resolve) => {
    execFile('tasklist', ['/fo', 'csv', '/nh'], { windowsHide: true, maxBuffer: 1 << 24 }, (err, out) => {
      if (err) return resolve([]);
      const rows = [];
      for (const line of out.split(/\r?\n/)) {
        const cols = line.match(/"([^"]*)"/g);
        if (!cols || cols.length < 5) continue;
        const [image, pid, , , mem] = cols.map((c) => c.slice(1, -1));
        rows.push({
          image,
          name: image.toLowerCase().replace(/\.exe$/, ''),
          pid: +pid,
          // "123.456 K" / "123,456 K" conforme o idioma do Windows
          memKB: +mem.replace(/[^\d]/g, '') || 0,
        });
      }
      resolve(rows);
    });
  });
}

// Entradas da lista sem ".exe"; "*" funciona como coringa (ex.: "adobe*").
function matcher(list) {
  const res = (list || [])
    .map((s) => String(s).trim().toLowerCase().replace(/\.exe$/, ''))
    .filter(Boolean)
    .map((s) => new RegExp('^' + s.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$'));
  return (name) => res.some((re) => re.test(name));
}

function targets(procs, killList, protectPids) {
  const match = matcher(killList);
  const skip = new Set([process.pid, process.ppid, ...protectPids]);
  return procs.filter((p) => !PROTECTED.has(p.name) && !skip.has(p.pid) && match(p.name));
}

function groupByName(procs) {
  const map = new Map();
  for (const p of procs) {
    const g = map.get(p.name) || { name: p.name, image: p.image, count: 0, memMB: 0 };
    g.count++;
    g.memMB += p.memKB / 1024;
    map.set(p.name, g);
  }
  return [...map.values()].map((g) => ({ ...g, memMB: Math.round(g.memMB) })).sort((a, b) => b.memMB - a.memMB);
}

async function preview(killList, protectPids = []) {
  return groupByName(targets(await tasklist(), killList, protectPids));
}

// Compacta o working set de cada processo acessível (o Windows devolve a RAM ociosa para a lista livre).
let trimApi = null;
function trimAll(procs) {
  try {
    if (!trimApi) {
      const koffi = require('koffi');
      const k32 = koffi.load('kernel32.dll');
      const HANDLE = koffi.pointer('PD_HANDLE', koffi.opaque());
      trimApi = {
        open: k32.func('__stdcall', 'OpenProcess', HANDLE, ['uint32', 'int', 'uint32']),
        empty: k32.func('__stdcall', 'K32EmptyWorkingSet', 'int', [HANDLE]),
        close: k32.func('__stdcall', 'CloseHandle', 'int', [HANDLE]),
      };
    }
  } catch {
    return 0;
  }
  const PROCESS_SET_QUOTA = 0x0100;
  const PROCESS_QUERY_LIMITED_INFORMATION = 0x1000;
  let n = 0;
  for (const p of procs) {
    if (p.pid <= 4) continue;
    const h = trimApi.open(PROCESS_SET_QUOTA | PROCESS_QUERY_LIMITED_INFORMATION, 0, p.pid);
    if (!h) continue;
    if (trimApi.empty(h)) n++;
    trimApi.close(h);
  }
  return n;
}

function taskkill(pids) {
  return new Promise((resolve) => {
    if (!pids.length) return resolve();
    const args = [];
    for (const pid of pids) args.push('/PID', String(pid));
    execFile('taskkill', [...args, '/T', '/F'], { windowsHide: true }, () => resolve());
  });
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function run(names, { trim = true, protectPids = [] } = {}) {
  const before = os.freemem();
  const wanted = new Set((names || []).map((n) => n.toLowerCase()));
  const procs = await tasklist();
  // Reconfirma na hora: só fecha nomes escolhidos na prévia e nunca processos protegidos.
  const kill = targets(procs, [...wanted], protectPids);
  await taskkill(kill.map((p) => p.pid));
  let trimmed = 0;
  if (trim) trimmed = trimAll(await tasklist());
  await wait(800);
  const after = os.freemem();
  return {
    closed: new Set(kill.map((p) => p.name)).size,
    trimmed,
    freedMB: Math.max(0, Math.round((after - before) / 1048576)),
  };
}

module.exports = { tasklist, groupByName, preview, run };
