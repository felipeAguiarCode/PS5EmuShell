import { execFile } from 'node:child_process';
import os from 'node:os';
import {
  BYTES_PER_MEGABYTE,
  MIN_TRIMMABLE_PID,
  OPTIMIZE_SETTLE_MS,
  PROTECTED_PROCESS_NAMES,
} from '../constants/system.js';
import { trimProcessWorkingSets } from './processes.js';
import { groupProcessesByName, readTaskList } from './task-list.js';

const REGEX_SPECIAL_CHARACTERS = /[.+?^${}()|[\]\\]/g;

export const makeProcessNameMatcher = (patterns) => {
  const expressions = (patterns ?? [])
    .map((pattern) =>
      String(pattern)
        .trim()
        .toLowerCase()
        .replace(/\.exe$/, ''),
    )
    .filter(Boolean)
    .map(
      (pattern) =>
        new RegExp(`^${pattern.replace(REGEX_SPECIAL_CHARACTERS, '\\$&').replace(/\*/g, '.*')}$`),
    );
  return (processName) => expressions.some((expression) => expression.test(processName));
};

export const listKillableProcesses = (processes, killList, protectedProcessIds) => {
  const isListed = makeProcessNameMatcher(killList);
  const skippedProcessIds = new Set([process.pid, process.ppid, ...protectedProcessIds]);
  return processes.filter(
    (processInfo) =>
      !PROTECTED_PROCESS_NAMES.has(processInfo.name) &&
      !skippedProcessIds.has(processInfo.pid) &&
      isListed(processInfo.name),
  );
};

export const previewOptimization = async (killList, protectedProcessIds = []) =>
  groupProcessesByName(listKillableProcesses(await readTaskList(), killList, protectedProcessIds));

const killProcesses = (processIds) =>
  new Promise((resolve) => {
    if (!processIds.length) {
      resolve();
      return;
    }
    const processArguments = processIds.flatMap((processId) => ['/PID', String(processId)]);
    execFile('taskkill', [...processArguments, '/T', '/F'], { windowsHide: true }, () => resolve());
  });

const waitMs = (durationMs) => new Promise((resolve) => setTimeout(resolve, durationMs));

export const runOptimization = async (processNames, { trim = true, protectPids = [] } = {}) => {
  const freeBytesBefore = os.freemem();
  const selectedNames = (processNames ?? []).map((name) => name.toLowerCase());
  const killableProcesses = listKillableProcesses(await readTaskList(), selectedNames, protectPids);
  await killProcesses(killableProcesses.map((processInfo) => processInfo.pid));
  const trimmedCount = trim
    ? trimProcessWorkingSets(
        (await readTaskList()).map((processInfo) => processInfo.pid),
        MIN_TRIMMABLE_PID,
      )
    : 0;
  await waitMs(OPTIMIZE_SETTLE_MS);
  return {
    closed: new Set(killableProcesses.map((processInfo) => processInfo.name)).size,
    trimmed: trimmedCount,
    freedMB: Math.max(0, Math.round((os.freemem() - freeBytesBefore) / BYTES_PER_MEGABYTE)),
  };
};
