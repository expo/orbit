import { FluentProvider, webLightTheme, Theme } from '@fluentui/react-components';
import React from 'react';

export const lightTheme: Theme = {
  ...webLightTheme,
  colorNeutralBackground1: 'var(--orbit-window-background)',
};

export const withFluentProvider = <P extends object>(WrappedComponent: React.ComponentType<P>) => {
  const WithFluentProvider = (props: P) => {
    return (
      <FluentProvider theme={lightTheme} style={{ display: 'flex' }}>
        <WrappedComponent {...props} />
      </FluentProvider>
    );
  };

  return WithFluentProvider;
};
