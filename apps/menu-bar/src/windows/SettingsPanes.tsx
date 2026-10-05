import { darkTheme, lightTheme } from '@expo/styleguide-native';
import { Options16Regular, PhoneLaptop16Regular, Settings16Regular } from '@fluentui/react-icons';
import { CliCommands, Config } from 'common-types';
import { DevicesPerPlatform } from 'common-types/build/cli-commands/listDevices';
import { SymbolView } from 'expo-symbols';
import React, { Fragment, useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet } from 'react-native';

import AutoUpdater from '../../modules/auto-updater';
import {
  openAuthSessionAsync,
  WebBrowserResultType,
} from '../../modules/web-authentication-session';
import { getTrustedSourcesAsync } from '../commands/getTrustesSourcesAsync';
import { listDevicesAsync } from '../commands/listDevicesAsync';
import { setTrustedSourcesAsync } from '../commands/setTrustedSourcesAsync';
import { Divider, Row, Text, View } from '../components';
import { Avatar } from '../components/Avatar';
import Button from '../components/Button';
import PathInput from '../components/PathInput';
import { Switch } from '../components/Switch';
import TrustedSourcesInput from '../components/TrustedSourcesInput';
import { useGetCurrentUserQuery } from '../generated/graphql';
import Alert from '../modules/Alert';
import MenuBarModule from '../modules/MenuBarModule';
import {
  UserPreferences,
  getUserPreferences,
  saveSessionSecret,
  saveUserPreferences,
  storage,
  sessionSecretStorageKey,
  resetApolloStore,
} from '../modules/Storage';
import { getCurrentUserDisplayName } from '../utils/helpers';
import { addOpacity } from '../utils/theme';
import { useCurrentTheme } from '../utils/useExpoTheme';

export type Pane = 'general' | 'platforms' | 'advanced';
export type PaneItem = {
  key: Pane;
  label: string;
  symbol: Extract<React.ComponentProps<typeof SymbolView>['name'], string>;
  fallback: React.ReactElement;
};
export const panes: PaneItem[] = [
  { key: 'general', label: 'General', symbol: 'gearshape', fallback: <Settings16Regular /> },
  {
    key: 'platforms',
    label: 'Platforms',
    symbol: 'macbook.and.iphone',
    fallback: <PhoneLaptop16Regular />,
  },
  {
    key: 'advanced',
    label: 'Advanced',
    symbol: 'slider.horizontal.3',
    fallback: <Options16Regular />,
  },
];

type PlatformItem = {
  label: string;
  key: keyof UserPreferences;
  devicesKey: keyof DevicesPerPlatform;
  unit: 'emulator' | 'simulator';
  supported: boolean;
};
const platformList: PlatformItem[] = [
  {
    label: 'Android',
    key: 'showAndroidEmulators',
    devicesKey: CliCommands.Platform.Android,
    unit: 'emulator',
    supported: true,
  },
  {
    label: 'iOS',
    key: 'showIosSimulators',
    devicesKey: CliCommands.Platform.Ios,
    unit: 'simulator',
    supported: true,
  },
  {
    label: 'tvOS',
    key: 'showTvosSimulators',
    devicesKey: CliCommands.Platform.Tvos,
    unit: 'simulator',
    supported: Platform.OS === 'macos',
  },
  {
    label: 'watchOS',
    key: 'showWatchosSimulators',
    devicesKey: CliCommands.Platform.Watchos,
    unit: 'simulator',
    supported: Platform.OS === 'macos',
  },
];

export const hairline = addOpacity(lightTheme.border.default, 0.2);

