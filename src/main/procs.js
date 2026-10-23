// Lista os processos em execução a partir de uma pasta (via koffi, sem PowerShell).
// Usado para acompanhar jogos de PC que abrem um "launcher" e depois o executável real.
let api = null;

function load() {
  if (api !== null) return api;
  try {
    const koffi = require('koffi');
    const k32 = koffi.load('kernel32.dll');
    let psapi;
    try {
      psapi = koffi.load('psapi.dll');
    } catch {
      psapi = k32;
    }
    api = {
      koffi,
      enumProcesses: (() => {
        try {
          return psapi.func('__stdcall', 'EnumProcesses', 'bool', ['_Out_ uint32 *', 'uint32', '_Out_ uint32 *']);
        } catch {
          return k32.func('__stdcall', 'K32EnumProcesses', 'bool', ['_Out_ uint32 *', 'uint32', '_Out_ uint32 *']);
        }
      })(),
      openProcess: k32.func('__stdcall', 'OpenProcess', 'void *', ['uint32', 'bool', 'uint32']),
      queryName: k32.func('__stdcall', 'QueryFullProcessImageNameW', 'bool', ['void *', 'uint32', '_Out_ uint16 *', '_Inout_ uint32 *']),
      closeHandle: k32.func('__stdcall', 'CloseHandle', 'bool', ['void *']),
    };
  } catch {
    api = false;
  }
  return api;
}

const PROCESS_QUERY_LIMITED_INFORMATION = 0x1000;

// [{ pid, exe }] de todos os processos acessíveis.
function list() {
  const a = load();
  if (!a) return [];
  const pids = new Uint32Array(4096);
  const needed = [0];
  if (!a.enumProcesses(pids, pids.byteLength, needed)) return [];
  const n = needed[0] / 4;
  const out = [];
  const name = new Uint16Array(1024);
  for (let i = 0; i < n; i++) {
    const pid = pids[i];
    if (!pid) continue;
    const h = a.openProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid);
    if (!h) continue;
    const len = [name.length];
    if (a.queryName(h, 0, name, len)) out.push({ pid, exe: String.fromCharCode(...name.subarray(0, len[0])) });
    a.closeHandle(h);
  }
  return out;
}

// Processos cujo executável está dentro de `dir` (inclusive subpastas).
function inFolder(dir) {
  const prefix = dir.replace(/[\\/]+$/, '').toLowerCase() + '\\';
  return list().filter((p) => p.exe.toLowerCase().startsWith(prefix));
}

module.exports = { list, inFolder };
