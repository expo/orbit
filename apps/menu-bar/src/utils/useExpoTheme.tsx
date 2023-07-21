import {lightTheme, darkTheme, palette} from '@expo/styleguide-native';
import * as React from 'react';

import {ThemeProvider, useTheme} from '../providers/ThemeProvider';

export type ExpoTheme = typeof lightTheme;

export function useCurrentTheme(): 'light' | 'dark' {
  const theme = useTheme();
  return theme;
}

export function useExpoTheme(): ExpoTheme {
  const theme = useTheme();

  if (theme === 'dark') {
    return darkTheme;
  }

  return lightTheme;
}

export function useExpoPalette() {
  const theme = useTheme();
  return palette[theme];
}

export const withThemeProvider = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
) => {
  const WithThemeProvider = (props: P) => {
    return (
      <ThemeProvider>
        <WrappedComponent {...props} />
      </ThemeProvider>
    );
  };

  return WithThemeProvider;
};
