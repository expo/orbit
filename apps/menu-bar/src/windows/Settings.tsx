import { darkTheme, lightTheme } from '@expo/styleguide-native';
import { Bug16Filled } from '@fluentui/react-icons';
import { Config } from 'common-types';
import { SymbolView } from 'expo-symbols';
import React, { Fragment, useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, Platform, ScrollView } from 'react-native';

import { WindowsNavigator } from './index';
import AutoUpdater from '../../modules/auto-updater';
import {
  openAuthSessionAsync,
  WebBrowserResultType,
} from '../../modules/web-authentication-session';
import { withApolloProvider } from '../api/ApolloClient';
import {
  APPLE_ID_CHANGED_EVENT,
  clearAppleIdLoginAsync,
  loadAppleId,
} from '../commands/appleAccountAsync';
import { cleanupResignedAppsAsync } from '../commands/cleanupResignedAppsAsync';
import { getTrustedSourcesAsync } from '../commands/getTrustesSourcesAsync';
import { setTrustedSourcesAsync } from '../commands/setTrustedSourcesAsync';
import { Checkbox, View, Row, Text, Divider } from '../components';
import { Avatar } from '../components/Avatar';
import Button, { getStylesForColor } from '../components/Button';
import PathInput from '../components/PathInput';
import { Switch } from '../components/Switch';
import TrustedSourcesInput from '../components/TrustedSourcesInput';
import { useGetCurrentUserQuery } from '../generated/graphql';
import Alert from '../modules/Alert';
import { DeviceEventEmitter } from '../modules/DeviceEventEmitter';
import MenuBarModule from '../modules/MenuBarModule';
import {
  RESIGNED_APPS_CHANGED_EVENT,
  RESIGNED_APPS_RENEW_REQUEST_EVENT,
  ResignedAppRecord,
  listResignedApps,
  removeResignedApp,
  updateResignedApp,
} from '../modules/ResignedApps';
import {
  UserPreferences,
  getUserPreferences,
  saveSessionSecret,
  saveUserPreferences,
  storage,
  sessionSecretStorageKey,
  resetApolloStore,
} from '../modules/Storage';
import { formatProfileExpiry, getCurrentUserDisplayName } from '../utils/helpers';
import { addOpacity } from '../utils/theme';
import { useCurrentTheme } from '../utils/useExpoTheme';

