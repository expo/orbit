import { palette } from '@expo/styleguide-native';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TouchableOpacity } from 'react-native';

import { Text } from './Text';
import { Row, View } from './View';
import CloudIcon from '../assets/icons/cloud.svg';
import { PlatformColor } from '../modules/PlatformColor';
import { useTheme } from '../providers/ThemeProvider';
import { CloudSimulatorSession, formatElapsedTime, getPreviewUrl } from '../utils/cloudSimulator';

export const CLOUD_SIMULATOR_ITEM_HEIGHT = 42;

interface Props {
  session: CloudSimulatorSession;
  onPress: () => void;
  onPressStop: () => void;
}

const CloudSimulatorItem = ({ session, onPress, onPressStop }: Props) => {
  const currentTheme = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const isReady = Boolean(getPreviewUrl(session));

  // A running session bills the account, so the elapsed time has to stay honest
  // rather than freeze at whatever it was when the popover last rendered.
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

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
      onHoverOut={() => setIsHovered(false)}
      testID="cloud-simulator-item">
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
            <SymbolView
              name="cloud"
              size={20}
              tintColor={currentTheme === 'light' ? palette.dark.white : undefined}
              fallback={<CloudIcon width={20} height={20} />}
            />
          </View>
          <View flex="1" justify="center">
            <Text numberOfLines={1}>{session.name ?? 'Cloud simulator'}</Text>
            <Text style={styles.description} color="secondary" leading="small">
              {isReady ? 'Preview' : 'Starting'} · {formatElapsedTime(session.startedAt, now)}
            </Text>
          </View>
        </Row>
        {isHovered ? (
          <TouchableOpacity onPress={onPressStop} style={styles.stopButton}>
            <Text size="tiny" color="error">
              Stop
            </Text>
          </TouchableOpacity>
        ) : null}
      </Row>
    </Pressable>
  );
};

export default CloudSimulatorItem;

const styles = StyleSheet.create({
  row: {
    height: CLOUD_SIMULATOR_ITEM_HEIGHT,
    justifyContent: 'center',
    marginHorizontal: 6,
    borderRadius: 4,
  },
  circle: {
    height: 28,
    width: 28,
    marginRight: 8,
    opacity: 0.8,
  },
  description: {
    fontSize: 10,
  },
  stopButton: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderColor: PlatformColor('separatorColor'),
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 4,
  },
});
