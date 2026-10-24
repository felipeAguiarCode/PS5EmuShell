import { spawn } from 'node:child_process';
import os from 'node:os';
import {
  PERF_COUNTER_SCRIPT,
  PERF_SAMPLE_MS,
  PERF_TOP_PROCESSES_MS,
  PERF_TOP_PROCESS_COUNT,
} from '../constants/system.js';
import { groupProcessesByName, readTaskList } from './task-list.js';

const PERCENT_MAX = 100;

let sampleTimer = null;
let topProcessesTimer = null;
let counterProcess = null;
let previousCpuTimes = null;
let gpuCounters = null;
let gpuInfo = null;
let topProcesses = [];

const readCpuTimes = () =>
  os.cpus().map(({ times }) => ({
    idle: times.idle,
    total: times.user + times.nice + times.sys + times.idle + times.irq,
  }));

export const calculateCpuUsagePercents = (previousTimes, currentTimes) =>
  previousTimes
    ? currentTimes.map((current, index) => {
        const totalDelta = current.total - previousTimes[index].total;
        if (totalDelta <= 0) return 0;
        return Math.round(
          PERCENT_MAX * (1 - (current.idle - previousTimes[index].idle) / totalDelta),
        );
      })
    : [];

const sampleCpuUsage = () => {
  const currentTimes = readCpuTimes();
  const usage = calculateCpuUsagePercents(previousCpuTimes, currentTimes);
  previousCpuTimes = currentTimes;
  return usage;
};

const refreshTopProcesses = async () => {
  topProcesses = groupProcessesByName(await readTaskList()).slice(0, PERF_TOP_PROCESS_COUNT);
};

const handleCounterLine = (line) => {
  try {
    const sample = JSON.parse(line);
    if (sample.info) gpuInfo = sample.info;
    else gpuCounters = sample;
  } catch {
    return;
  }
};

const startCounterProcess = () => {
  counterProcess = spawn(
    'powershell.exe',
    [
      '-NoProfile',
      '-NonInteractive',
      '-EncodedCommand',
      Buffer.from(PERF_COUNTER_SCRIPT, 'utf16le').toString('base64'),
    ],
    { windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] },
  );
  let pendingOutput = '';
  counterProcess.stdout.on('data', (chunk) => {
    pendingOutput += chunk.toString();
    const lines = pendingOutput.split('\n');
    pendingOutput = lines.pop();
    for (const line of lines) handleCounterLine(line.trim());
  });
  counterProcess.on('exit', () => {
    counterProcess = null;
  });
};

const buildPerfSample = (cpuModel) => {
  const perCoreUsage = sampleCpuUsage();
  const totalUsage = perCoreUsage.length
    ? Math.round(perCoreUsage.reduce((sum, usage) => sum + usage, 0) / perCoreUsage.length)
    : 0;
  return {
    cpu: { total: totalUsage, per: perCoreUsage, model: cpuModel },
    ram: { total: os.totalmem(), used: os.totalmem() - os.freemem() },
    gpu: gpuCounters && {
      load: Math.min(PERCENT_MAX, Math.round(gpuCounters.gpu)),
      dedicated: gpuCounters.ded,
      shared: gpuCounters.shared,
      disk: Math.min(PERCENT_MAX, Math.round(gpuCounters.disk)),
    },
    gpuInfo,
    top: topProcesses,
  };
};

export const startPerfMonitor = (sendToRenderer) => {
  if (sampleTimer) return;
  previousCpuTimes = null;
  gpuCounters = null;
  sampleCpuUsage();
  startCounterProcess();
  refreshTopProcesses();
  topProcessesTimer = setInterval(refreshTopProcesses, PERF_TOP_PROCESSES_MS);
  const cpuModel = (os.cpus()[0]?.model ?? '').trim();
  sampleTimer = setInterval(
    () => sendToRenderer('perf', buildPerfSample(cpuModel)),
    PERF_SAMPLE_MS,
  );
};

export const stopPerfMonitor = () => {
  clearInterval(sampleTimer);
  clearInterval(topProcessesTimer);
  sampleTimer = null;
  topProcessesTimer = null;
  if (!counterProcess) return;
  counterProcess.kill();
  counterProcess = null;
};
