import { useEffect, useState } from 'react';
import { Alert, StyleSheet, TouchableOpacity } from 'react-native';

import Config from '../api/Config';
import { Checkbox, View, Row, Text, Divider } from '../components';
import Button from '../components/Button';
import PathInput from '../components/PathInput';
import MenuBarModule from '../modules/MenuBarModule';
import {
  UserPreferences,
  getUserPreferences,
  resetStorage,
  saveUserPreferences,
  storage,
} from '../modules/Storage';
import WebAuthenticationSessionModule, {
  WebBrowserResultType,
} from '../modules/WebAuthenticationSessionModule';

const Settings = () => {
  const [hasSessionSecret, setHasSessionSecret] = useState(
    Boolean(storage.getString('sessionSecret'))
  );

  const [userPreferences, setUserPreferences] = useState<UserPreferences>({});
  const [customSdkPathEnabled, setCustomSdkPathEnabled] = useState(false);

  useEffect(() => {
    getUserPreferences().then((value) => {
      setUserPreferences(value);
      setCustomSdkPathEnabled(Boolean(value.customSdkPath));
    });
  }, []);

  const onPressLaunchOnLogin = async (value: boolean) => {
    try {
      await MenuBarModule.setLoginItemEnabled(value);
      setUserPreferences((prev) => {
        const newPreferences = { ...prev, launchOnLogin: value };
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
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      }
    }
  };

  const onPressEmulatorWithoutAudio = async (value: boolean) => {
    setUserPreferences((prev) => {
      const newPreferences = { ...prev, emulatorWithoutAudio: value };
      saveUserPreferences(newPreferences);
      return newPreferences;
    });
  };

  const toggleCustomSdkPath = (value: boolean) => {
    setCustomSdkPathEnabled(value);
    if (!value) {
      setUserPreferences((prev) => {
        const newPreferences = { ...prev, customSdkPath: undefined };
        saveUserPreferences(newPreferences);
        MenuBarModule.setEnvVars({});
        return newPreferences;
      });
    }
  };

  const handleAuthentication = async () => {
    const redirectBase = 'expo-orbit://auth';
    const authSessionURL = `${Config.website.origin}/login?app_redirect_uri=${encodeURIComponent(
      redirectBase
    )}`;
    const result = await WebAuthenticationSessionModule.openAuthSessionAsync(authSessionURL);

    if (result.type === WebBrowserResultType.SUCCESS) {
      const resultURL = new URL(result.url);
      const sessionSecret = resultURL.searchParams.get('session_secret');

      if (!sessionSecret) {
        throw new Error('session_secret is missing in auth redirect query');
      }

      storage.set('sessionSecret', sessionSecret);
      setHasSessionSecret(true);
    }
  };

  const handleLogout = async () => {
    storage.delete('sessionSecret');
    setHasSessionSecret(false);
  };

  return (
    <View flex="1" padding="medium">
      <View flex="1">
        <View padding="2">
          {hasSessionSecret ? (
            <Button title="Logout" onPress={handleLogout} style={styles.button} />
          ) : (
            <Button title="Login" onPress={handleAuthentication} style={styles.button} />
          )}
        </View>
        <Divider mb="tiny" />
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
          onChangeText={(text) => {
            setUserPreferences((prev) => {
              const newPreferences = { ...prev, customSdkPath: text };
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
          <Row gap="2" py="medium">
            <Text weight="medium">Dev mode only</Text>
            <View border="warning" bg="warning" px="0.5">
              <TouchableOpacity onPress={resetStorage}>
                <Text color="warning">Reset storage</Text>
              </TouchableOpacity>
            </View>
          </Row>
        ) : null}
      </View>
      <Divider mb="tiny" />
      <View py="tiny">
        <Text color="secondary" style={styles.about}>
          {`Version: ${MenuBarModule.constants.appVersion} (${MenuBarModule.constants.buildVersion})`}
        </Text>
      </View>
      <Text color="secondary" style={styles.about}>
        Copyright 650 Industries Inc, 2023
      </Text>
    </View>
  );
};

export default Settings;

const styles = StyleSheet.create({
  about: {
    fontSize: 13,
  },
  button: {
    alignSelf: 'flex-start',
  },
});
