import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: ['app/**', 'data/**', 'assets/**', 'coverage/**', 'dist/**', 'node_modules/**'],
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      globals: globals.node,
    },
    linterOptions: {
      noInlineConfig: true,
    },
    rules: {
      'no-var': 'error',
      'prefer-const': 'error',
      eqeqeq: ['error', 'always'],
      'no-unused-vars': 'error',
      'no-shadow': 'error',
      'no-implicit-coercion': 'error',
      'object-shorthand': ['error', 'always'],
    },
  },
  {
    files: ['**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: globals.node,
    },
  },
  {
    files: ['src/renderer/**/*.js'],
    languageOptions: {
      globals: globals.browser,
    },
  },
];
