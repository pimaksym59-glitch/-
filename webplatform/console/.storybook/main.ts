import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import tsconfigPaths from 'vite-tsconfig-paths';
import react from '@vitejs/plugin-react';
import type { StorybookConfig } from '@storybook/react-vite';

const here = dirname(fileURLToPath(import.meta.url));

/**
 * Storybook on the **Vite** builder (FS2 / T-FS2.0, closes FE-RV-1).
 * FS1 used `@storybook/nextjs`, whose webpack instance conflicts with Next 15's
 * bundled webpack (`Compiler.close` hook mismatch). Vite is already present for
 * Vitest, so this removes a whole bundler from the toolchain rather than
 * patching around it (FS1 postmortem §8.4).
 *
 * Next-only modules are aliased to tiny local stubs so navigation components
 * can be rendered in isolation without a Next runtime.
 */
const config: StorybookConfig = {
  framework: { name: '@storybook/react-vite', options: {} },
  stories: ['../src/**/*.stories.@(ts|tsx|mdx)'],
  addons: ['@storybook/addon-essentials', '@storybook/addon-a11y', '@storybook/addon-themes'],
  staticDirs: ['../public'],
  core: { disableTelemetry: true },
  typescript: { reactDocgen: 'react-docgen' },
  viteFinal: (config) => ({
    ...config,
    // FE-RV-6 diagnostic: @storybook/addon-docs (bundled in addon-essentials)
    // leaves the shared React plugin in classic-JSX mode, which emits bare
    // React.createElement(...) calls with no React import in first-party
    // .tsx source (this project relies on the automatic runtime everywhere
    // and never imports React explicitly) — "ReferenceError: React is not
    // defined" at render time. Strip whatever react-babel/react-refresh
    // plugin instance is already present and re-add our own, pinned to the
    // automatic runtime, so it wins regardless of what addon-docs configured.
    plugins: [
      ...(config.plugins ?? [])
        .flat()
        .filter((plugin) => !['vite:react-babel', 'vite:react-refresh'].includes(plugin?.name)),
      ...react({ jsxRuntime: 'automatic' }),
      tsconfigPaths(),
    ],
    resolve: {
      ...config.resolve,
      alias: {
        ...config.resolve?.alias,
        'next/link': join(here, 'mocks/next-link.tsx'),
        'next/navigation': join(here, 'mocks/next-navigation.ts'),
      },
    },
    // Storybook serves from .storybook; allow importing app sources above it.
    server: { ...config.server, fs: { allow: [resolve(here, '..')] } },
  }),
};

export default config;
