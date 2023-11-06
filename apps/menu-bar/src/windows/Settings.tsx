import { darkTheme, lightTheme } from '@expo/styleguide-native';
import React, { Fragment, useEffect, useState } from 'react';
import { Alert, StyleSheet, TouchableOpacity, Switch } from 'react-native';

import { WindowsNavigator } from './index';
import { withApolloProvider } from '../api/ApolloClient';
import Config from '../api/Config';
import { Checkbox, View, Row, Text, Divider } from '../components';
import { Avatar } from '../components/Avatar';
import Button, { getStylesForColor } from '../components/Button';
import PathInput from '../components/PathInput';
import SystemIconView from '../components/SystemIconView';
import { useGetCurrentUserQuery } from '../generated/graphql';
import MenuBarModule from '../modules/MenuBarModule';
import SparkleModule from '../modules/SparkleModule';
import {
  UserPreferences,
  getUserPreferences,
  saveSessionSecret,
  saveUserPreferences,
  storage,
  sessionSecretStorageKey,
  resetApolloStore,
} from '../modules/Storage';
import WebAuthenticationSessionModule, {
  WebBrowserResultType,
} from '../modules/WebAuthenticationSessionModule';
import { getCurrentUserDisplayName } from '../utils/helpers';
import { addOpacity } from '../utils/theme';
import { useCurrentTheme } from '../utils/useExpoTheme';

const osList: { label: string; key: keyof UserPreferences }[] = [
  { label: 'Android', key: 'showAndroidEmulators' },
  { label: 'iOS', key: 'showIosSimulators' },
  { label: 'tvOS (experimental)', key: 'showTvosSimulators' },
];

