import {memo} from 'react';

import MenuBarModule from '../modules/MenuBarModule';
import {Divider, Text, View} from '../components';
import {WindowsNavigator} from '../windows';
import Item from './Item';

const Footer = () => {
  return (
    <>
      <View px="medium">
        <Divider />
      </View>
      <View py="tiny">
        <Item onPress={() => WindowsNavigator.open('Settings')}>
          <Text>Settings</Text>
        </Item>
        <Item onPress={MenuBarModule.exitApp}>
          <Text>Quit</Text>
        </Item>
      </View>
    </>
  );
};

export default memo(Footer);
