import {StyleSheet, Pressable, PlatformColor} from 'react-native';
import {useState} from 'react';

import {Device} from '../utils/device';
import {Row, View} from './View';
import {Text} from './Text';
import IphoneIcon from '../assets/icons/iphone.svg';
import WifiIcon from '../assets/icons/wifi.svg';
import CableConnectorIcon from '../assets/icons/cable-connector.svg';
import {useExpoTheme} from '../utils/useExpoTheme';
import Button from './Button';
import {palette} from '@expo/styleguide-native';
import {useTheme} from '../providers/ThemeProvider';

interface Props {
  device: Device;
  onPress: () => void;
  onPressLaunch: () => void;
  selected?: boolean;
}

const DeviceItem = ({device, onPress, onPressLaunch, selected}: Props) => {
  const theme = useExpoTheme();
  const currentTheme = useTheme();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Pressable
      style={[
        styles.row,
        // eslint-disable-next-line react-native/no-inline-styles
        isHovered && {
          backgroundColor:
            currentTheme === 'dark'
              ? 'rgba(255,255,255,.08)'
              : 'rgba(0,0,0,.12)',
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
              // eslint-disable-next-line react-native/no-inline-styles
              (isHovered || selected) && {opacity: 1},
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
            <Text style={styles.description} color="secondary">
              {device.osType} {device.osVersion}
              {device.state === 'Booted' ? ' - Running' : ''}
            </Text>
          </View>
        </Row>
        {device.deviceType === 'device' ? (
          <>
            {device.connectionType === 'Network' ? (
              <WifiIcon height={20} width={20} fill={PlatformColor('text')} />
            ) : (
              <CableConnectorIcon
                height={24}
                width={24}
                fill={PlatformColor('text')}
              />
            )}
          </>
        ) : isHovered && device.state === 'Shutdown' ? (
          <Button color="primary" onPress={onPressLaunch} style={styles.button}>
            Launch
          </Button>
        ) : null}
      </Row>
    </Pressable>
  );
};

export default DeviceItem;

const styles = StyleSheet.create({
  row: {
    height: 46,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 6,
    borderRadius: 4,
  },
  circle: {width: 36, height: 36, marginRight: 8, opacity: 0.85},
  description: {
    fontSize: 11,
    lineHeight: 13,
    opacity: 0.8,
  },
  button: {
    marginLeft: 8,
  },
});
