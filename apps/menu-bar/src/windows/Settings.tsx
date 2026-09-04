import { Bug16Filled } from '@fluentui/react-icons';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, TouchableOpacity } from 'react-native';

import { SettingsPane, hairline, panes, useSettingsPane } from './SettingsPanes';
import { WindowsNavigator } from './index';
import { withApolloProvider } from '../api/ApolloClient';
import { Row, Text, View } from '../components';
import MenuBarModule from '../modules/MenuBarModule';
import { useCurrentTheme, useExpoTheme } from '../utils/useExpoTheme';

const Settings = () => {
  const theme = useCurrentTheme();
  const expoTheme = useExpoTheme();
  const [pane, setPane] = useSettingsPane();

  const sidebarStyle = {
    backgroundColor: theme === 'light' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)',
    borderRightColor: hairline,
  };
  const selectedNavStyle = {
    backgroundColor: theme === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)',
  };

  return (
    <Row flex="1" testID="settings-window">
      <View style={[styles.sidebar, sidebarStyle]}>
        {panes.map(({ key, label, symbol, fallback }) => {
          const selected = pane === key;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => setPane(key)}
              style={[styles.navItem, selected && selectedNavStyle]}>
              <SymbolView
                name={symbol}
                size={16}
                tintColor={selected ? expoTheme.text.default : expoTheme.text.secondary}
                fallback={fallback}
                style={styles.navIcon}
              />
              <Text size="small" color={selected ? 'default' : 'secondary'}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
        <View flex="1" />
        <Row align="center" justify="between" px="2.5">
          <Text size="tiny" color="secondary" type="mono">
            Expo Orbit {MenuBarModule.appVersion}
          </Text>
          <TouchableOpacity
            onPress={() => WindowsNavigator.open('DebugMenu')}
            style={styles.debugButton}>
            <SymbolView
              name="ladybug"
              size={14}
              tintColor={expoTheme.text.secondary}
              fallback={<Bug16Filled />}
            />
          </TouchableOpacity>
        </Row>
      </View>
      <SettingsPane pane={pane} />
    </Row>
  );
};

export default withApolloProvider(Settings);

const styles = StyleSheet.create({
  sidebar: {
    width: 200,
    paddingTop: 14,
    paddingBottom: 14,
    paddingHorizontal: 10,
    gap: 2,
    borderRightWidth: 1,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  navIcon: {
    width: 16,
    height: 16,
    opacity: 0.75,
  },
  debugButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
