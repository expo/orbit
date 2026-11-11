import { Device } from 'common-types/build/devices';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  ColorValue,
  Easing,
  GestureResponderEvent,
  PanResponder,
  StyleSheet,
  Pressable,
} from 'react-native';

import { Text, secondaryText } from './Text';
import { Row, View } from './View';
import AlertIcon from '../assets/icons/AlertTriangle';
import CableConnectorIcon from '../assets/icons/cable-connector.svg';
import CloudCheckIcon from '../assets/icons/cloud-check.svg';
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
import {
  formatElapsedTime,
  getRemoteSimulatorDeviceName,
  isEndedRemoteSession,
} from '../utils/remoteSimulator';

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
  /** For a session that ended: removes its row. */
  onPressArchive?: () => void;
  /**
   * What Orbit does with the device now, for example `Installing...`. It shows in place of
   * the description, and the icon shows a spinner.
   */
  status?: string;
  /** The device is the default device of its platform. Its icon shows in blue. */
  isDefault?: boolean;
  /** A click on the icon makes the device the default, or removes the default. */
  onPressDefault?: () => void;
  /**
   * The user can drag the row up or down to give it a new position. `rows` is the distance
   * from the start of the drag, in rows.
   */
  reorder?: {
    onMove: (rows: number) => void;
    onEnd: (rows: number) => void;
    onCancel: () => void;
  };
  /** A click with the right mouse button on the row. */
  onContextMenu?: () => void;
  /** The row is the one that the user drags. */
  isDragged?: boolean;
  /** A line that shows where the dragged row goes: above or below this row. */
  dropLine?: 'above' | 'below';
}

const RIGHT_MOUSE_BUTTON = 2;
// react-native-macos puts the mouse button on a touch. The types do not have it.
const getButton = (event: GestureResponderEvent) =>
  (event.nativeEvent as { button?: number }).button;

const DEFAULT_DEVICE_COLOR = '#007AFF';

// The buttons of a row. They do not fade in: they grow to their size with a small overshoot.
const RowButtons = ({ children }: { children: React.ReactNode }) => {
  const [scale] = useState(() => new Animated.Value(0.86));
  useEffect(() => {
    // Not the native driver: it did not work on macOS before the patch in `patches/README.md`.
    // This animation was not tried with it again.
    Animated.timing(scale, {
      toValue: 1,
      duration: 170,
      easing: Easing.out(Easing.back(1.8)),
      useNativeDriver: false,
    }).start();
  }, [scale]);

  return (
    <Animated.View style={[styles.buttons, { transform: [{ scale }] }]}>{children}</Animated.View>
  );
};

const SPINNER_TURN_MS = 800;

