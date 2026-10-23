// Monitor de recursos (CPU, RAM, GPU, memória de vídeo, disco, top processos).
// Só mede entre start() e stop(): é ligado pela aba Otimização e desligado ao sair dela.
const os = require('os');
const { spawn } = require('child_process');
const { tasklist, groupByName } = require('./optimize');

// GPU/VRAM/disco vêm dos contadores de desempenho do Windows, lidos por um PowerShell filho.
const PS_SCRIPT = `
$ErrorActionPreference = 'SilentlyContinue'
$v = Get-CimInstance Win32_VideoController | Select-Object -First 1
[Console]::Out.WriteLine((@{ info = @{ name = $v.Name; vram = [double]$v.AdapterRAM } } | ConvertTo-Json -Compress))
$c = '\\GPU Engine(*engtype_3D)\\Utilization Percentage', '\\GPU Adapter Memory(*)\\Dedicated Usage', '\\GPU Adapter Memory(*)\\Shared Usage', '\\PhysicalDisk(_Total)\\% Disk Time'
while ($true) {
  $s = (Get-Counter -Counter $c -ErrorAction SilentlyContinue).CounterSamples
  $sum = { param($p) [double](($s | Where-Object { $_.Path -like $p } | Measure-Object CookedValue -Sum).Sum) }
  $o = @{ gpu = (& $sum '*engtype_3d*'); ded = (& $sum '*dedicated usage'); shared = (& $sum '*shared usage'); disk = (& $sum '*% disk time') }
  [Console]::Out.WriteLine(($o | ConvertTo-Json -Compress))
}`;

let timer = null;
let procTimer = null;
let ps = null;
let prevCpu = null;
let gpu = null;
let gpuInfo = null;
let top = [];

function cpuSample() {
  const cur = os.cpus().map(({ times: t }) => ({ idle: t.idle, total: t.user + t.nice + t.sys + t.idle + t.irq }));
  const per = prevCpu
    ? cur.map((c, i) => {
        const dt = c.total - prevCpu[i].total;
        return dt > 0 ? Math.round(100 * (1 - (c.idle - prevCpu[i].idle) / dt)) : 0;
      })
    : [];
  prevCpu = cur;
  return per;
}

async function refreshTop() {
  top = groupByName(await tasklist()).slice(0, 6);
}

function startCounters() {
  ps = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(PS_SCRIPT, 'utf16le').toString('base64')], {
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  let buf = '';
  ps.stdout.on('data', (chunk) => {
    buf += chunk.toString();
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      try {
        const d = JSON.parse(line);
        if (d.info) gpuInfo = d.info;
        else gpu = d;
      } catch {}
    }
  });
  ps.on('exit', () => (ps = null));
}

function start(send) {
  if (timer) return;
  prevCpu = null;
  gpu = null;
  cpuSample();
  startCounters();
  refreshTop();
  procTimer = setInterval(refreshTop, 3000);
  const model = (os.cpus()[0] || {}).model || '';
  timer = setInterval(() => {
    const per = cpuSample();
    const total = per.length ? Math.round(per.reduce((a, b) => a + b, 0) / per.length) : 0;
    send('perf', {
      cpu: { total, per, model: model.trim() },
      ram: { total: os.totalmem(), used: os.totalmem() - os.freemem() },
      gpu: gpu && {
        load: Math.min(100, Math.round(gpu.gpu)),
        dedicated: gpu.ded,
        shared: gpu.shared,
        disk: Math.min(100, Math.round(gpu.disk)),
      },
      gpuInfo,
      top,
    });
  }, 1000);
}

function stop() {
  clearInterval(timer);
  clearInterval(procTimer);
  timer = null;
  procTimer = null;
  if (ps) {
    ps.kill();
    ps = null;
  }
}

module.exports = { start, stop, isRunning: () => !!timer };
