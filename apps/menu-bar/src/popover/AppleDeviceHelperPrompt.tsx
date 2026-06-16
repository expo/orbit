import { CliCommands } from 'common-types';
import { useState } from 'react';

import { installAppleDeviceSupportAsync } from '../commands/installAppleDeviceSupportAsync';
import { Text, View } from '../components';
import Button from '../components/Button';
import Alert from '../modules/Alert';
import { Linking } from '../modules/Linking';

type Props = {
  error: CliCommands.ListDevices.DeviceListError;
  /** Called after the helper software is installed so the device list can refresh. */
  onInstalled?: () => void;
};

/**
 * Rendered in the iOS section when the usbmux helper service isn't reachable. It
 * explains what's needed and offers a one-click assist to install the helper
 * software (Apple Mobile Device Support on Windows, usbmuxd on Linux).
 */
const AppleDeviceHelperPrompt = ({ error, onInstalled }: Props) => {
  const [isInstalling, setIsInstalling] = useState(false);
  const { helper } = error;

  // Only offer an install action when there's actually something to install. When
  // the helper is installed but not running (e.g. usbmuxd on Linux), the message
  // itself explains how to start it.
  const canInstall = Boolean(helper && (helper.installUrl || helper.installCommand));

  const onPressInstall = async () => {
    if (!helper) {
      return;
    }

    // Install the helper software for the user (winget on Windows, pkexec on
    // Linux). Only fall back to the manual download page if that fails — e.g.
    // winget isn't available.
    setIsInstalling(true);
    try {
      await installAppleDeviceSupportAsync();
      Alert.alert(
        `${helper.label} installed`,
        'Reconnect your iPhone over USB and tap "Trust" if prompted.'
      );
      onInstalled?.();
    } catch (e) {
      if (helper.installUrl) {
        Linking.openURL(helper.installUrl);
      } else {
        Alert.alert(
          `Unable to install ${helper.label}`,
          helper.installCommand
            ? `Please run the following command manually:\n\n${helper.installCommand}`
            : (e as Error).message
        );
      }
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <View px="4" py="2" style={{ gap: 8 }}>
      <Text color="secondary" size="small">
        {error.message}
      </Text>
      {canInstall ? (
        <Button
          title={isInstalling ? 'Installing…' : `Install ${helper!.label}`}
          color="primary"
          disabled={isInstalling}
          onPress={onPressInstall}
        />
      ) : null}
    </View>
  );
};

export default AppleDeviceHelperPrompt;
