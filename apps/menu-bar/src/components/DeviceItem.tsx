import { palette } from '@expo/styleguide-native';
import { Device } from 'common-types/build/devices';
import { useCallback, useState } from 'react';
import { StyleSheet, Pressable } from 'react-native';

import Button from './Button';
import { Text } from './Text';
import { Row, View } from './View';
import AlertIcon from '../assets/icons/AlertTriangle';
import CableConnectorIcon from '../assets/icons/cable-connector.svg';
import IphoneIcon from '../assets/icons/iphone.svg';
import WifiIcon from '../assets/icons/wifi.svg';
import Alert from '../modules/Alert';
import { PlatformColor } from '../modules/PlatformColor';
import { useTheme } from '../providers/ThemeProvider';
import { isVirtualDevice } from '../utils/device';
import { capitalize } from '../utils/helpers';
import { useExpoTheme } from '../utils/useExpoTheme';

export const DEVICE_ITEM_HEIGHT = 42;

const isValidDevice = (device: Device): boolean => {
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
  onPress: () => void;
  onPressLaunch: () => Promise<void>;
  selected?: boolean;
}

const DeviceItem = ({ device, onPress: propOnPress, onPressLaunch, selected }: Props) => {
  const theme = useExpoTheme();
  const currentTheme = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  const [isDeviceLaunching, setDeviceLaunching] = useState(false);

  const isVirtual = isVirtualDevice(device);

  const onPress = useCallback(() => {
    if (isValidDevice(device)) {
      propOnPress();
    }
  }, [device, propOnPress]);

  return (
    <Pressable
      style={[
        styles.row,
        isHovered && {
          backgroundColor: currentTheme === 'dark' ? 'rgba(255,255,255,.11)' : 'rgba(0,0,0,.12)',
        },
      ]}
      onPress={onPress}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}>
      <Row flex="1" px="2" align="center">
        <Row flex="1">
          <View
            rounded="full"
            align="centered"
            style={[
              styles.circle,
              (isHovered || selected) && { opacity: 1 },
              {
                backgroundColor: selected
                  ? PlatformColor('selectedContentBackground')
                  : currentTheme === 'dark'
                    ? 'rgba(255,255,255,.23)'
                    : 'rgba(0,0,0,.16)',
              },
            ]}>
            <IphoneIcon
              height={30}
              width={30}
              fill={
                selected
                  ? palette.dark.white
                  : currentTheme === 'dark'
                    ? palette.dark.gray['900']
                    : theme.text.default
              }
            />
          </View>
          <View flex="1" justify="center">
            <Text numberOfLines={1}>{device.name}</Text>
            <Text style={styles.description} color="secondary" leading="small">
              {capitalize(device.deviceType)}
              {'osVersion' in device && ` · ${device.osVersion}`}
            </Text>
          </View>
        </Row>
        {!isVirtual && (
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
        {isVirtual && device.state === 'Booted' && (
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
        {isVirtual && device.state === 'Shutdown' && isDeviceLaunching && (
          <Text color="secondary" style={styles.indicator}>
            Launching…
          </Text>
        )}
        {isHovered && isVirtual && device.state === 'Shutdown' && !isDeviceLaunching && (
          <Button
            title="Launch"
            disabled={isDeviceLaunching}
            color="primary"
            onPress={async () => {
              setDeviceLaunching(true);
              try {
                await onPressLaunch();
              } catch (error) {
                console.warn(error);
              } finally {
                setDeviceLaunching(false);
              }
            }}
            style={styles.button}
          />
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
