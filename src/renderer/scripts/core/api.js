export const invokeMain = (channel, ...args) => window.api.invoke(channel, ...args);

export const listenToMain = (channel, listener) => window.api.on(channel, listener);
