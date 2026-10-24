import { DEFAULT_ROM_ARGUMENT } from '../constants/emulators.js';

const PLACEHOLDER = /\{(\w+)\}/g;
const WHITESPACE = /\s/;

export const tokenizeArguments = (template) => {
  const tokens = [];
  let currentToken = '';
  let isQuoted = false;
  let hasToken = false;
  for (const character of template) {
    if (character === '"') {
      isQuoted = !isQuoted;
      hasToken = true;
    } else if (WHITESPACE.test(character) && !isQuoted) {
      if (currentToken || hasToken) tokens.push(currentToken);
      currentToken = '';
      hasToken = false;
    } else {
      currentToken += character;
    }
  }
  if (currentToken || hasToken) tokens.push(currentToken);
  return tokens;
};

export const buildEmulatorArguments = (template, values) =>
  tokenizeArguments(template || DEFAULT_ROM_ARGUMENT).map((token) =>
    token.replace(PLACEHOLDER, (placeholder, name) =>
      name in values ? values[name] : placeholder,
    ),
  );
