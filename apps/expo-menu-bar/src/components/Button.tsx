import {
  PlatformColor,
  StyleProp,
  StyleSheet,
  TextStyle,
  TouchableOpacity,
  TouchableOpacityProps,
  ViewStyle,
} from 'react-native';
import {palette, shadows} from '@expo/styleguide-native';

import {Text} from './Text';
import {View} from './View';
import {ExpoTheme, useExpoTheme} from '../utils/useExpoTheme';

type Color = 'default' | 'primary';
interface Props extends TouchableOpacityProps {
  children: string;
  color?: Color;
}

const Button = ({children, color = 'default', ...otherProps}: Props) => {
  const expoTheme = useExpoTheme();
  const {textStyle, touchableStyle} = getStylesForColor(color, expoTheme);

  return (
    <View shadow="button">
      <TouchableOpacity
        {...otherProps}
        style={[styles.base, touchableStyle, otherProps.style]}>
        <Text style={textStyle} size="tiny" weight="semibold">
          {children}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default Button;

function getStylesForColor(color: Color, theme: ExpoTheme) {
  let textStyle: StyleProp<TextStyle> = {};
  let touchableStyle: StyleProp<ViewStyle> = {};

  switch (color) {
    case 'primary':
      touchableStyle = {
        ...shadows.tiny,
        shadowOpacity: 0.075,
        backgroundColor: theme.background.default,
        borderColor: theme.border.default,
        borderWidth: 1,
      };

      break;
    case 'default':
    default:
      touchableStyle = {
        backgroundColor: PlatformColor('controlAccentColor'),
      };
      textStyle = {
        color: palette.light.white,
      };
      break;
  }

  return {
    textStyle,
    touchableStyle,
  };
}

const styles = StyleSheet.create({
  base: {
    height: 32,
    borderRadius: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
