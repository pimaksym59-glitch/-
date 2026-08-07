// Flat ESLint config — FS1 engineering gate #1 (Stage 2 §14.1).
// typescript-eslint strict + stylistic, jsx-a11y, react-hooks, Next core-web-vitals.
// FSD layer/import-boundary enforcement lives in dependency-cruiser (gate #8).
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import nextPlugin from '@next/eslint-plugin-next';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'storybook-static/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'next-env.d.ts',
      'public/mockServiceWorker.js',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      'jsx-a11y': jsxA11y,
      'react-hooks': reactHooks,
      '@next/next': nextPlugin,
    },
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      // Type-safety gate (§F3.6, §F6.2): zero unjustified `any`.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Console discipline (D2/backend parity): only warn/error channels.
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  // Config, tooling and test files may use Node globals and looser rules.
  {
    files: [
      '**/*.config.{js,mjs,cjs,ts}',
      '.storybook/**',
      'scripts/**',
      'tests/**',
      '**/*.test.{ts,tsx}',
      '**/*.stories.{ts,tsx}',
    ],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      // Story/test handlers are intentional no-ops (`onRetry: () => {}`).
      '@typescript-eslint/no-empty-function': 'off',
    },
  },
);
