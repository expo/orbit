import { Device } from 'common-types/build/devices';
import { SymbolView } from 'expo-symbols';
import { useCallback, useState } from 'react';
import { StyleSheet, Pressable } from 'react-native';

import Button from './Button';
import { Text } from './Text';
import { Row, View } from './View';
import AlertIcon from '../assets/icons/AlertTriangle';
import CableConnectorIcon from '../assets/icons/cable-connector.svg';
import CloudIcon from '../assets/icons/cloud.svg';
import IphoneIcon from '../assets/icons/iphone.svg';
import TvosIcon from '../assets/icons/tvos.svg';
import WatchIcon from '../assets/icons/watch.svg';
import WifiIcon from '../assets/icons/wifi.svg';
import Alert from '../modules/Alert';
import { PlatformColor } from '../modules/PlatformColor';
import { useTheme } from '../providers/ThemeProvider';
import { isRemoteDevice, isVirtualDevice } from '../utils/device';
import { capitalize } from '../utils/helpers';

export const DEVICE_ITEM_HEIGHT = 42;

export const isValidDevice = (device: Device): boolean => {
  if (
    device.osType === 'iOS' &&
    device.deviceType === 'device' &&
    device.developerModeStatus === 'disabled'
  ) {
    Alert.alert(
      'Developer Mode Required',
      'To use this device, you must enable developer mode on your device settings.'
    );
    return false;
  }

  return true;
};

interface Props {
  device: Device;
  onPressLaunch: () => Promise<void>;
  /** Expo Simulators sessions only. */
  onPressOpen?: () => void;
  onPressStop?: () => void;
}

const DeviceItem = ({ device, onPressLaunch, onPressOpen, onPressStop }: Props) => {
  const currentTheme = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  const [isDeviceLaunching, setDeviceLaunching] = useState(false);

  const isVirtual = isVirtualDevice(device);
  // An Expo Simulators device has the states of a virtual device, plus `Starting`.
  const isRemote = isRemoteDevice(device);
  const canLaunch = isVirtual || isRemote;

  const launch = useCallback(async () => {
    setDeviceLaunching(true);
    try {
      await onPressLaunch();
    } catch (error) {
      console.warn(error);
    } finally {
      setDeviceLaunching(false);
    }
  }, [onPressLaunch]);

  // A row has one action: a local simulator or emulator that does not run launches on a
  // click. The section header sets the default device.
  const launchesOnPress = isVirtual && device.state === 'Shutdown';
  const onPress = useCallback(() => {
    if (launchesOnPress && !isDeviceLaunching) {
      launch();
    }
  }, [launchesOnPress, isDeviceLaunching, launch]);

  return (
    <Pressable
      style={[
        styles.row,
        isHovered &&
          (launchesOnPress || isRemote) && {
            backgroundColor: currentTheme === 'dark' ? 'rgba(255,255,255,.11)' : 'rgba(0,0,0,.12)',
          },
      ]}
      onPress={onPress}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      testID="device-item">
      <Row flex="1" px="2" align="center">
        <Row flex="1">
          <View
            rounded="full"
            align="centered"
            style={[
              styles.circle,
              isHovered && { opacity: 1 },
              {
                backgroundColor:
                  currentTheme === 'dark' ? 'rgba(255,255,255,.23)' : 'rgba(0,0,0,.16)',
              },
            ]}>
            {isRemote ? (
              <SymbolView name="cloud" size={22} fallback={<CloudIcon width={22} height={22} />} />
            ) : device.osType === 'watchOS' ? (
              <SymbolView
                name="applewatch"
                size={20}
                fallback={<WatchIcon width={20} height={20} />}
              />
            ) : device.osType === 'tvOS' ? (
              <SymbolView name="tv" size={20} fallback={<TvosIcon width={20} height={20} />} />
            ) : (
              <SymbolView
                name="iphone"
                size={24}
                fallback={<IphoneIcon width={24} height={24} />}
              />
            )}
          </View>
          <View flex="1" justify="center">
            <Text numberOfLines={1}>
              {isRemote
                ? device.osType === 'iOS'
                  ? 'iOS Simulator'
                  : 'Android Emulator'
                : device.name}
            </Text>
            <Text style={styles.description} color="secondary" leading="small">
              {isRemote
                ? device.projectSlug
                  ? `${device.accountName}/${device.projectSlug}`
                  : 'Not running'
                : capitalize(device.deviceType)}
              {'osVersion' in device && ` · ${device.osVersion}`}
            </Text>
          </View>
        </Row>
        {!canLaunch && (
          <>
            {device.connectionType === 'Network' ? (
              <WifiIcon height={20} width={20} fill={PlatformColor('text')} />
            ) : (
              <CableConnectorIcon height={24} width={24} fill={PlatformColor('text')} />
            )}
            {device.osType === 'iOS' && device.developerModeStatus === 'disabled' ? (
              <AlertIcon
                height={15}
                width={15}
                fill={PlatformColor('labelColor')}
                style={{ opacity: currentTheme === 'dark' ? 0.65 : 0.85 }}
              />
            ) : null}
          </>
        )}
        {isRemote && device.state === 'Starting' && !isHovered && (
          <Text color="secondary" style={styles.indicator}>
            Starting…
          </Text>
        )}
        {isRemote && device.state !== 'Shutdown' && isHovered && (
          <>
            {device.state === 'Booted' && onPressOpen ? (
              <Button title="Open" color="primary" onPress={onPressOpen} style={styles.button} />
            ) : null}
            <Button title="Stop" color="danger" onPress={onPressStop} style={styles.button} />
          </>
        )}
        {canLaunch && device.state === 'Booted' && !(isRemote && isHovered) && (
          <>
            <Text color="success" style={styles.indicator}>
              ●
            </Text>
            <Text color="secondary" style={styles.indicator}>
              {' '}
              Running
            </Text>
          </>
        )}
        {canLaunch && device.state === 'Shutdown' && isDeviceLaunching && (
          <Text color="secondary" style={styles.indicator}>
            Launching…
          </Text>
        )}
        {isHovered && launchesOnPress && !isDeviceLaunching && (
          <Text color="secondary" style={styles.indicator}>
            Launch
          </Text>
        )}
        {isHovered && isRemote && device.state === 'Shutdown' && !isDeviceLaunching && (
          <Button title="Start" color="primary" onPress={launch} style={styles.button} />
        )}
      </Row>
    </Pressable>
  );
};

export default DeviceItem;

const styles = StyleSheet.create({
  row: {
    height: DEVICE_ITEM_HEIGHT,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 6,
    borderRadius: 4,
  },
  circle: { width: 32, height: 32, marginRight: 8, opacity: 0.8 },
  description: {
    fontSize: 11,
    opacity: 0.8,
  },
  button: {
    marginLeft: 8,
    borderWidth: 0,
  },
  indicator: {
    fontSize: 11,
  },
});
