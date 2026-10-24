const listenersByEvent = new Map();

export const onEvent = (eventName, listener) => {
  const listeners = listenersByEvent.get(eventName) ?? new Set();
  listeners.add(listener);
  listenersByEvent.set(eventName, listeners);
  return () => listeners.delete(listener);
};

export const emitEvent = (eventName, payload) => {
  for (const listener of listenersByEvent.get(eventName) ?? []) listener(payload);
};