type OsListItem = {
  label: string;
  key: keyof UserPreferences;
  supported: boolean;
  unsupportedMessage?: string;
};
const osList: OsListItem[] = [
  { label: 'Android', key: 'showAndroidEmulators', supported: true },
  { label: 'iOS', key: 'showIosSimulators', supported: true },
  {
    label: 'tvOS',
    key: 'showTvosSimulators',
    supported: Platform.OS === 'macos',
    unsupportedMessage: 'macOS only',
  },
  {
    label: 'watchOS',
    key: 'showWatchosSimulators',
    supported: Platform.OS === 'macos',
    unsupportedMessage: 'macOS only',
  },
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
  const [appleAccountId, setAppleAccountId] = useState<string | null>(loadAppleId());
  const [resignedApps, setResignedApps] = useState<ResignedAppRecord[]>(listResignedApps());

  useEffect(() => {
    // Cross-window: record writes and Apple ID changes (sign-in, sign-out, or an
    // automatic logout on session expiry) can happen in the popover or another
    // window; both broadcast through the main-process DeviceEventEmitter.
    const recordsSub = DeviceEventEmitter.addListener(RESIGNED_APPS_CHANGED_EVENT, () => {
      setResignedApps(listResignedApps());
    });
    const appleIdSub = DeviceEventEmitter.addListener(APPLE_ID_CHANGED_EVENT, () => {
      setAppleAccountId(loadAppleId());
    });
    return () => {
      recordsSub.remove();
      appleIdSub.remove();
    };
  }, []);

  const signOutAppleId = async () => {
    try {
      const signedOut = await clearAppleIdLoginAsync();
      setAppleAccountId(null);
      Alert.alert(
        'Apple ID signed out',
        signedOut
          ? `Signed out ${signedOut}. The next resign will ask you to sign in again.`
          : 'No Apple ID was signed in.'
      );
    } catch (error) {
      Alert.alert('Could not sign out', error instanceof Error ? error.message : String(error));
    }
  };

  const renewRecordNow = (record: ResignedAppRecord) => {
    // The renewal engine lives in the popover's Core (separate renderer on
    // Electron); ask it to renew and bring the popover forward for progress.
    DeviceEventEmitter.emit(RESIGNED_APPS_RENEW_REQUEST_EVENT, { recordId: record.id });
    MenuBarModule.openPopover();
  };

  const removeRecord = (record: ResignedAppRecord) => {
    Alert.alert(
      `Remove ${record.appName}?`,
      'Orbit deletes its stored copies and stops renewing it. The app stays on your ' +
        'device until its profile expires.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'default',
          onPress: () => {
            removeResignedApp(record.id);
            setResignedApps(listResignedApps());
            cleanupResignedAppsAsync().catch(() => {});
          },
        },
      ]
    );
  };

  const toggleRecordAutoRenew = (record: ResignedAppRecord, value: boolean) => {
    updateResignedApp(record.id, { autoRenew: value });
    setResignedApps(listResignedApps());
  };

  const toggleAutoRenewResignedApps = (value: boolean) => {
    setUserPreferences((prev) => {
      const newPreferences = { ...prev, autoRenewResignedApps: value };
      saveUserPreferences(newPreferences);
      return newPreferences;
    });
  };
  const [trustedSourcesEnabled, setTrustedSourcesEnabled] = useState(false);
  const [trustedSources, setTrustedSources] = useState<string>('');
  const [automaticallyChecksForUpdates, setAutomaticallyChecksForUpdates] = useState(false);

  const { data } = useGetCurrentUserQuery({
    fetchPolicy: 'cache-and-network',
    skip: !hasSessionSecret,
  });

  const currentUser = data?.meUserActor;

  useEffect(() => {
    AutoUpdater.getAutomaticallyChecksForUpdates().then(setAutomaticallyChecksForUpdates);
  }, []);

  useEffect(() => {
    getTrustedSourcesAsync().then((trustedSources) => {
      setTrustedSourcesEnabled(Boolean(trustedSources));
      setTrustedSources(trustedSources);
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

  const onPressSetAutomaticallyChecksForUpdates = async (value: boolean) => {
    setAutomaticallyChecksForUpdates(value);
    AutoUpdater.setAutomaticallyChecksForUpdates(value);
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

  const toggleTrustedSources = (value: boolean) => {
    setTrustedSourcesEnabled(value);
    if (!value) {
      setTrustedSourcesAsync('');
    }
  };

  const handleAuthentication = async (type: 'signup' | 'login') => {
    const redirectBase = 'expo-orbit:///auth';
    const authSessionURL = `${
      Config.website.origin
    }/${type}?confirm_account=1&app_redirect_uri=${encodeURIComponent(redirectBase)}`;
    const result = await openAuthSessionAsync(authSessionURL);

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
    saveSessionSecret(undefined);
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

  const groupWrapperStyle = {
    backgroundColor:
      theme === 'light'
        ? addOpacity(lightTheme.background.default, 0.6)
        : addOpacity(darkTheme.background.default, 0.2),
  };

  return (
    <View flex="1" px="medium" pb="medium" testID="settings-window">
      <ScrollView alwaysBounceVertical={false}>
        <View flex="1">
          <View mb="3">
            <Text size="medium" weight="semibold" style={[headerStyle, styles.headerSpacing]}>
              Account
            </Text>
            <Row
              align="center"
              gap="2"
              mt="1.5"
              rounded="medium"
              style={groupWrapperStyle}
              border="light"
              px="2.5"
              pt="1"
              pb="2">
              {hasSessionSecret ? (
                <Row align="center" mt="1" gap="2" flex="1">
                  {currentUser ? (
                    <Row align="center" flex="1">
                      <Avatar profileImageUrl={currentUser.primaryAccountProfileImageUrl} />
                      <View mx="2" flex="1">
                        <Text weight="medium" numberOfLines={1}>
                          {getCurrentUserDisplayName(currentUser)}
                        </Text>
                        <Text size="tiny">{currentUser.bestContactEmail}</Text>
                      </View>
                    </Row>
                  ) : null}
                  <Button title="Log Out" onPress={handleLogout} style={styles.button} />
                </Row>
              ) : (
                <Row align="center" mt="2" mb="1" gap="2" flex="1">
                  <Text style={[styles.flex, { lineHeight: 15 }]} numberOfLines={2} size="tiny">
                    Log in or create an account to access your projects, builds and more.
                  </Text>
                  <TouchableOpacity
                    onPress={() => WindowsNavigator.open('DebugMenu')}
                    style={[
                      styles.debugButton,
                      getStylesForColor('primary', theme)?.touchableStyle,
                    ]}>
                    <SymbolView name="ladybug" size={18} fallback={<Bug16Filled />} />
                  </TouchableOpacity>
                  <Button
                    title="Sign Up"
                    onPress={() => handleAuthentication('signup')}
                    style={styles.button}
                    color="primary"
                  />
                  <Button
                    title="Log In"
                    onPress={() => handleAuthentication('login')}
                    style={styles.button}
                  />
                </Row>
              )}
            </Row>
          </View>
          <View mb="3">
            <Text size="medium" weight="semibold" style={[headerStyle, styles.headerSpacing]}>
              Apple ID
            </Text>
            <View
              mt="1.5"
              rounded="medium"
              style={groupWrapperStyle}
              border="light"
              px="2.5"
              pt="1"
              pb="2">
              {appleAccountId ? (
                <Row align="center" mt="1" gap="2">
                  <View flex="1">
                    <Text weight="medium" numberOfLines={1}>
                      {appleAccountId}
                    </Text>
                    <Text size="tiny" color="secondary">
                      Used to re-sign builds for your iPhone
                    </Text>
                  </View>
                  <Button
                    title="Manage App IDs"
                    onPress={() => WindowsNavigator.open('AppleAppIds')}
                    style={styles.button}
                  />
                  <Button title="Sign Out" onPress={signOutAppleId} style={styles.button} />
                </Row>
              ) : (
                <Row mt="1">
                  <Text size="tiny" color="secondary" style={styles.captionText}>
                    Orbit asks for your Apple ID when it re-signs a build for your iPhone.
                  </Text>
                </Row>
              )}
              <Row mt="1.5">
                <Text size="tiny" color="secondary" style={styles.captionText}>
                  Your Apple ID is used only to create a free signing certificate for your devices.
                  The password is never stored — it is passed once to a local signing process.
                  Session tokens stay on this computer in ~/.orbit/apple-resign.
                </Text>
              </Row>
            </View>
          </View>
          {resignedApps.length > 0 ? (
            <View mb="3">
              <Text size="medium" weight="semibold" style={[headerStyle, styles.headerSpacing]}>
                Resigned apps
              </Text>
              <Text size="tiny" color="secondary" style={[styles.headerSpacing, styles.subheader]}>
                Apps signed with a free Apple ID stop opening after 7 days
              </Text>
              <View
                mt="2"
                rounded="medium"
                style={groupWrapperStyle}
                border="light"
                px="2.5"
                pt="1"
                pb="1">
                <Row align="center" style={styles.preferencesRow}>
                  <Checkbox
                    value={userPreferences.autoRenewResignedApps}
                    onValueChange={toggleAutoRenewResignedApps}
                    label="Automatically renew resigned apps"
                  />
                </Row>
                <Divider />
                {resignedApps.map((record, index) => {
                  const expiry = formatProfileExpiry(record.profileExpiresAt);
                  const status = record.lastError
                    ? record.lastError.message
                    : record.pendingInstall
                      ? 'Renewed — installs when the device reconnects'
                      : null;
                  return (
                    <Fragment key={record.id}>
                      <Row align="center" gap="2" style={styles.resignedAppRow}>
                        <View flex="1">
                          <Text size="small" weight="medium" numberOfLines={1}>
                            {record.appName}
                          </Text>
                          <Row gap="1">
                            <Text size="tiny" color="secondary" numberOfLines={1}>
                              {record.deviceName} ·
                            </Text>
                            <Text
                              size="tiny"
                              color={expiry.critical ? 'error' : 'secondary'}
                              numberOfLines={1}>
                              {expiry.label}
                            </Text>
                          </Row>
                          {status ? (
                            <Text
                              size="tiny"
                              color={record.lastError ? 'error' : 'secondary'}
                              numberOfLines={2}>
                              {status}
                            </Text>
                          ) : null}
                        </View>
                        <Checkbox
                          value={record.autoRenew}
                          onValueChange={(value) => toggleRecordAutoRenew(record, value)}
                          label="Auto-renew"
                        />
                        <Button
                          title="Renew now"
                          onPress={() => renewRecordNow(record)}
                          style={styles.button}
                        />
                        <Button
                          title="Remove"
                          onPress={() => removeRecord(record)}
                          style={styles.button}
                        />
                      </Row>
                      {index < resignedApps.length - 1 ? <Divider /> : null}
                    </Fragment>
                  );
                })}
              </View>
            </View>
          ) : null}
          <Text size="medium" weight="semibold" style={[headerStyle, styles.headerSpacing]}>
            Preferences
          </Text>
          <View
            mt="1.5"
            mb="3"
            rounded="medium"
            style={groupWrapperStyle}
            border="light"
            px="2.5"
            pt="1"
            pb="2.5">
            <Row mb="1" align="center" justify="between" style={styles.preferencesRow}>
              <Checkbox
                value={automaticallyChecksForUpdates}
                onValueChange={onPressSetAutomaticallyChecksForUpdates}
                label="Check for updates automatically"
              />
              <Button
                style={{ height: 28 }}
                color="primary"
                title="Check for updates"
                onPress={AutoUpdater.checkForUpdates}
              />
            </Row>
            <Divider />
            <Row align="center" gap="1" style={styles.preferencesRow}>
              <Checkbox
                value={userPreferences.launchOnLogin}
                onValueChange={onPressLaunchOnLogin}
                label="Launch on login"
              />
            </Row>
            <Divider />
            <Row align="center" style={styles.preferencesRow}>
              <Checkbox
                value={userPreferences.emulatorWithoutAudio}
                onValueChange={onPressEmulatorWithoutAudio}
                label="Run Android emulator without audio"
              />
            </Row>
            <Divider />
            <View pb="3">
              <Row align="center" style={styles.preferencesRow}>
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
            <Divider />
            <View>
              <Row align="center" style={styles.preferencesRow}>
                <Checkbox
                  value={trustedSourcesEnabled}
                  onValueChange={toggleTrustedSources}
                  label="Customize trusted sources"
                />
              </Row>
              <TrustedSourcesInput
                editable={trustedSourcesEnabled}
                onSave={(trustedSources) => {
                  setTrustedSources(trustedSources);
                  setTrustedSourcesAsync(trustedSources);
                }}
                value={trustedSources}
                placeholder="Enter trusted sources, separated by commas (e.g. https://expo.dev/**)"
              />
            </View>
          </View>
          <View>
            <Text size="medium" weight="semibold" style={[headerStyle, styles.headerSpacing]}>
              Platforms
            </Text>
            <Text size="tiny" color="secondary" style={[styles.headerSpacing, styles.subheader]}>
              Only devices for the enabled platforms will be listed in the menu bar
            </Text>
            <View mt="2" rounded="medium" style={groupWrapperStyle} border="light" px="2.5">
              {osList.map(({ label, key, supported }, index, list) => (
                <Fragment key={key}>
                  <Row
                    pb="0"
                    align="center"
                    justify="between"
                    style={[styles.osRow, !supported && styles.disabledRow]}>
                    <Text size="small" weight="normal">
                      {label} {supported ? '' : `- ${osList[index].unsupportedMessage}`}
                    </Text>
                    <Switch
                      value={Boolean(userPreferences[key])}
                      onValueChange={(value) => toggleOS(key, value)}
                      disabled={!supported}
                      style={{ alignSelf: 'center' }}
                    />
                  </Row>
                  {list.length - 1 !== index ? <Divider /> : null}
                </Fragment>
              ))}
            </View>
          </View>
        </View>
        <View pt="3">
          <Text color="secondary" size="tiny" align="center">
            {`Version: ${MenuBarModule.appVersion} ${
              MenuBarModule.buildVersion ? `(${MenuBarModule.buildVersion})` : ''
            }`}
          </Text>
          <Text color="secondary" size="tiny" align="center">
            Copyright 650 Industries Inc, {new Date().getFullYear()}
          </Text>
          <TouchableOpacity
            onPress={() => WindowsNavigator.open('DebugMenu')}
            style={[styles.debugButton, getStylesForColor('primary', theme)?.touchableStyle]}>
            <SymbolView name="ladybug" size={18} fallback={<Bug16Filled />} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

export default withApolloProvider(Settings);

const headerStyle = Platform.select({
  macos: { fontFamily: 'SF Pro Rounded', letterSpacing: 0.33 },
});

const styles = StyleSheet.create({
  button: {
    height: 32,
  },
  flex: {
    flex: 1,
  },
  headerSpacing: {
    paddingLeft: 10,
  },
  subheader: {
    marginTop: -3,
  },
  debugButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    height: 32,
    borderRadius: 6,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  osRow: {
    minHeight: 36,
  },
  resignedAppRow: {
    minHeight: 48,
    paddingVertical: 6,
  },
  captionText: {
    flex: 1,
    lineHeight: 15,
  },
  disabledRow: {
    opacity: 0.5,
  },
  preferencesRow: {
    minHeight: 38,
  },
});
