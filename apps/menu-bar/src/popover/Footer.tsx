import { memo, useCallback, useEffect } from 'react';
import { Platform, StyleSheet } from 'react-native';

import Item from './Item';
import { Divider, Text, View } from '../components';
import { DeviceEventEmitter } from '../modules/DeviceEventEmitter';
import MenuBarModule from '../modules/MenuBarModule';
import { useListDevices } from '../providers/DevicesProvider';
import { leaveRemoteSessionsAsync } from '../utils/leaveRemoteSessions';
import { WindowsNavigator } from '../windows';

export const FOOTER_HEIGHT = 62;

const Footer = ({ isDevWindow }: { isDevWindow: boolean }) => {
  const { remoteSessions: sessions } = useListDevices();

  // A remote session keeps running, and uses the plan, after Orbit quits. So each way to quit
  // asks first: the Quit row, Command-Q and the Quit item of the menu bar icon.
  const quit = useCallback(
    () =>
      leaveRemoteSessionsAsync({
        label: 'Quit',
        known: sessions,
        action: () => MenuBarModule.exitApp(),
      }),
    [sessions]
  );

  useEffect(() => {
    // The development window has a second footer. Only one of them answers the request.
    if (isDevWindow) {
      return;
    }
    const listener = DeviceEventEmitter.addListener('quitRequested', quit);
    return () => listener.remove();
  }, [quit, isDevWindow]);

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
