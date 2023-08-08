import {memo} from 'react';
import {StyleSheet} from 'react-native';

import MenuBarModule from '../modules/MenuBarModule';
import {Divider, Text, View} from '../components';
import {WindowsNavigator} from '../windows';
import Item from './Item';

export const FOOTER_HEIGHT = 62;

const Footer = () => {
  return (
    <View style={styles.container}>
      <View px="medium">
        <Divider />
      </View>
      <View py="tiny" pb="1.5">
        <Item onPress={() => WindowsNavigator.open('Settings')}>
          <Text>Settings…</Text>
        </Item>
        <Item onPress={MenuBarModule.exitApp} shortcut="⌘ Q">
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
