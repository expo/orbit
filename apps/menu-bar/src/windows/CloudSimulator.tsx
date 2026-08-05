import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { SimulatorWebView } from '../../modules/simulator-webview';
import { Analytics, Event } from '../analytics';
import { withApolloProvider } from '../api/ApolloClient';
import { Row, Text, View } from '../components';
import Button from '../components/Button';
import { useGetDeviceRunSessionQuery } from '../generated/graphql';
import { useCloudSimulatorInstall } from '../hooks/useCloudSimulatorInstall';
import Alert from '../modules/Alert';
import { Linking } from '../modules/Linking';
import {
  getOpenCloudSimulatorSessionId,
  getUserPreferences,
  saveOpenCloudSimulatorSessionId,
} from '../modules/Storage';
import {
  FRAMELESS_PREVIEW_CSS,
  SESSION_POLL_INTERVAL_MS,
  getPreviewUrl,
  isSessionTerminal,
} from '../utils/cloudSimulator';
import { WindowsNavigator } from '../windows';

const CloudSimulatorContent = () => {
  // Separate windows are separate React roots, so the session id travels through
  // storage rather than through context or props.
  const [sessionId] = useState(() => getOpenCloudSimulatorSessionId());
  const [loadError, setLoadError] = useState<string | undefined>();
  const { framelessCloudSimulator } = getUserPreferences();

  const { data, startPolling, stopPolling } = useGetDeviceRunSessionQuery({
    variables: { deviceRunSessionId: sessionId ?? '' },
    skip: !sessionId,
    fetchPolicy: 'network-only',
  });

  const session = data?.deviceRunSessions.byId;
  const previewUrl = session ? getPreviewUrl(session) : undefined;
  const hasEnded = session ? isSessionTerminal(session) : false;
  const { isSupported: canInstall, isInstalling, installBuild } = useCloudSimulatorInstall(session);

  // Keep watching until the preview is up, then stop hitting the API. Resume if
  // the session ends underneath us so the window can say so.
  useEffect(() => {
    if (!sessionId || hasEnded) {
      stopPolling();
      return;
    }
    startPolling(previewUrl ? SESSION_POLL_INTERVAL_MS * 6 : SESSION_POLL_INTERVAL_MS);
    return () => stopPolling();
  }, [sessionId, previewUrl, hasEnded, startPolling, stopPolling]);

  const onPressOpenInBrowser = useCallback(() => {
    if (previewUrl) {
      Analytics.track(Event.OPEN_CLOUD_SIMULATOR_PREVIEW);
      Linking.openURL(previewUrl);
    }
  }, [previewUrl]);

  const onPressClose = useCallback(() => {
    saveOpenCloudSimulatorSessionId(undefined);
    WindowsNavigator.close('CloudSimulator');
  }, []);

  useEffect(() => {
    if (loadError) {
      Alert.alert('Could not load the simulator preview', loadError, [
        { text: 'OK', style: 'default' },
        { text: 'Open in browser', onPress: onPressOpenInBrowser },
      ]);
    }
  }, [loadError, onPressOpenInBrowser]);

  if (!sessionId) {
    return (
      <View flex="1" align="centered" px="medium" gap="2">
        <Text size="medium" weight="semibold">
          No simulator session
        </Text>
        <Text size="tiny" color="secondary" align="center">
          Start one from the iOS section of the Orbit popover.
        </Text>
      </View>
    );
  }

  if (hasEnded) {
    return (
      <View flex="1" align="centered" px="medium" gap="3">
        <Text size="medium" weight="semibold">
          This session has ended
        </Text>
        <Text size="tiny" color="secondary" align="center">
          Cloud simulator sessions stop when you end them or when they reach their time limit.
        </Text>
        <Button title="Close" onPress={onPressClose} />
      </View>
    );
  }

  if (!previewUrl) {
    return (
      <View flex="1" align="centered" px="medium" gap="3">
        <ActivityIndicator />
        <Text size="tiny" color="secondary" align="center">
          Booting the simulator on EAS. This usually takes a minute.
        </Text>
      </View>
    );
  }

  return (
    <View flex="1" style={framelessCloudSimulator ? styles.frameless : undefined}>
      <SimulatorWebView
        url={previewUrl}
        transparent={framelessCloudSimulator}
        injectedCSS={framelessCloudSimulator ? FRAMELESS_PREVIEW_CSS : undefined}
        onLoadError={(event) => setLoadError(event.nativeEvent.message)}
        style={styles.webview}
      />
      {!framelessCloudSimulator ? (
        <Row px="2" py="1" gap="2" align="center" justify="between">
          <Text size="tiny" color="secondary" numberOfLines={1}>
            {session?.name ?? 'Cloud simulator'}
          </Text>
          <Row gap="2" align="center">
            {/* Only offered once the daemon answers, since its protocol is not a
                published contract and a session may be preview-only. */}
            {canInstall ? (
              <Button
                title={isInstalling ? 'Installing…' : 'Install build'}
                onPress={installBuild}
                disabled={isInstalling}
              />
            ) : null}
            <Button title="Open in browser" onPress={onPressOpenInBrowser} />
          </Row>
        </Row>
      ) : null}
    </View>
  );
};

const CloudSimulator = () => <CloudSimulatorContent />;

export default withApolloProvider(CloudSimulator);

const styles = StyleSheet.create({
  webview: {
    flex: 1,
  },
  frameless: {
    backgroundColor: 'transparent',
  },
});
