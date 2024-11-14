import { FluentProvider as ReactFluentProvider } from '@fluentui/react-provider';
import { webLightTheme, webDarkTheme, Theme } from '@fluentui/react-theme';
import { CSSProperties, ComponentType, ReactElement } from 'react';
import { useColorScheme } from 'react-native';

const lightTheme: Theme = {
  ...webLightTheme,
  colorNeutralBackground1: 'var(--orbit-window-background)',
};

const darkTheme: Theme = {
  ...webDarkTheme,
  colorNeutralBackground1: 'var(--orbit-window-background)',
};

export const FluentProvider = ({
  children,
  style,
}: {
  children: ReactElement;
  style?: CSSProperties;
}) => {
  const scheme = useColorScheme();
  const theme = scheme === 'dark' ? darkTheme : lightTheme;

  return (
    <ReactFluentProvider theme={theme} style={style}>
      {children}
    </ReactFluentProvider>
  );
};

export const withFluentProvider = <P extends object>(WrappedComponent: ComponentType<P>) => {
  const WithFluentProvider = (props: P) => {
    return (
      <FluentProvider style={{ display: 'flex', width: '100%' }}>
        <WrappedComponent {...props} />
      </FluentProvider>
    );
  };

  return WithFluentProvider;
};
