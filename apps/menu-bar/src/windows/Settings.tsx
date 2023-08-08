import {useEffect, useState} from 'react';
import {Alert, TouchableOpacity} from 'react-native';

import MenuBarModule from '../modules/MenuBarModule';
import {Checkbox, View, Row, Text, Divider} from '../components';
import PathInput from '../components/PathInput';
import {
  UserPreferences,
  getUserPreferences,
  resetStorage,
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

  const toggleCustomSdkPath = (value: boolean) => {
    setCustomSdkPathEnabled(value);
    if (!value) {
      setUserPreferences(prev => {
        const newPreferences = {...prev, customSdkPath: undefined};
        saveUserPreferences(newPreferences);
        MenuBarModule.setEnvVars({});
        return newPreferences;
      });
    }
  };

  return (
    <View flex="1" padding="medium">
      <View flex="1">
        <Row mb="3.5" align="center" gap="1">
          <Checkbox
            value={userPreferences.launchOnLogin}
            onValueChange={onPressLaunchOnLogin}
            label="Launch on login"
          />
        </Row>
        <Row mb="3.5" align="center" gap="1">
          <Checkbox
            value={userPreferences.emulatorWithoutAudio}
            onValueChange={onPressEmulatorWithoutAudio}
            label="Run Android emulator without audio"
          />
        </Row>
        <Row mb="2" align="center" gap="1">
          <Checkbox
            value={customSdkPathEnabled}
            onValueChange={toggleCustomSdkPath}
            label="Custom Android SDK root location"
          />
        </Row>
        <PathInput
          editable={customSdkPathEnabled}
          onChangeText={text => {
            setUserPreferences(prev => {
              const newPreferences = {...prev, customSdkPath: text};
              saveUserPreferences(newPreferences);
              MenuBarModule.setEnvVars({
                ANDROID_HOME: text,
              });
              return newPreferences;
            });
          }}
          value={userPreferences.customSdkPath}
        />
        {__DEV__ ? (
          <View py="medium">
            <Text weight="medium">Dev mode only</Text>
            <View border="warning" bg="warning" padding="tiny">
              <TouchableOpacity onPress={resetStorage}>
                <Text>Reset storage</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </View>
      <Divider mb="tiny" />
      <View py="tiny">
        <Text color="secondary">
          {`Version: ${MenuBarModule.constants.appVersion} (${MenuBarModule.constants.buildVersion})`}
        </Text>
      </View>
      <Text color="secondary">Copyright 650 Industries Inc, 2023</Text>
    </View>
  );
};

export default Settings;
