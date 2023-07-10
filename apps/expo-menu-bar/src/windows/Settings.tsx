import {useState} from 'react';
import {Alert, Switch, Text, View} from 'react-native';

import MenuBarModule from '../modules/MenuBarModule';

const Settings = () => {
  const [launchOnLogin, setLaunchOnLogin] = useState(false);

  const onPressLaunchOnLogin = async (value: boolean) => {
    try {
      await MenuBarModule.setLoginItemEnabled(value);
      setLaunchOnLogin(value);
    } catch (error) {
      Alert.alert(
        'Unable to set launch on login',
        'Make sure Expo Menu Bar is enabled under "Allow in the background" inside System Settings > General > Login Items.',
        [
          {
            text: 'Open Settings',
            onPress: MenuBarModule.openSystemSettingsLoginItems,
          },
          {text: 'Cancel', style: 'cancel'},
        ],
      );
    }
  };

  return (
    <View style={{flex: 1, padding: 10}}>
      <View style={{flexDirection: 'row', alignItems: 'center'}}>
        <Text>Launch on login</Text>
        <Switch value={launchOnLogin} onValueChange={onPressLaunchOnLogin} />
      </View>
      <View style={{marginTop: 'auto', alignItems: 'center'}}>
        <Text>
          Version: {MenuBarModule.constants.appVersion} (
          {MenuBarModule.constants.buildVersion})
        </Text>
        <Text>Copyright © 2023 650 Industries, Inc. All rights reserved.</Text>
      </View>
    </View>
  );
};

export default Settings;
