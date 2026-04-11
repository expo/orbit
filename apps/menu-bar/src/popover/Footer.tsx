import { memo } from 'react';
import { StyleSheet } from 'react-native';

import Item from './Item';
import { Divider, Text, View } from '../components';
import MenuBarModule from '../modules/MenuBarModule';
import { WindowsNavigator } from '../windows';

export const FOOTER_HEIGHT = 62;

const Footer = () => {
  return (
    <View style={styles.container} testID="popover-footer">
      <View px="medium">
        <Divider />
      </View>
      <View py="tiny" pb="1.5">
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
