import { memo } from 'react';
import { Platform, StyleSheet } from 'react-native';

import Item from './Item';
import { stopRemoteSimulatorAsync } from '../commands/remoteSimulatorAsync';
import { Divider, Text, View } from '../components';
import Alert from '../modules/Alert';
import MenuBarModule from '../modules/MenuBarModule';
import { useListDevices } from '../providers/DevicesProvider';
import { WindowsNavigator } from '../windows';

export const FOOTER_HEIGHT = 62;

const Footer = () => {
  const { remoteSessions: sessions } = useListDevices();

  // An Expo Simulators session keeps running, and uses the plan, after Orbit quits.
  const quit = () => {
    if (!sessions.length) {
      MenuBarModule.exitApp();
      return;
    }
    Alert.alert(
      sessions.length === 1
        ? 'An Expo Simulators session is still running'
        : `${sessions.length} Expo Simulators sessions are still running`,
      'A session keeps running, and uses your Expo plan, until you stop it.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Quit', onPress: () => MenuBarModule.exitApp() },
        {
          text: 'Stop and quit',
          onPress: async () => {
            await Promise.allSettled(sessions.map(({ id }) => stopRemoteSimulatorAsync(id)));
            MenuBarModule.exitApp();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container} testID="popover-footer">
      <View px="medium">
        <Divider />
      </View>
      <View py="tiny" pb="1.5">
        <Item
          onPress={() => WindowsNavigator.open('Settings')}
          shortcut={Platform.OS === 'macos' ? '⌘ ,' : 'Ctrl+,'}
          testID="settings-button">
          <Text>Settings…</Text>
        </Item>
        <Item onPress={quit} shortcut="⌘ Q" testID="quit-button">
          <Text>Quit</Text>
        </Item>
      </View>
    </View>
  );
};

export default memo(Footer);

const styles = StyleSheet.create({
  container: {
    height: FOOTER_HEIGHT,
  },
});
