import { Device } from 'common-types/build/devices';
import { SymbolView } from 'expo-symbols';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Pressable } from 'react-native';

import { Text, secondaryText } from './Text';
import { Row, View } from './View';
import AlertIcon from '../assets/icons/AlertTriangle';
import CableConnectorIcon from '../assets/icons/cable-connector.svg';
import CloudIcon from '../assets/icons/cloud.svg';
import IphoneIcon from '../assets/icons/iphone.svg';
import TvosIcon from '../assets/icons/tvos.svg';
import WatchIcon from '../assets/icons/watch.svg';
import WifiIcon from '../assets/icons/wifi.svg';
import { useLingeringHover } from '../hooks/useLingeringHover';
import Alert from '../modules/Alert';
import { PlatformColor } from '../modules/PlatformColor';
import { useTheme } from '../providers/ThemeProvider';
import { isRemoteDevice, isVirtualDevice } from '../utils/device';
import { capitalize } from '../utils/helpers';
import { getRemoteSimulatorDeviceName } from '../utils/remoteSimulator';

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
  /**
   * For a device that starts or runs. Open shows the page of a session, or brings the window
   * of a local simulator or emulator to the front.
   */
  onPressOpen?: () => void;
  onPressStop?: () => void;
  /** The device is the default device of its platform. Its icon shows in blue. */
  isDefault?: boolean;
  /** A click on the icon makes the device the default, or removes the default. */
  onPressDefault?: () => void;
}

const DEFAULT_DEVICE_COLOR = '#007AFF';

type RowButtonProps = { title: string; danger?: boolean; onPress?: () => void };

// A button at the right of a row. Its fill changes while the pointer is on it.
const RowButton = ({ title, danger, onPress }: RowButtonProps) => {
  const theme = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  const backgroundColor =
    theme === 'dark'
      ? `rgba(255,255,255,${isHovered ? 0.34 : 0.18})`
      : `rgba(255,255,255,${isHovered ? 1 : 0.7})`;

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      style={[styles.button, { backgroundColor }]}
      testID={`device-item-${title.toLowerCase()}`}>
      <Text
        size="tiny"
        weight="semibold"
        style={danger ? { color: theme === 'dark' ? '#FF6961' : '#D70015' } : undefined}>
        {title}
      </Text>
    </Pressable>
  );
};

const DeviceItem = ({
  device,
  onPressLaunch,
  onPressOpen,
  onPressStop,
  isDefault = false,
  onPressDefault,
}: Props) => {
  const currentTheme = useTheme();
  const { isHovered, opacity, onHoverIn, onHoverOut } = useLingeringHover();
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

  // A row is not a button. Its actions are buttons that show at the right on hover: Launch
  // for a local simulator or emulator that does not run, Open and Stop for a session.
  const canLaunchNow = isVirtual && device.state === 'Shutdown';
  const hasSessionButtons = canLaunch && device.state !== 'Shutdown' && !!onPressOpen;
  const isRunning = canLaunch && device.state === 'Booted';
  // The icon shows the state: a spinner while the device starts, a green dot while it runs.
  const isStarting = (isRemote && device.state === 'Starting') || isDeviceLaunching;
  const iconTint = isDefault ? '#ffffff' : undefined;

  return (
    <Pressable
      style={styles.row}
      onHoverIn={onHoverIn}
      onHoverOut={onHoverOut}
      testID="device-item">
      {isHovered && (canLaunchNow || hasSessionButtons) ? (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.highlight,
            {
              opacity,
              backgroundColor:
                currentTheme === 'dark' ? 'rgba(255,255,255,.11)' : 'rgba(0,0,0,.12)',
            },
          ]}
        />
      ) : null}
      <Row flex="1" px="2" align="center">
        <Row flex="1">
          <Pressable
            disabled={!onPressDefault}
            onPress={onPressDefault}
            testID="device-item-default"
            style={[
              styles.circle,
              styles.circleShape,
              onPressDefault && styles.pointer,
              (isHovered || isDefault) && { opacity: 1 },
              {
                backgroundColor: isDefault
                  ? DEFAULT_DEVICE_COLOR
                  : currentTheme === 'dark'
                    ? 'rgba(255,255,255,.23)'
                    : 'rgba(0,0,0,.16)',
              },
            ]}>
            {isStarting ? (
              <ActivityIndicator size="small" color={iconTint} style={styles.spinner} />
            ) : isRemote ? (
              <SymbolView
                name="cloud"
                size={22}
                tintColor={iconTint}
                style={styles.cloud}
                fallback={<CloudIcon width={22} height={22} />}
              />
            ) : device.osType === 'watchOS' ? (
              <SymbolView
                name="applewatch"
                size={20}
                tintColor={iconTint}
                fallback={<WatchIcon width={20} height={20} />}
              />
            ) : device.osType === 'tvOS' ? (
              <SymbolView
                name="tv"
                size={20}
                tintColor={iconTint}
                fallback={<TvosIcon width={20} height={20} />}
              />
            ) : (
              <SymbolView
                name="iphone"
                size={24}
                tintColor={iconTint}
                fallback={<IphoneIcon width={24} height={24} />}
              />
            )}
          </Pressable>
          {isRunning ? (
            // The device runs: a green dot on its icon.
            <View style={styles.runningDot} testID="device-item-running" />
          ) : null}
          <View flex="1" justify="center">
            <Text numberOfLines={1}>
              {isRemote ? getRemoteSimulatorDeviceName(device) : device.name}
            </Text>
            <Text style={[styles.description, secondaryText]} leading="small">
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
        {isHovered ? (
          // The buttons fade in and out with the hover of the row.
          <Animated.View style={[styles.buttons, { opacity }]}>
            {hasSessionButtons && (
              <>
                <RowButton title={isRemote ? 'Open' : 'Show'} onPress={onPressOpen} />
                {onPressStop ? <RowButton title="Stop" danger onPress={onPressStop} /> : null}
              </>
            )}
            {canLaunchNow && !isDeviceLaunching && <RowButton title="Launch" onPress={launch} />}
            {isRemote && device.state === 'Shutdown' && !isDeviceLaunching && (
              <RowButton title="Start" onPress={launch} />
            )}
          </Animated.View>
        ) : null}
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
  circleShape: { borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  pointer: { cursor: 'pointer' },
  highlight: { borderRadius: 4 },
  buttons: { flexDirection: 'row', alignItems: 'center' },
  // The cloud symbol looks left of center in its frame. This moves it 0.5 pt to the right.
  cloud: { marginLeft: 1 },
  // At the lower right of the icon circle, which is 32 wide at the start of the row.
  runningDot: {
    position: 'absolute',
    left: 22,
    top: 21,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#34C759',
  },
  description: {
    fontSize: 11,
    opacity: 0.8,
  },
  button: {
    marginLeft: 8,
    height: 26,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  spinner: { transform: [{ scale: 0.7 }] },
});
