import {
  PlatformColor,
  StyleSheet,
  Text,
  TouchableHighlight,
  View,
} from 'react-native';

import RoundedIcon from './RoundedIcon';
import {Device, getDeviceOS} from '../utils/device';

interface Props {
  device: Device;
  onPress: () => void;
  selected?: boolean;
}

const DeviceItem = ({device, onPress, selected}: Props) => {
  const platform = getDeviceOS(device);

  return (
    <TouchableHighlight
      style={styles.row}
      onPress={onPress}
      underlayColor={PlatformColor('highlightColor')}>
      <>
        <RoundedIcon
          name={`phone-portrait-${platform === 'ios' ? 'outline' : 'sharp'}`}
          selected={selected}
        />
        <View>
          <Text>{device.name}</Text>
          <Text style={styles.description}>
            {device.osType} {device.osVersion} - {device.state}
          </Text>
        </View>
      </>
    </TouchableHighlight>
  );
};

export default DeviceItem;

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 5,
    height: 40,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    borderRadius: 4,
  },
  description: {
    fontSize: 11,
    opacity: 0.5,
  },
});