// The spinner in the icon of a row. The app draws it: the color of the native spinner of
// macOS does not reach the native view in this app, so it showed white on the grey circle.
// The native driver turns it, so the animation does not use the JavaScript thread. On macOS
// the native driver needs the react-native-macos patch: see `patches/README.md`.
const Spinner = ({ color }: { color: ColorValue }) => {
  const [rotation] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: SPINNER_TURN_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [rotation]);
  const rotate = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  // With the native driver on macOS, a view turns around its top left corner, not around its
  // center. So the view that turns has no size and is at the center, and the arc is around it.
  return (
    <View style={styles.spinner}>
      <Animated.View style={[styles.spinnerCenter, { transform: [{ rotate }] }]}>
        <View style={[styles.spinnerArc, { borderTopColor: color, borderRightColor: color }]} />
      </Animated.View>
    </View>
  );
};

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
  onPressArchive,
  status,
  isDefault = false,
  onPressDefault,
  reorder,
  onContextMenu,
  isDragged = false,
  dropLine,
}: Props) => {
  // The responder of the row: a drag up or down moves the row, and a click with the right
  // mouse button opens the menu of the row. A click with the left button goes to the
  // buttons inside the row.
  const gestures = useRef({ reorder, onContextMenu });
  gestures.current = { reorder, onContextMenu };
  const isRightClick = useRef(false);
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: (event) =>
        getButton(event) === RIGHT_MOUSE_BUTTON && !!gestures.current.onContextMenu,
      onMoveShouldSetPanResponder: (event, { dx, dy }) =>
        !!gestures.current.reorder &&
        getButton(event) !== RIGHT_MOUSE_BUTTON &&
        Math.abs(dy) > 5 &&
        Math.abs(dy) > Math.abs(dx),
      onPanResponderGrant: (event) => {
        isRightClick.current = getButton(event) === RIGHT_MOUSE_BUTTON;
      },
      onPanResponderMove: (_, { dy }) => {
        if (!isRightClick.current) {
          gestures.current.reorder?.onMove(Math.round(dy / DEVICE_ITEM_HEIGHT));
        }
      },
      onPanResponderRelease: (_, { dy }) => {
        if (isRightClick.current) {
          gestures.current.onContextMenu?.();
        } else {
          gestures.current.reorder?.onEnd(Math.round(dy / DEVICE_ITEM_HEIGHT));
        }
      },
      onPanResponderTerminate: () => gestures.current.reorder?.onCancel(),
    })
  ).current;

  const currentTheme = useTheme();
  const { isHovered, isFocused, opacity, onHoverIn, onHoverOut } = useLingeringHover();
  const [isDeviceLaunching, setDeviceLaunching] = useState(false);
  const [isIconHovered, setIsIconHovered] = useState(false);

  // A running session shows the time since it started. The row reads the clock again each
  // half minute, so the text changes on the minute.
  const sessionStartedAt =
    isRemoteDevice(device) && device.state === 'Booted' ? device.startedAt : undefined;
  // A session that ended shows when it ended.
  const sessionEndedAt =
    isRemoteDevice(device) && isEndedRemoteSession(device) ? device.endedAt : undefined;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!sessionStartedAt && !sessionEndedAt) {
      return;
    }
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, [sessionStartedAt, sessionEndedAt]);
  const elapsedTime = sessionStartedAt
    ? ` · running for ${formatElapsedTime(sessionStartedAt, now)}`
    : '';
  const showsDefaultHint = isIconHovered && !!onPressDefault;

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
  const hasSessionButtons =
    canLaunch && (device.state !== 'Shutdown' || !!sessionEndedAt) && !!onPressOpen;
  const isRunning = canLaunch && device.state === 'Booted';
  // The icon shows the state: a spinner while the device starts or has a task, a green dot
  // while it runs.
  const isStarting = (isRemote && device.state === 'Starting') || isDeviceLaunching || !!status;
  const iconTint = isDefault ? '#ffffff' : undefined;
  const circleOpacity = opacity.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] });

  return (
    <View {...panResponder.panHandlers} style={isDragged && styles.dragged}>
      {dropLine ? (
        <View
          style={[styles.dropLine, dropLine === 'above' ? styles.dropAbove : styles.dropBelow]}
        />
      ) : null}
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
            <Animated.View
              // The icon gets its full strength with the hover, in the same fade as the highlight.
              style={[styles.circleFade, { opacity: isDefault ? 1 : circleOpacity }]}>
              <Pressable
                disabled={!onPressDefault}
                onPress={onPressDefault}
                onHoverIn={() => setIsIconHovered(true)}
                onHoverOut={() => setIsIconHovered(false)}
                testID="device-item-default"
                style={[
                  styles.circle,
                  styles.circleShape,
                  onPressDefault && styles.pointer,
                  // A blue ring and a light blue fill show that a click makes this device the
                  // default. The text of the row does not change.
                  showsDefaultHint && !isDefault && styles.defaultRing,
                  {
                    backgroundColor: isDefault
                      ? DEFAULT_DEVICE_COLOR
                      : showsDefaultHint
                        ? 'rgba(0,122,255,.35)'
                        : currentTheme === 'dark'
                          ? 'rgba(255,255,255,.23)'
                          : 'rgba(0,0,0,.16)',
                  },
                ]}>
                {isStarting ? (
                  // The color of the device symbols: dark on the grey circle, white on blue.
                  <Spinner color={iconTint ?? PlatformColor('labelColor')} />
                ) : isRemote ? (
                  <SymbolView
                    // A session that ended shows a cloud with a check mark.
                    name={sessionEndedAt ? 'checkmark.icloud' : 'cloud'}
                    size={22}
                    tintColor={iconTint}
                    style={[styles.cloud, sessionEndedAt && styles.endedCloud]}
                    fallback={
                      sessionEndedAt ? (
                        <CloudCheckIcon width={22} height={22} />
                      ) : (
                        <CloudIcon width={22} height={22} />
                      )
                    }
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
            </Animated.View>
            {isRunning && !isStarting ? (
              // The device runs: a green dot on its icon.
              <View style={styles.runningDot} testID="device-item-running" />
            ) : null}
            <View flex="1" justify="center">
              <Text numberOfLines={1}>
                {isRemote ? getRemoteSimulatorDeviceName(device) : device.name}
              </Text>
              <Row>
                <Text
                  style={[styles.description, styles.shrink, secondaryText]}
                  leading="small"
                  numberOfLines={1}>
                  {status ??
                    (sessionEndedAt
                      ? `Session ended ${formatElapsedTime(sessionEndedAt, now)} ago · `
                      : '') +
                      (isRemote
                        ? device.projectSlug
                          ? `${device.accountName}/${device.projectSlug}`
                          : 'Not running'
                        : capitalize(device.deviceType))}
                  {!status && 'osVersion' in device && ` · ${device.osVersion}`}
                </Text>
                {elapsedTime && !status ? (
                  // A separate text that does not get shorter: when the row has little space,
                  // the project name gets the ellipsis and the time stays in view.
                  <Text style={[styles.description, secondaryText]} leading="small">
                    {elapsedTime}
                  </Text>
                ) : null}
              </Row>
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
          {isFocused && !showsDefaultHint ? (
            // The buttons show when the fade-in of the row ends, and they go away at once
            // when the pointer leaves the row. They also go away while the pointer is on the
            // icon: a click there sets the default device and does not launch.
            <RowButtons>
              {hasSessionButtons && (
                <>
                  <RowButton
                    title={sessionEndedAt ? 'View' : isRemote ? 'Open' : 'Show'}
                    onPress={onPressOpen}
                  />
                  {onPressStop ? <RowButton title="Stop" danger onPress={onPressStop} /> : null}
                  {onPressArchive ? <RowButton title="Archive" onPress={onPressArchive} /> : null}
                </>
              )}
              {canLaunchNow && !isDeviceLaunching && <RowButton title="Launch" onPress={launch} />}
            </RowButtons>
          ) : null}
        </Row>
      </Pressable>
    </View>
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
  circleFade: { marginRight: 8 },
  circle: { width: 32, height: 32 },
  circleShape: { borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  pointer: { cursor: 'pointer' },
  shrink: { flexShrink: 1 },
  defaultRing: { borderWidth: 2, borderColor: DEFAULT_DEVICE_COLOR },
  highlight: { borderRadius: 4 },
  dragged: { opacity: 0.4 },
  dropLine: {
    position: 'absolute',
    left: 14,
    right: 14,
    height: 2,
    borderRadius: 1,
    backgroundColor: DEFAULT_DEVICE_COLOR,
    zIndex: 1,
  },
  dropAbove: { top: -1 },
  dropBelow: { bottom: -1 },
  buttons: { flexDirection: 'row', alignItems: 'center' },
  // The cloud symbol looks left of center in its frame. This moves it 0.5 pt to the right.
  cloud: { marginLeft: 1 },
  // The cloud with the check mark looks low in its frame. This moves it 1.5 pt up.
  endedCloud: { marginTop: -3 },
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
  spinner: { width: 16, height: 16 },
  spinnerCenter: { position: 'absolute', left: 8, top: 8, width: 0, height: 0 },
  spinnerArc: {
    position: 'absolute',
    left: -8,
    top: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
});
