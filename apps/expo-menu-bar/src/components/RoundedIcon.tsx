import {PlatformColor, StyleSheet, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

type Props = {
  name: string;
  selected?: boolean;
};

const RoundedIcon = ({name, selected}: Props) => {
  return (
    <View style={styles.container}>
      <View
        style={[
          styles.background,
          {
            backgroundColor: selected
              ? PlatformColor('controlAccentColor')
              : PlatformColor('placeholderTextColor'),
            opacity: selected ? 1 : 0.8,
          },
        ]}
      />
      <Icon name={name} size={15} style={styles.icon} />
    </View>
  );
};

export default RoundedIcon;

const styles = StyleSheet.create({
  container: {
    height: 30,
    width: 30,
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 50,
  },
  icon: {
    color: PlatformColor('alternateSelectedControlTextColor'),
    textAlign: 'center',
  },
});
