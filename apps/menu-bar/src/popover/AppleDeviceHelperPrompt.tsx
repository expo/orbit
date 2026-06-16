import { CliCommands } from 'common-types';
import { useState } from 'react';

import { installAppleDeviceSupportAsync } from '../commands/installAppleDeviceSupportAsync';
import { Text, View } from '../components';
import Button from '../components/Button';
import Alert from '../modules/Alert';
import { Linking } from '../modules/Linking';

type Props = {
  error: CliCommands.ListDevices.DeviceListError;
};

/**
 * Rendered in the iOS section when the usbmux helper service isn't reachable. It
 * explains what's needed and offers a one-click assist to install the helper
 * software (the Apple Devices app on Windows, usbmuxd on Linux).
 */
const AppleDeviceHelperPrompt = ({ error }: Props) => {
  const [isInstalling, setIsInstalling] = useState(false);
  const { helper } = error;

  const onPressInstall = async () => {
    if (!helper) {
      return;
    }

    // Prefer opening the installer page (most reliable on Windows). Otherwise run
    // the install command on the host (usbmuxd on Linux, via pkexec).
    if (helper.installUrl) {
      Linking.openURL(helper.installUrl);
      return;
    }

    setIsInstalling(true);
    try {
      await installAppleDeviceSupportAsync();
    } catch (e) {
      Alert.alert(
        `Unable to install ${helper.label}`,
        helper.installCommand
          ? `Please run the following command manually:\n\n${helper.installCommand}`
          : (e as Error).message
      );
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <View px="4" py="2" style={{ gap: 8 }}>
      <Text color="secondary" size="small">
        {error.message}
      </Text>
      {helper ? (
        <Button
          title={isInstalling ? 'Installing…' : `Install ${helper.label}`}
          color="primary"
          disabled={isInstalling}
          onPress={onPressInstall}
        />
      ) : null}
    </View>
  );
};

export default AppleDeviceHelperPrompt;
