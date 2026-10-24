import koffi from 'koffi';
import {
  MAX_ENUMERATED_PROCESSES,
  PROCESS_PATH_BUFFER_LENGTH,
  PROCESS_QUERY_LIMITED_INFORMATION,
  PROCESS_SET_QUOTA,
} from '../constants/system.js';

const UINT32_BYTES = 4;
let processFunctions = null;

const bindEnumProcesses = (psapi, kernel32) => {
  try {
    return psapi.func('__stdcall', 'EnumProcesses', 'bool', [
      '_Out_ uint32 *',
      'uint32',
      '_Out_ uint32 *',
    ]);
  } catch {
    return kernel32.func('__stdcall', 'K32EnumProcesses', 'bool', [
      '_Out_ uint32 *',
      'uint32',
      '_Out_ uint32 *',
    ]);
  }
};

const loadPsapi = (kernel32) => {
  try {
    return koffi.load('psapi.dll');
  } catch {
    return kernel32;
  }
};

const bindProcessFunctions = () => {
  if (processFunctions) return processFunctions;
  const kernel32 = koffi.load('kernel32.dll');
  const processHandle = koffi.pointer('PD_PROCESS_HANDLE', koffi.opaque());
  processFunctions = {
    enumProcesses: bindEnumProcesses(loadPsapi(kernel32), kernel32),
    openProcess: kernel32.func('__stdcall', 'OpenProcess', processHandle, [
      'uint32',
      'bool',
      'uint32',
    ]),
    queryFullProcessImageName: kernel32.func('__stdcall', 'QueryFullProcessImageNameW', 'bool', [
      processHandle,
      'uint32',
      '_Out_ uint16 *',
      '_Inout_ uint32 *',
    ]),
    emptyWorkingSet: kernel32.func('__stdcall', 'K32EmptyWorkingSet', 'int', [processHandle]),
    closeHandle: kernel32.func('__stdcall', 'CloseHandle', 'bool', [processHandle]),
  };
  return processFunctions;
};

const listProcessIds = (functions) => {
  const processIds = new Uint32Array(MAX_ENUMERATED_PROCESSES);
  const neededBytes = [0];
  if (!functions.enumProcesses(processIds, processIds.byteLength, neededBytes)) return [];
  return [...processIds.subarray(0, neededBytes[0] / UINT32_BYTES)].filter(Boolean);
};

const readProcessImagePath = (functions, processId) => {
  const handle = functions.openProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, processId);
  if (!handle) return null;
  const nameBuffer = new Uint16Array(PROCESS_PATH_BUFFER_LENGTH);
  const length = [nameBuffer.length];
  const imagePath = functions.queryFullProcessImageName(handle, 0, nameBuffer, length)
    ? String.fromCharCode(...nameBuffer.subarray(0, length[0]))
    : null;
  functions.closeHandle(handle);
  return imagePath;
};

export const listRunningProcesses = () => {
  try {
    const functions = bindProcessFunctions();
    return listProcessIds(functions)
      .map((processId) => ({ pid: processId, exe: readProcessImagePath(functions, processId) }))
      .filter((processInfo) => processInfo.exe);
  } catch (error) {
    console.error('Failed to list processes', error);
    return [];
  }
};

export const isPathInsideFolder = (filePath, folder) =>
  filePath.toLowerCase().startsWith(`${folder.replace(/[\\/]+$/, '').toLowerCase()}\\`);

export const listProcessesInFolder = (folder) =>
  listRunningProcesses().filter((processInfo) => isPathInsideFolder(processInfo.exe, folder));

export const trimProcessWorkingSets = (processIds, minimumProcessId) => {
  let functions;
  try {
    functions = bindProcessFunctions();
  } catch {
    return 0;
  }
  let trimmedCount = 0;
  for (const processId of processIds) {
    if (processId <= minimumProcessId) continue;
    const handle = functions.openProcess(
      PROCESS_SET_QUOTA | PROCESS_QUERY_LIMITED_INFORMATION,
      false,
      processId,
    );
    if (!handle) continue;
    if (functions.emptyWorkingSet(handle)) trimmedCount += 1;
    functions.closeHandle(handle);
  }
  return trimmedCount;
};
