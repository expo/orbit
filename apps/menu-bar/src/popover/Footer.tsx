import { memo, useCallback, useEffect } from 'react';
import { Platform, StyleSheet } from 'react-native';

import Item from './Item';
import { stopRemoteSimulatorAsync } from '../commands/remoteSimulatorAsync';
import { Divider, Text, View } from '../components';
import Alert from '../modules/Alert';
import { DeviceEventEmitter } from '../modules/DeviceEventEmitter';
import MenuBarModule from '../modules/MenuBarModule';
import { useListDevices } from '../providers/DevicesProvider';
import { WindowsNavigator } from '../windows';

export const FOOTER_HEIGHT = 62;

const Footer = () => {
  const { remoteSessions: sessions } = useListDevices();

  // A remote session keeps running, and uses the plan, after Orbit quits. So each way to quit
  // asks first: the Quit row, Command-Q and the Quit item of the menu bar icon.
  const quit = useCallback(() => {
    if (!sessions.length) {
      MenuBarModule.exitApp();
      return;
    }
    const one = sessions.length === 1;
    Alert.alert(
      one
        ? 'A remote session is still running'
        : `${sessions.length} remote sessions are still running`,
      `${one ? 'It keeps' : 'They keep'} running, and ${one ? 'uses' : 'use'} your Expo plan, until you stop ${one ? 'it' : 'them'}. This includes sessions that you started on expo.dev or with EAS CLI.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Quit', onPress: () => MenuBarModule.exitApp() },
        {
          text: one ? 'Stop session and quit' : 'Stop sessions and quit',
          onPress: async () => {
            await Promise.allSettled(sessions.map(({ id }) => stopRemoteSimulatorAsync(id)));
            MenuBarModule.exitApp();
          },
        },
      ]
    );
  }, [sessions]);

  useEffect(() => {
    const listener = DeviceEventEmitter.addListener('quitRequested', quit);
    return () => listener.remove();
  }, [quit]);

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
        <Item
          onPress={quit}
          shortcut={Platform.OS === 'macos' ? '⌘ Q' : 'Ctrl+Q'}
          testID="quit-button">
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
