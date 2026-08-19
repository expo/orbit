import { memo } from 'react';
import { Platform, StyleSheet } from 'react-native';

import Item from './Item';
import { Divider, Text, View } from '../components';
import MenuBarModule from '../modules/MenuBarModule';
import { WindowsNavigator } from '../windows';

export const FOOTER_HEIGHT = Platform.OS === 'macos' ? 86 : 62;

const Footer = () => {
  return (
    <View style={styles.container} testID="popover-footer">
      <View px="medium">
        <Divider />
      </View>
      <View py="tiny" pb="1.5">
        {Platform.OS === 'macos' && (
          <Item
            onPress={() => WindowsNavigator.open('SimulatorCamera')}
            testID="simulator-camera-button">
            <Text>Simulator Camera…</Text>
          </Item>
        )}
        <Item onPress={() => WindowsNavigator.open('Settings')} testID="settings-button">
          <Text>Settings…</Text>
        </Item>
        <Item onPress={MenuBarModule.exitApp} shortcut="⌘ Q" testID="quit-button">
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
