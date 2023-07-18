import {useEffect, useState} from 'react';
import {Alert, StyleSheet} from 'react-native';

import MenuBarModule from '../modules/MenuBarModule';
import {Checkbox, View, Row, Text, Divider} from '../components';
import PathInput from '../components/PathInput';
import {
  UserPreferences,
  getUserPreferences,
  saveUserPreferences,
} from '../modules/Storage';

const Settings = () => {
  const [userPreferences, setUserPreferences] = useState<UserPreferences>({});
  const [customSdkPathEnabled, setCustomSdkPathEnabled] = useState(false);

  useEffect(() => {
    getUserPreferences().then(value => {
      setUserPreferences(value);
      setCustomSdkPathEnabled(Boolean(value.customSdkPath));
    });
  }, []);

  const onPressLaunchOnLogin = async (value: boolean) => {
    try {
      await MenuBarModule.setLoginItemEnabled(value);
      setUserPreferences(prev => {
        const newPreferences = {...prev, launchOnLogin: value};
        saveUserPreferences(newPreferences);
        return newPreferences;
      });
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

  const onPressEmulatorWithoutAudio = async (value: boolean) => {
    setUserPreferences(prev => {
      const newPreferences = {...prev, emulatorWithoutAudio: value};
      saveUserPreferences(newPreferences);
      return newPreferences;
    });
  };

  return (
    <View flex="1" px="medium" py="medium">
      <View flex="1">
        <Row mb="3.5" align="center" gap="1">
          <Checkbox
            value={userPreferences.launchOnLogin}
            onValueChange={onPressLaunchOnLogin}
          />
          <Text>Launch on login</Text>
        </Row>
        <Row mb="3.5" align="center" gap="1">
          <Checkbox
            value={userPreferences.emulatorWithoutAudio}
            onValueChange={onPressEmulatorWithoutAudio}
          />
          <Text>Run Android emulator without audio</Text>
        </Row>
        <Row mb="2" align="center" gap="1">
          <Checkbox
            value={customSdkPathEnabled}
            onValueChange={setCustomSdkPathEnabled}
          />
          <Text>Custom Android Sdk Root location</Text>
        </Row>
        <PathInput
          editable={customSdkPathEnabled}
          onChangeText={text => {
            setUserPreferences(prev => ({...prev, customSdkPath: text}));
          }}
          value={userPreferences.customSdkPath}
        />
      </View>
      <Divider mb="tiny" />
      <View py="small">
        <Text color="secondary">
          {`Version: ${MenuBarModule.constants.appVersion} (${MenuBarModule.constants.buildVersion})`}
        </Text>
      </View>
      <Text color="secondary">Copyright 650 Industries Inc, 2023</Text>
    </View>
  );
};

export default Settings;

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 10,
    marginTop: 10,
  },
});
