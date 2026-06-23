import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import jest from 'eslint-plugin-jest';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'lib/**',
      'coverage/**',
      'node_modules/**',
      '__tests__/fixtures/**',
      // Build/test config files — not part of the TS project.
      '*.config.js',
      '*.config.mjs',
      'eslint.config.mjs',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node },
      parserOptions: { project: './tsconfig.json' },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        { allowExpressions: true },
      ],
    },
  },
  {
    files: ['__tests__/**/*.ts'],
    ...jest.configs['flat/recommended'],
    languageOptions: {
      globals: { ...globals.node, ...globals.jest },
    },
    rules: {
      ...jest.configs['flat/recommended'].rules,
      // Test helpers and inline mocks read fine without explicit return types.
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },
);
