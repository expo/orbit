import { darkTheme, lightTheme } from '@expo/styleguide-native';
import {
  Key16Regular,
  Options16Regular,
  PhoneLaptop16Regular,
  Settings16Regular,
} from '@fluentui/react-icons';
import { CliCommands, Config } from 'common-types';
import { DevicesPerPlatform } from 'common-types/build/cli-commands/listDevices';
import { SymbolView } from 'expo-symbols';
import React, { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet } from 'react-native';

import { WindowsNavigator } from './index';
import AutoUpdater from '../../modules/auto-updater';
import {
  openAuthSessionAsync,
  WebBrowserResultType,
} from '../../modules/web-authentication-session';
import {
  APPLE_ID_CHANGED_EVENT,
  clearAppleIdLoginAsync,
  forgetAppleIdSession,
  isAppleAuthExpiredError,
  loadAppleId,
  resolveAppleIdAsync,
} from '../commands/appleAccountAsync';
import {
  AppleAppId,
  deleteAppleAppIdAsync,
  listAppleAppIdsAsync,
} from '../commands/appleAppIdsAsync';
import { cleanupResignedAppsAsync } from '../commands/cleanupResignedAppsAsync';
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
import { APPLE_APP_IDS_DONE_EVENT, AppleAppIdsEmitter } from '../utils/appleAppIdsEvents';
import { formatProfileExpiry, getCurrentUserDisplayName } from '../utils/helpers';
import { describeResignError } from '../utils/resignErrorCopy';
import { addOpacity } from '../utils/theme';
import { useCurrentTheme, useExpoPalette, useExpoTheme } from '../utils/useExpoTheme';

export type Pane = 'general' | 'platforms' | 'apple' | 'advanced';
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
  { key: 'apple', label: 'Apple ID', symbol: 'key', fallback: <Key16Regular /> },
  {
    key: 'advanced',
    label: 'Advanced',
    symbol: 'slider.horizontal.3',
    fallback: <Options16Regular />,
  },
];

const REQUESTED_PANE_KEY = 'settings:requested-pane';

/** Open Settings on `pane` — e.g. the resign flow sends the user to Apple ID → App IDs. */
export function openSettingsPane(pane: Pane) {
  storage.set(REQUESTED_PANE_KEY, pane);
  WindowsNavigator.open('Settings');
}

function consumeRequestedPane(): Pane | undefined {
  const requested = storage.getString(REQUESTED_PANE_KEY);
  if (!requested) return undefined;
  storage.delete(REQUESTED_PANE_KEY);
  return panes.some((item) => item.key === requested) ? (requested as Pane) : undefined;
}

