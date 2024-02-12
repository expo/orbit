import { FluentProvider, webLightTheme, webDarkTheme, Theme } from '@fluentui/react-components';
import React from 'react';
import { useColorScheme } from 'react-native';

const lightTheme: Theme = {
  ...webLightTheme,
  colorNeutralBackground1: 'var(--orbit-window-background)',
};

const darkTheme: Theme = {
  ...webDarkTheme,
  colorNeutralBackground1: 'var(--orbit-window-background)',
};

export const withFluentProvider = <P extends object>(WrappedComponent: React.ComponentType<P>) => {
  const WithFluentProvider = (props: P) => {
    const scheme = useColorScheme();
    const theme = scheme === 'dark' ? darkTheme : lightTheme;

    return (
      <FluentProvider theme={theme} style={{ display: 'flex' }}>
        <WrappedComponent {...props} />
      </FluentProvider>
    );
  };

  return WithFluentProvider;
};