const Settings = () => {
  const theme = useCurrentTheme();
  const [hasSessionSecret, setHasSessionSecret] = useState(
    Boolean(storage.getString(sessionSecretStorageKey))
  );

  useEffect(() => {
    const listener = storage.addOnValueChangedListener((key) => {
      if (key === sessionSecretStorageKey) {
        setHasSessionSecret(Boolean(storage.getString(sessionSecretStorageKey)));
      }
    });

    return listener.remove;
  }, []);

  const [userPreferences, setUserPreferences] = useState<UserPreferences>(getUserPreferences());
  const [customSdkPathEnabled, setCustomSdkPathEnabled] = useState(
    Boolean(getUserPreferences().customSdkPath)
  );
  const [automaticallyChecksForUpdates, setAutomaticallyChecksForUpdates] = useState(false);

  const { data } = useGetCurrentUserQuery({
    fetchPolicy: 'cache-and-network',
    skip: !hasSessionSecret,
  });

  const currentUser = data?.meUserActor;

  useEffect(() => {
    SparkleModule.getAutomaticallyChecksForUpdates().then(setAutomaticallyChecksForUpdates);
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

  const onPressSetAutomaticallyChecksForUpdates = async (value: boolean) => {
    setAutomaticallyChecksForUpdates(value);
    SparkleModule.setAutomaticallyChecksForUpdates(value);
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

  const handleAuthentication = async (type: 'signup' | 'login') => {
    const redirectBase = 'expo-orbit://auth';
    const authSessionURL = `${
      Config.website.origin
    }/${type}?confirm_account=1&app_redirect_uri=${encodeURIComponent(redirectBase)}`;
    const result = await WebAuthenticationSessionModule.openAuthSessionAsync(authSessionURL);

    if (result.type === WebBrowserResultType.SUCCESS) {
      const resultURL = new URL(result.url);
      const sessionSecret = resultURL.searchParams.get('session_secret');

      if (!sessionSecret) {
        throw new Error('session_secret is missing in auth redirect query');
      }

      saveSessionSecret(sessionSecret);
    }
  };

  const handleLogout = () => {
    storage.delete(sessionSecretStorageKey);
    resetApolloStore();
  };

  const toggleOS = async (key: keyof UserPreferences, value: boolean) => {
    const newPreferences = {
      ...userPreferences,
      [key]: value,
    };
    saveUserPreferences(newPreferences);
    setUserPreferences(newPreferences);
  };

  return (
    <View flex="1" px="medium" pb="medium">
      <View flex="1">
        <View mb="2">
          <Text size="medium" weight="semibold">
            Account
          </Text>
          {hasSessionSecret ? (
            <Row>
              {currentUser ? (
                <Row align="center" flex="1" mt="1">
                  <Avatar
                    name={getCurrentUserDisplayName(currentUser)}
                    profilePhoto={currentUser.profilePhoto}
                  />
                  <View mx="2" flex="1">
                    <Text weight="medium" numberOfLines={1}>
                      {getCurrentUserDisplayName(currentUser)}
                    </Text>
                    <Text size="tiny">{currentUser.bestContactEmail}</Text>
                  </View>
                </Row>
              ) : null}

              <Button title="Log Out" onPress={handleLogout} style={styles.button} />
              {__DEV__ ? (
                <TouchableOpacity
                  onPress={() => WindowsNavigator.open('DebugMenu')}
                  style={[styles.debugButton, getStylesForColor('primary', theme)?.touchableStyle]}>
                  <SystemIconView systemIconName="ladybug" />
                </TouchableOpacity>
              ) : null}
            </Row>
          ) : (
            <Row gap="2">
              <Text style={styles.flex} size="tiny">
                Log in or create an account to access your projects, builds and more.
              </Text>
              <Button
                title="Sign Up"
                onPress={() => handleAuthentication('signup')}
                color="primary"
              />
              <Button title="Log In" onPress={() => handleAuthentication('login')} />
              {__DEV__ ? (
                <TouchableOpacity
                  onPress={() => WindowsNavigator.open('DebugMenu')}
                  style={[styles.debugButton, getStylesForColor('primary', theme)?.touchableStyle]}>
                  <SystemIconView systemIconName="ladybug" />
                </TouchableOpacity>
              ) : null}
            </Row>
          )}
        </View>
        <Text size="medium" weight="semibold">
          Preferences
        </Text>
        <Row mb="2" align="center" justify="between">
          <Checkbox
            value={automaticallyChecksForUpdates}
            onValueChange={onPressSetAutomaticallyChecksForUpdates}
            label="Check for updates automatically"
          />
          <Button
            color="primary"
            title="Check for updates"
            onPress={SparkleModule.checkForUpdates}
          />
        </Row>
        <Row mb="3.5" align="center" gap="1">
          <Checkbox
            value={userPreferences.launchOnLogin}
            onValueChange={onPressLaunchOnLogin}
            label="Launch on login"
          />
        </Row>
        <Row mb="3.5" align="center">
          <Checkbox
            value={userPreferences.emulatorWithoutAudio}
            onValueChange={onPressEmulatorWithoutAudio}
            label="Run Android emulator without audio"
          />
        </Row>
        <View mb="3.5">
          <Row mb="2" align="center">
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
        </View>
        <View>
          <Text size="medium" weight="medium">
            Platforms
          </Text>
          <Text size="tiny" color="secondary">
            Only devices for the enabled platforms will be listed in the menu bar
          </Text>
          <View
            mt="1.5"
            rounded="medium"
            style={{
              backgroundColor:
                theme === 'light'
                  ? addOpacity(lightTheme.background.default, 0.6)
                  : addOpacity(darkTheme.background.default, 0.2),
            }}
            border="light"
            px="2">
            {osList.map(({ label, key }, index, list) => (
              <Fragment key={key}>
                <Row align="center" justify="between">
                  <Text size="small" weight="normal">
                    {label}
                  </Text>
                  <Switch
                    value={Boolean(userPreferences[key])}
                    onValueChange={(value) => toggleOS(key, value)}
                    style={styles.switch}
                  />
                </Row>
                {list.length - 1 !== index ? <Divider /> : null}
              </Fragment>
            ))}
          </View>
        </View>
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

export default withApolloProvider(Settings);

const styles = StyleSheet.create({
  about: {
    fontSize: 13,
  },
  button: {
    marginLeft: 'auto',
  },
  flex: {
    flex: 1,
  },
  debugButton: {
    height: 32,
    borderRadius: 8,
    paddingHorizontal: 8,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switch: {
    width: 40,
    height: 40,
  },
});