/** Selected pane; honours openSettingsPane() on mount and while the window is already open. */
export function useSettingsPane() {
  const [pane, setPane] = useState<Pane>(() => consumeRequestedPane() ?? 'general');
  useEffect(() => {
    const listener = storage.addOnValueChangedListener((key) => {
      if (key !== REQUESTED_PANE_KEY) return;
      const requested = consumeRequestedPane();
      if (requested) setPane(requested);
    });
    return listener.remove;
  }, []);
  return [pane, setPane] as const;
}

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
  const expoTheme = useExpoTheme();
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
    // Adopt a session the CLI already holds (fresh install, other app flavour,
    // CLI sign-in); it broadcasts APPLE_ID_CHANGED_EVENT, handled above.
    resolveAppleIdAsync().catch(() => {});
    return () => {
      recordsSub.remove();
      appleIdSub.remove();
    };
  }, []);

  // The resign flow parks on this event after sending the user here to free App
  // ID quota (openSettingsPane('apple')); report what was freed once Settings closes.
  const appIdsDeletedRef = useRef(0);
  useEffect(
    () => () => {
      AppleAppIdsEmitter.emit(APPLE_APP_IDS_DONE_EVENT, {
        deletedCount: appIdsDeletedRef.current,
      });
    },
    []
  );

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

  const keyIcon = (
    <IconTile>
      <SymbolView
        name="key"
        size={18}
        tintColor={expoTheme.text.default}
        fallback={<Key16Regular />}
        style={styles.symbol}
      />
    </IconTile>
  );

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

        {pane === 'apple' ? (
          <>
            <Card>
              {appleAccountId ? (
                <SettingRow
                  leading={keyIcon}
                  title={appleAccountId}
                  subtitle="Used to re-sign builds for your iPhone">
                  <Button
                    title="Sign out"
                    color="danger"
                    onPress={signOutAppleId}
                    style={styles.button}
                  />
                </SettingRow>
              ) : (
                <SettingRow
                  leading={keyIcon}
                  title="No Apple ID saved"
                  subtitle="Orbit will ask the next time it re-signs a build.">
                  <Button
                    title="Sign in…"
                    onPress={() => WindowsNavigator.open('AppleIdAuth')}
                    style={styles.button}
                  />
                </SettingRow>
              )}
            </Card>
            {appleAccountId ? (
              <AppleAppIdsSection
                appleId={appleAccountId}
                onDeleted={() => {
                  appIdsDeletedRef.current += 1;
                }}
              />
            ) : null}
            {resignedApps.length > 0 ? (
              <Section title="Resigned apps">
                <Card>
                  <SettingRow
                    title="Renew automatically"
                    subtitle="Apps signed with a free Apple ID stop opening after 7 days">
                    <Switch
                      value={userPreferences.autoRenewResignedApps}
                      onValueChange={toggleAutoRenewResignedApps}
                    />
                  </SettingRow>
                  {resignedApps.map((record) => {
                    const expiry = formatProfileExpiry(record.profileExpiresAt);
                    const status = record.lastError
                      ? record.lastError.message
                      : record.pendingInstall
                        ? 'Renewed — installs when the device reconnects'
                        : null;
                    return (
                      <Fragment key={record.id}>
                        <Divider />
                        <SettingRow
                          title={record.appName}
                          subtitle={
                            <>
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
                            </>
                          }>
                          <Text size="tiny" color="secondary">
                            Auto-renew
                          </Text>
                          <Switch
                            value={record.autoRenew}
                            onValueChange={(value) => toggleRecordAutoRenew(record, value)}
                          />
                          <Button
                            title="Renew now"
                            color="primary"
                            onPress={() => renewRecordNow(record)}
                            style={styles.smallButton}
                          />
                          <Button
                            title="Remove"
                            onPress={() => removeRecord(record)}
                            style={styles.smallButton}
                          />
                        </SettingRow>
                      </Fragment>
                    );
                  })}
                </Card>
              </Section>
            ) : null}
            <Section title="How Orbit uses your Apple ID">
              <Text size="tiny" color="secondary">
                Your Apple ID is used only to create a free signing certificate for your devices.
                The password is never stored — it is passed once to a local signing process. Session
                tokens stay on this computer in ~/.orbit/apple-resign.
              </Text>
            </Section>
          </>
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

const FREE_APP_ID_QUOTA = 10;

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * The App IDs registered to the signed-in Apple ID, so the user can free quota
 * slots (free teams: 10 App IDs per rolling 7 days). `onDeleted` feeds the
 * `apple-app-ids:done` count the resign flow waits on.
 */
function AppleAppIdsSection({ appleId, onDeleted }: { appleId: string; onDeleted: () => void }) {
  const expoTheme = useExpoTheme();
  const palette = useExpoPalette();
  const [appIds, setAppIds] = useState<AppleAppId[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const rows = await listAppleAppIdsAsync(appleId);
      rows.sort((a, b) => (a.expirationDate ?? '').localeCompare(b.expirationDate ?? ''));
      setAppIds(rows);
    } catch (e) {
      if (isAppleAuthExpiredError(e)) {
        // An expired session is a logout: the pane flips to its signed-out
        // state (and this section unmounts) through APPLE_ID_CHANGED_EVENT.
        forgetAppleIdSession();
        return;
      }
      setError(describeResignError(e).message);
      setAppIds((rows) => rows ?? []);
    }
  }, [appleId]);

  useEffect(() => {
    load();
  }, [load]);

  const onDelete = (row: AppleAppId) => {
    Alert.alert(
      `Delete "${row.name}"?`,
      `${row.identifier}\n\nApps signed with this App ID keep working until their profile expires, but they can’t be renewed with it anymore.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'default',
          onPress: async () => {
            setBusyId(row.appIdId);
            try {
              await deleteAppleAppIdAsync(appleId, row.appIdId);
              onDeleted();
              await load();
            } catch (e) {
              if (isAppleAuthExpiredError(e)) {
                forgetAppleIdSession();
                return;
              }
              setError(describeResignError(e).message);
            } finally {
              setBusyId(null);
            }
          },
        },
      ]
    );
  };

  // Free teams' App IDs expire 7 days after registration, so the list is the
  // rolling-window usage. Paid teams' App IDs never expire and have no cap.
  const quota = appIds !== null && appIds.every((row) => Boolean(row.expirationDate));
  const used = appIds?.length ?? 0;

  return (
    <Section
      title="App IDs"
      trailing={
        quota ? (
          <Text size="tiny" color="secondary">
            {used} of {FREE_APP_ID_QUOTA} used
          </Text>
        ) : null
      }>
      {quota ? (
        <>
          <Text size="tiny" color="secondary">
            Free Apple IDs can register at most {FREE_APP_ID_QUOTA} App IDs per rolling 7-day
            window. Delete ones you no longer use to free a slot.
          </Text>
          <Row style={styles.slots}>
            {Array.from({ length: FREE_APP_ID_QUOTA }, (_, index) => (
              <View
                key={index}
                flex="1"
                style={[
                  styles.slot,
                  { backgroundColor: index < used ? expoTheme.link.default : palette.gray['300'] },
                ]}
              />
            ))}
          </Row>
        </>
      ) : null}
      <Card>
        {appIds === null ? (
          <View px="3.5" py="3" align="start">
            <ActivityIndicator />
          </View>
        ) : appIds.length === 0 ? (
          <View px="3.5" py="3">
            <Text size="tiny" color="secondary">
              {quota
                ? 'No App IDs registered in the last 7 days.'
                : 'No App IDs are registered to this team.'}
            </Text>
          </View>
        ) : (
          appIds.map((row, index) => (
            <Fragment key={row.appIdId}>
              {index > 0 ? <Divider /> : null}
              <SettingRow
                title={row.name}
                subtitle={
                  <Row gap="1.5">
                    <Text
                      size="tiny"
                      color="secondary"
                      type="mono"
                      numberOfLines={1}
                      style={styles.shrink}>
                      {row.identifier}
                    </Text>
                    {row.expirationDate ? (
                      <Text size="tiny" color="secondary">
                        · expires {formatShortDate(row.expirationDate)}
                      </Text>
                    ) : null}
                  </Row>
                }>
                <Button
                  title={busyId === row.appIdId ? 'Deleting…' : 'Delete'}
                  color="danger"
                  disabled={busyId !== null}
                  onPress={() => onDelete(row)}
                  style={styles.smallButton}
                />
              </SettingRow>
            </Fragment>
          ))
        )}
      </Card>
      {error ? (
        <Text size="tiny" color="error">
          {error}
        </Text>
      ) : null}
    </Section>
  );
}

function Section({
  title,
  trailing,
  children,
}: {
  title: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View gap="2">
      <Row align="center" justify="between">
        <Text size="tiny" weight="semibold" color="secondary">
          {title}
        </Text>
        {trailing}
      </Row>
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

function IconTile({ children }: { children: React.ReactNode }) {
  const palette = useExpoPalette();
  return (
    <View align="centered" style={[styles.iconTile, { backgroundColor: palette.gray['200'] }]}>
      {children}
    </View>
  );
}

function SettingRow({
  leading,
  title,
  subtitle,
  disabled,
  below,
  children,
}: {
  leading?: React.ReactNode;
  title: string;
  subtitle?: React.ReactNode;
  disabled?: boolean;
  below?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View px="3.5" py="3" gap="2.5" style={disabled && styles.disabled}>
      <Row align="center" gap="3">
        {leading}
        <View flex="1" gap="0.5">
          <Text size="small" numberOfLines={1}>
            {title}
          </Text>
          {typeof subtitle === 'string' ? (
            <Text size="tiny" color="secondary">
              {subtitle}
            </Text>
          ) : (
            subtitle
          )}
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
  shrink: {
    flexShrink: 1,
  },
  iconTile: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  symbol: {
    width: 18,
    height: 18,
  },
  slots: {
    gap: 3,
  },
  slot: {
    height: 4,
    borderRadius: 2,
  },
});