export function SettingsPane({ pane }: { pane: Pane }) {
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
  const [trustedSourcesEnabled, setTrustedSourcesEnabled] = useState(false);
  const [trustedSources, setTrustedSources] = useState<string>('');
  const [automaticallyChecksForUpdates, setAutomaticallyChecksForUpdates] = useState(false);
  const [deviceCounts, setDeviceCounts] = useState<
    Partial<Record<keyof DevicesPerPlatform, string>>
  >({});

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

  useEffect(() => {
    listDevicesAsync({ platform: 'all' })
      .then((list) => {
        const counts: typeof deviceCounts = {};
        platformList.forEach(({ devicesKey, unit }) => {
          const devices = (list[devicesKey]?.devices ?? []) as { deviceType: string }[];
          const count = devices.filter((device) => device.deviceType === unit).length;
          counts[devicesKey] = count ? `${count} ${unit}${count === 1 ? '' : 's'}` : '';
        });
        setDeviceCounts(counts);
      })
      .catch(() => {});
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

  const onChangeCustomSdkPath = (text: string) => {
    setUserPreferences((prev) => {
      const newPreferences = { ...prev, customSdkPath: text };
      saveUserPreferences(newPreferences);
      MenuBarModule.setEnvVars({ ANDROID_HOME: text });
      return newPreferences;
    });
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

  return (
    <View flex="1">
      <View justify="center" px="6" style={[styles.header, { borderBottomColor: hairline }]}>
        <Text size="medium" weight="semibold">
          {panes.find((item) => item.key === pane)?.label}
        </Text>
      </View>
      <ScrollView alwaysBounceVertical={false} contentContainerStyle={styles.content}>
        {pane === 'general' ? (
          <>
            <Section title="Expo account">
              <Card>
                {hasSessionSecret ? (
                  <Row align="center" gap="3" px="3.5" py="3">
                    {currentUser ? (
                      <>
                        <Avatar profileImageUrl={currentUser.primaryAccountProfileImageUrl} />
                        <View flex="1" gap="0.5">
                          <Text size="small" weight="semibold" numberOfLines={1}>
                            {getCurrentUserDisplayName(currentUser)}
                          </Text>
                          <Text size="tiny" color="secondary" numberOfLines={1}>
                            {currentUser.bestContactEmail}
                          </Text>
                        </View>
                      </>
                    ) : (
                      <View flex="1" />
                    )}
                    <Button
                      title="Log out"
                      color="primary"
                      onPress={handleLogout}
                      style={styles.button}
                    />
                  </Row>
                ) : (
                  <Row align="center" gap="2" px="3.5" py="3">
                    <Text size="tiny" color="secondary" style={styles.flex} numberOfLines={2}>
                      Log in or create an account to access your projects, builds and more.
                    </Text>
                    <Button
                      title="Sign up"
                      color="primary"
                      onPress={() => handleAuthentication('signup')}
                      style={styles.button}
                    />
                    <Button
                      title="Log in"
                      onPress={() => handleAuthentication('login')}
                      style={styles.button}
                    />
                  </Row>
                )}
              </Card>
            </Section>
            <Section title="App">
              <Card>
                <SettingRow title="Check for updates automatically">
                  <Button
                    title="Check now"
                    color="primary"
                    onPress={AutoUpdater.checkForUpdates}
                    style={styles.smallButton}
                  />
                  <Switch
                    value={automaticallyChecksForUpdates}
                    onValueChange={onPressSetAutomaticallyChecksForUpdates}
                  />
                </SettingRow>
                <Divider />
                <SettingRow title="Launch on login">
                  <Switch
                    value={userPreferences.launchOnLogin}
                    onValueChange={onPressLaunchOnLogin}
                  />
                </SettingRow>
              </Card>
            </Section>
          </>
        ) : null}

        {pane === 'platforms' ? (
          <View gap="2">
            <Text size="tiny" color="secondary">
              Only devices for enabled platforms are listed in the menu bar.
            </Text>
            <Card>
              {platformList.map((item, index) => (
                <Fragment key={item.key}>
                  {index > 0 ? <Divider /> : null}
                  <SettingRow title={item.label} disabled={!item.supported}>
                    <Text size="tiny" color="secondary">
                      {item.supported ? deviceCounts[item.devicesKey] : 'macOS only'}
                    </Text>
                    <Switch
                      value={Boolean(userPreferences[item.key])}
                      onValueChange={(value) => toggleOS(item.key, value)}
                      disabled={!item.supported}
                    />
                  </SettingRow>
                </Fragment>
              ))}
            </Card>
          </View>
        ) : null}

        {pane === 'advanced' ? (
          <>
            <Section title="Android">
              <Card>
                <SettingRow title="Run emulator without audio">
                  <Switch
                    value={userPreferences.emulatorWithoutAudio}
                    onValueChange={onPressEmulatorWithoutAudio}
                  />
                </SettingRow>
                <Divider />
                <SettingRow
                  title="Custom SDK root location"
                  subtitle="Defaults to $ANDROID_HOME"
                  below={
                    customSdkPathEnabled ? (
                      <PathInput
                        editable
                        onChangeText={onChangeCustomSdkPath}
                        value={userPreferences.customSdkPath}
                      />
                    ) : null
                  }>
                  <Switch value={customSdkPathEnabled} onValueChange={toggleCustomSdkPath} />
                </SettingRow>
              </Card>
            </Section>
            <Section title="Trusted sources">
              <Card>
                <SettingRow
                  title="Customize trusted sources"
                  subtitle="URLs Orbit may open builds from"
                  below={
                    trustedSourcesEnabled ? (
                      <>
                        <TrustedSourcesInput
                          editable
                          onSave={(trustedSources) => {
                            setTrustedSources(trustedSources);
                            setTrustedSourcesAsync(trustedSources);
                          }}
                          value={trustedSources}
                          placeholder="https://expo.dev/**, https://*.example.com/**"
                        />
                        <Text size="tiny" color="secondary">
                          Separate entries with commas. ** matches any path.
                        </Text>
                      </>
                    ) : null
                  }>
                  <Switch value={trustedSourcesEnabled} onValueChange={toggleTrustedSources} />
                </SettingRow>
              </Card>
            </Section>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View gap="2">
      <Text size="tiny" weight="semibold" color="secondary">
        {title}
      </Text>
      {children}
    </View>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  const theme = useCurrentTheme();
  const backgroundColor =
    theme === 'light'
      ? addOpacity(lightTheme.background.default, 0.6)
      : addOpacity(darkTheme.background.default, 0.2);

  return (
    <View rounded="medium" border="light" style={{ backgroundColor }}>
      {children}
    </View>
  );
}

function SettingRow({
  title,
  subtitle,
  disabled,
  below,
  children,
}: {
  title: string;
  subtitle?: string;
  disabled?: boolean;
  below?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View px="3.5" py="3" gap="2.5" style={disabled && styles.disabled}>
      <Row align="center" gap="3">
        <View flex="1" gap="0.5">
          <Text size="small">{title}</Text>
          {subtitle ? (
            <Text size="tiny" color="secondary">
              {subtitle}
            </Text>
          ) : null}
        </View>
        {children}
      </Row>
      {below}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    // On macOS the header sits in the 52pt unified toolbar, next to the traffic lights.
    height: Platform.OS === 'macos' ? 52 : 48,
    borderBottomWidth: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
    gap: 20,
  },
  flex: {
    flex: 1,
  },
  button: {
    height: 28,
  },
  smallButton: {
    height: 24,
    paddingHorizontal: 10,
  },
  disabled: {
    opacity: 0.5,
  },
});
