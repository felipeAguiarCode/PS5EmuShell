const handlers = new Map();

export const registerCommands = (commandHandlers) => {
  for (const [name, handler] of Object.entries(commandHandlers)) handlers.set(name, handler);
};

export const hasCommand = (name) => handlers.has(name);

export const runCommand = (name, ...args) => {
  const handler = handlers.get(name);
  if (!handler) throw new Error(`Unknown command: ${name}`);
  return handler(...args);
};

export const listCommandNames = () => [...handlers.keys()];
