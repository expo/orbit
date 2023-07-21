import {memo} from 'react';
import {TouchableOpacity} from 'react-native';

import MenuBarModule from '../modules/MenuBarModule';
import {Divider, Text, View} from '../components';
import {WindowsNavigator} from '../windows';

const Footer = () => {
  return (
    <View px="medium" pb="medium">
      <Divider />
      <View py="2">
        <TouchableOpacity onPress={() => WindowsNavigator.open('Settings')}>
          <Text>Settings</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={MenuBarModule.exitApp}>
        <Text>Quit</Text>
      </TouchableOpacity>
    </View>
  );
};

export default memo(Footer);
