export const PROTECTED_PROCESS_NAMES = new Set([
  'system',
  'registry',
  'smss',
  'csrss',
  'wininit',
  'winlogon',
  'services',
  'lsass',
  'lsaiso',
  'svchost',
  'dwm',
  'explorer',
  'fontdrvhost',
  'sihost',
  'ctfmon',
  'audiodg',
  'conhost',
  'dllhost',
  'runtimebroker',
  'searchhost',
  'searchindexer',
  'startmenuexperiencehost',
  'shellexperiencehost',
  'textinputhost',
  'taskhostw',
  'spoolsv',
  'wudfhost',
  'securityhealthservice',
  'msmpeng',
  'nissrv',
  'memcompression',
  'secure system',
  'system idle process',
  'ps5emushell',
  'playdeck',
  'electron',
  'node',
  'tasklist',
  'taskkill',
  'powershell',
]);

export const TASKLIST_MAX_BUFFER_BYTES = 1 << 24;
export const OPTIMIZE_SETTLE_MS = 800;
export const BYTES_PER_MEGABYTE = 1048576;
export const KILOBYTES_PER_MEGABYTE = 1024;
export const MIN_TRIMMABLE_PID = 4;

export const PROCESS_SET_QUOTA = 0x0100;
export const PROCESS_QUERY_LIMITED_INFORMATION = 0x1000;
export const MAX_ENUMERATED_PROCESSES = 4096;
export const PROCESS_PATH_BUFFER_LENGTH = 1024;

export const BATTERY_FLAG_NO_BATTERY = 128;
export const BATTERY_FLAG_UNKNOWN = 255;
export const AC_LINE_ONLINE = 1;
export const MAX_BATTERY_PERCENT = 100;

export const PERF_SAMPLE_MS = 1000;
export const PERF_TOP_PROCESSES_MS = 3000;
export const PERF_TOP_PROCESS_COUNT = 6;
export const PERF_COUNTER_SCRIPT = `
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
