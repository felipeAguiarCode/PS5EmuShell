import { execFile } from 'node:child_process';
import { KILOBYTES_PER_MEGABYTE, TASKLIST_MAX_BUFFER_BYTES } from '../constants/system.js';

const QUOTED_COLUMN = /"([^"]*)"/g;
const TASKLIST_COLUMN_COUNT = 5;

export const parseTaskListCsv = (output) =>
  output
    .split(/\r?\n/)
    .map((line) => line.match(QUOTED_COLUMN))
    .filter((columns) => columns && columns.length >= TASKLIST_COLUMN_COUNT)
    .map((columns) => {
      const [image, processId, , , memory] = columns.map((column) => column.slice(1, -1));
      return {
        image,
        name: image.toLowerCase().replace(/\.exe$/, ''),
        pid: Number(processId),
        memKB: Number(memory.replace(/[^\d]/g, '')) || 0,
      };
    });

export const readTaskList = () =>
  new Promise((resolve) => {
    execFile(
      'tasklist',
      ['/fo', 'csv', '/nh'],
      { windowsHide: true, maxBuffer: TASKLIST_MAX_BUFFER_BYTES },
      (error, output) => resolve(error ? [] : parseTaskListCsv(output)),
    );
  });

export const groupProcessesByName = (processes) => {
  const groups = new Map();
  for (const processInfo of processes) {
    const group = groups.get(processInfo.name) ?? {
      name: processInfo.name,
      image: processInfo.image,
      count: 0,
      memMB: 0,
    };
    groups.set(processInfo.name, {
      ...group,
      count: group.count + 1,
      memMB: group.memMB + processInfo.memKB / KILOBYTES_PER_MEGABYTE,
    });
  }
  return [...groups.values()]
    .map((group) => ({ ...group, memMB: Math.round(group.memMB) }))
    .sort((firstGroup, secondGroup) => secondGroup.memMB - firstGroup.memMB);
};
