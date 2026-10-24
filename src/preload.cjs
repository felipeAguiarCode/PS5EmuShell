const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  on: (channel, listener) => {
    const handleMessage = (_event, payload) => listener(payload);
    ipcRenderer.on(channel, handleMessage);
    return () => ipcRenderer.removeListener(channel, handleMessage);
  },
});
