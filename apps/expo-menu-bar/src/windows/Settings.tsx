import {useEffect, useState} from 'react';
import {Alert, StyleSheet, Switch, Text, View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import MenuBarModule from '../modules/MenuBarModule';

const launchOnLoginStorageKey = 'launch-on-login';

const Settings = () => {
  const [launchOnLogin, setLaunchOnLogin] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(launchOnLoginStorageKey).then(value => {
      setLaunchOnLogin(value === 'true');
    });
  }, []);

  const onPressLaunchOnLogin = async (value: boolean) => {
    try {
      await MenuBarModule.setLoginItemEnabled(value);
      setLaunchOnLogin(value);
      AsyncStorage.setItem(launchOnLoginStorageKey, String(value));
    } catch (error: any) {
      if (error.code === 'AUTO_LAUNCHER_ERROR') {
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
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.item}>
        <Text>Launch on login</Text>
        <Switch value={launchOnLogin} onValueChange={onPressLaunchOnLogin} />
      </View>
      <View style={styles.footerContainer}>
        <Text>
          Version: {MenuBarModule.constants.appVersion} (
          {MenuBarModule.constants.buildVersion})
        </Text>
        <Text style={styles.footerText}>
          Copyright © 2023 650 Industries, Inc. All rights reserved.
        </Text>
      </View>
    </View>
  );
};

export default Settings;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerContainer: {marginTop: 'auto', alignItems: 'center'},
  footerText: {
    fontSize: 10,
    marginTop: 10,
  },
});
