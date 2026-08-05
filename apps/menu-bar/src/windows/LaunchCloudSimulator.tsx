import { lightTheme } from '@expo/styleguide-native';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';

import { Analytics, Event } from '../analytics';
import { withApolloProvider } from '../api/ApolloClient';
import CloudIcon from '../assets/icons/cloud.svg';
import { Row, Text, TextInput, View } from '../components';
import Button from '../components/Button';
import { ProjectIcon } from '../components/ProjectIcon';
import { useGetPinnedApps } from '../hooks/useGetPinnedApps';
import { useSimulatorAvailability } from '../hooks/useSimulatorAvailability';
import Alert from '../modules/Alert';
import { Linking } from '../modules/Linking';
import { PlatformColor } from '../modules/PlatformColor';
import {
  getLastCloudSimulatorAppId,
  saveLastCloudSimulatorAppId,
  saveOpenCloudSimulatorSessionId,
  sessionSecretStorageKey,
  storage,
} from '../modules/Storage';
import { CloudSimulatorProvider, useCloudSimulators } from '../providers/CloudSimulatorProvider';
import { WindowsNavigator } from '../windows';

const LaunchCloudSimulatorContent = () => {
  const { apps, loading: appsLoading } = useGetPinnedApps();
  const { startSession, startingAppIds } = useCloudSimulators();

  const [selectedAppId, setSelectedAppId] = useState<string | undefined>(() =>
    getLastCloudSimulatorAppId()
  );
  const [sessionName, setSessionName] = useState('');

  const isSignedIn = Boolean(storage.getString(sessionSecretStorageKey));

  const selectedApp = useMemo(() => {
    if (!apps?.length) {
      return undefined;
    }
    return apps.find((app) => app.id === selectedAppId) ?? apps[0];
  }, [apps, selectedAppId]);

  const { available, loading: availabilityLoading } = useSimulatorAvailability(selectedApp?.id);
  const isStarting = selectedApp ? startingAppIds.includes(selectedApp.id) : false;

  const onPressLaunch = useCallback(async () => {
    if (!selectedApp) {
      return;
    }

    saveLastCloudSimulatorAppId(selectedApp.id);
    Analytics.track(Event.LAUNCH_CLOUD_SIMULATOR);

    try {
      const session = await startSession({
        appId: selectedApp.id,
        appSlug: selectedApp.slug,
        name: sessionName,
      });
      saveOpenCloudSimulatorSessionId(session.id);
      WindowsNavigator.open('CloudSimulator');
      WindowsNavigator.close('LaunchCloudSimulator');
    } catch (error) {
      Alert.alert(
        'Could not start the cloud simulator',
        error instanceof Error ? error.message : 'Something went wrong.'
      );
    }
  }, [selectedApp, sessionName, startSession]);

  if (!isSignedIn) {
    return (
      <View flex="1" px="medium" pb="medium" align="centered" gap="3">
        <Text size="medium" weight="semibold">
          Sign in to use cloud simulators
        </Text>
        <Text size="tiny" color="secondary" align="center">
          Cloud simulators run on EAS, so Orbit needs your Expo account.
        </Text>
        <Button title="Open Settings" onPress={() => WindowsNavigator.open('Settings')} />
      </View>
    );
  }

  return (
    <View flex="1" px="medium" pb="medium" testID="launch-cloud-simulator-window">
      <ScrollView alwaysBounceVertical={false}>
        <Row align="center" gap="2.5" mb="3">
          <View rounded="medium" align="centered" style={styles.iconBadge}>
            <CloudIcon width={20} height={20} fill={lightTheme.button.secondary.background} />
          </View>
          <View flex="1">
            <Text size="medium" weight="semibold">
              Launch a cloud simulator
            </Text>
            <Text size="tiny" color="secondary">
              Runs an iOS simulator on EAS and previews it here
            </Text>
          </View>
        </Row>

        <Text size="tiny" weight="semibold" style={styles.label}>
          Project
        </Text>
        {appsLoading && !apps?.length ? (
          <ActivityIndicator />
        ) : (
          <View gap="1" mb="3">
            {apps?.map((app) => {
              const isSelected = selectedApp?.id === app.id;
              return (
                <TouchableOpacity
                  key={app.id}
                  onPress={() => setSelectedAppId(app.id)}
                  style={[styles.appRow, isSelected && styles.appRowSelected]}>
                  <Row gap="2" align="center">
                    <ProjectIcon app={app} />
                    <View flex="1">
                      <Text size="small">{app.name}</Text>
                      <Text size="tiny" color="secondary">
                        {app.ownerAccount.name}/{app.slug}
                      </Text>
                    </View>
                  </Row>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <Text size="tiny" weight="semibold" style={styles.label}>
          Session name (optional)
        </Text>
        <View mb="3">
          <TextInput
            value={sessionName}
            onChangeText={setSessionName}
            placeholder="Checkout flow screenshots"
            border="default"
            rounded="medium"
            px="2"
            py="2"
          />
        </View>
        <Text size="tiny" color="secondary" style={styles.hint}>
          Shown in `eas simulator:list` and on expo.dev. Keep it short and say what the session is
          for.
        </Text>

        {!availabilityLoading && selectedApp && !available ? (
          <View mt="3" gap="1">
            <Text size="tiny" color="warning">
              EAS Simulator is not enabled for this account yet.
            </Text>
            <TouchableOpacity
              onPress={() => Linking.openURL('https://docs.expo.dev/eas/simulator/')}>
              <Text size="tiny" color="link">
                Read more
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View mt="4">
          <Button
            title={isStarting ? 'Starting…' : 'Launch simulator'}
            onPress={onPressLaunch}
            disabled={!selectedApp || !available || isStarting}
          />
        </View>

        <Text size="tiny" color="warning" align="center" style={styles.billing}>
          A cloud simulator runs on EAS and bills until you stop it.
        </Text>
      </ScrollView>
    </View>
  );
};

const LaunchCloudSimulator = () => (
  <CloudSimulatorProvider>
    <LaunchCloudSimulatorContent />
  </CloudSimulatorProvider>
);

export default withApolloProvider(LaunchCloudSimulator);

const styles = StyleSheet.create({
  iconBadge: {
    width: 36,
    height: 36,
    backgroundColor: lightTheme.button.secondary.background,
  },
  label: {
    marginBottom: 4,
  },
  hint: {
    marginTop: -8,
  },
  appRow: {
    padding: 8,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: PlatformColor('separatorColor'),
  },
  appRowSelected: {
    borderColor: PlatformColor('selectedContentBackgroundColor'),
    borderWidth: 2,
  },
  billing: {
    marginTop: 12,
  },
});
