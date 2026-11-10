import { useState } from 'react';
import { StyleSheet, Pressable } from 'react-native';

import { DEVICE_ITEM_HEIGHT } from './DeviceItem';
import { Text } from './Text';
import { Row, View } from './View';
import { PlatformColor } from '../modules/PlatformColor';
import { useTheme } from '../providers/ThemeProvider';

interface Props {
  title: string;
  subtitle: string;
  onPress: () => void;
  testID?: string;
}

// A row with the shape of a device row that adds a device to its section.
const AddDeviceItem = ({ title, subtitle, onPress, testID }: Props) => {
  const currentTheme = useTheme();
  const [isHovered, setIsHovered] = useState(false);

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
      testID={testID}>
      <Row flex="1" px="2" align="center">
        <View
          rounded="full"
          align="centered"
          style={[
            styles.circle,
            isHovered && { opacity: 1 },
            // The same fill as the circle of a device row.
            {
              backgroundColor:
                currentTheme === 'dark' ? 'rgba(255,255,255,.23)' : 'rgba(0,0,0,.16)',
            },
          ]}>
          <View style={[styles.plus, styles.plusHorizontal]} />
          <View style={[styles.plus, styles.plusVertical]} />
        </View>
        <View flex="1" justify="center" style={!isHovered && styles.dimmed}>
          <Text numberOfLines={1}>{title}</Text>
          <Text style={styles.description} color="secondary" leading="small" numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
      </Row>
    </Pressable>
  );
};

export default AddDeviceItem;

const styles = StyleSheet.create({
  row: {
    height: DEVICE_ITEM_HEIGHT,
    alignItems: 'center',
    flexDirection: 'row',
    marginHorizontal: 6,
    borderRadius: 4,
  },
  circle: {
    width: 32,
    height: 32,
    marginRight: 8,
    opacity: 0.8,
  },
  plus: {
    position: 'absolute',
    borderRadius: 1,
    backgroundColor: PlatformColor('labelColor'),
    opacity: 0.7,
  },
  plusHorizontal: { width: 12, height: 1.5 },
  plusVertical: { width: 1.5, height: 12 },
  dimmed: { opacity: 0.75 },
  description: {
    fontSize: 11,
    opacity: 0.8,
  },
});
