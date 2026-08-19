import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import {
  SimulatorCameraStatus,
  getStatusAsync,
  installAsync,
  startAsync,
  stopAsync,
  uninstallAsync,
} from '../../modules/simulator-camera';
import SimulatorCameraIcon from '../assets/icons/camera.svg';
import { Row, Text, View } from '../components';
import Button from '../components/Button';
import { PlatformColor } from '../modules/PlatformColor';

const initialStatus: SimulatorCameraStatus = {
  installed: false,
  streaming: false,
};

type SimulatorCameraProps = {
  groupWrapperStyle: object;
};

export default function SimulatorCamera({ groupWrapperStyle }: SimulatorCameraProps) {
  const [status, setStatus] = useState(initialStatus);
  const [working, setWorking] = useState(true);

  const perform = useCallback(async (action: () => Promise<SimulatorCameraStatus>) => {
    setWorking(true);
    try {
      setStatus(await action());
    } finally {
      setWorking(false);
    }
  }, []);

  useEffect(() => {
    perform(getStatusAsync);
  }, [perform]);

  const toggleInstallation = () => perform(status.installed ? uninstallAsync : installAsync);
  const toggleStreaming = () => perform(status.streaming ? stopAsync : startAsync);

  return (
    <View mb="3" testID="simulator-camera-settings">
      <Row align="center" gap="2.5" mb="1.5" style={styles.headerSpacing}>
        <View rounded="medium" align="centered" style={styles.iconBadge}>
          <SimulatorCameraIcon width={20} height={20} fill={PlatformColor('controlAccentColor')} />
        </View>
        <View flex="1">
          <Text size="medium" weight="semibold">
            Simulator Camera
          </Text>
          <Text size="tiny" color="secondary">
            Use your Mac camera in iOS Simulator apps
          </Text>
        </View>
        {working && <ActivityIndicator size="small" />}
      </Row>

      <View border="light" rounded="medium" padding="medium" gap="3" style={groupWrapperStyle}>
        <Row justify="between" align="center">
          <View flex="1" style={styles.copyColumn}>
            <Text weight="semibold">Xcode integration</Text>
            <Text size="tiny" color="secondary">
              {status.installed
                ? 'Installed. Restart the app from Xcode after changing this setting.'
                : 'Adds a removable hook to ~/.lldbinit-Xcode.'}
            </Text>
          </View>
          <Button
            color="primary"
            disabled={working}
            onPress={toggleInstallation}
            title={status.installed ? 'Remove' : 'Install'}
          />
        </Row>

        <View style={styles.divider} />

        <Row justify="between" align="center">
          <View flex="1" style={styles.copyColumn}>
            <Text weight="semibold">Mac camera</Text>
            <Text size="tiny" color="secondary">
              {status.streaming
                ? `Streaming ${status.cameraName ?? 'camera'} at up to 1080p.`
                : 'Frames stay on this Mac and are shared with Simulator processes.'}
            </Text>
          </View>
          <Button
            disabled={working || !status.installed}
            onPress={toggleStreaming}
            title={status.streaming ? 'Stop' : 'Start'}
          />
        </Row>
      </View>

      {status.error && (
        <View mt="3">
          <Text size="tiny" color="error">
            {status.error}
          </Text>
        </View>
      )}

      <View mt="3">
        <Text size="tiny" color="secondary">
          Preview and video-frame capture are supported in this first version. Taking photos,
          recording movies, and UIImagePickerController are not yet intercepted.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  iconBadge: {
    width: 36,
    height: 36,
    backgroundColor: PlatformColor('controlBackgroundColor'),
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: PlatformColor('separatorColor'),
  },
  copyColumn: {
    marginRight: 16,
  },
  headerSpacing: {
    paddingLeft: 10,
  },
});
