import {
  PlatformColor,
  StyleSheet,
  TouchableOpacity,
  TouchableOpacityProps,
} from 'react-native';
import {palette} from '@expo/styleguide-native';

import {Text} from './Text';
import {View} from './View';

interface Props extends TouchableOpacityProps {
  children: string;
}

const Button = ({children, ...otherProps}: Props) => {
  return (
    <View shadow="button">
      <TouchableOpacity
        {...otherProps}
        style={[styles.button, otherProps.style]}>
        <Text style={styles.whiteText} size="tiny" weight="semibold">
          {children}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default Button;

const styles = StyleSheet.create({
  button: {
    height: 32,
    borderRadius: 8,
    backgroundColor: PlatformColor('controlAccentColor'),
    alignItems: 'center',
    justifyContent: 'center',
  },
  whiteText: {
    color: palette.light.white,
  },
});
