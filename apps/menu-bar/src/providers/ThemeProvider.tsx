import React from 'react';
import { useColorScheme } from 'react-native';

type ThemePreference = 'light' | 'dark' | 'no-preference';
type Theme = 'light' | 'dark';

const ThemeContext = React.createContext<Theme>('light');
export const useTheme = () => React.useContext(ThemeContext);

type ThemeProviderProps = {
  children: React.ReactNode;
  themePreference?: ThemePreference;
};

export function ThemeProvider({ children, themePreference = 'no-preference' }: ThemeProviderProps) {
  const systemTheme = useColorScheme();

  const theme = React.useMemo(() => {
    if (themePreference !== 'no-preference') {
      return themePreference;
    }

    return systemTheme ?? 'light';
  }, [themePreference, systemTheme]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}
