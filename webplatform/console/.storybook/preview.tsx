import type { Decorator, Preview } from '@storybook/react';
import { withThemeByDataAttribute } from '@storybook/addon-themes';
import { useEffect } from 'react';
import '../src/app/globals.css';

/** Reflect the density toolbar global onto <html data-density> (D2 §4). */
function DensityLayer({
  density,
  children,
}: {
  density: string;
  children: React.ReactNode;
}): React.ReactElement {
  useEffect(() => {
    document.documentElement.dataset['density'] = density;
  }, [density]);
  return <>{children}</>;
}

const withDensity: Decorator = (Story, context) => (
  <DensityLayer density={(context.globals['density'] as string) ?? 'comfortable'}>
    <Story />
  </DensityLayer>
);

const preview: Preview = {
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    backgrounds: { disable: true },
    a11y: { test: 'todo' },
  },
  globalTypes: {
    density: {
      description: 'ONYX density',
      defaultValue: 'comfortable',
      toolbar: {
        title: 'Density',
        icon: 'component',
        items: ['comfortable', 'compact'],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    withDensity,
    withThemeByDataAttribute({
      themes: { dark: 'dark', light: 'light' },
      defaultTheme: 'dark',
      attributeName: 'data-theme',
    }),
  ],
};

export default preview;
