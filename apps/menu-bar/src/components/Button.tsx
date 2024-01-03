import { darkTheme, lightTheme, palette } from '@expo/styleguide-native';
import {
  PlatformColor,
  StyleProp,
  StyleSheet,
  TextStyle,
  TouchableOpacity,
  TouchableOpacityProps,
  ViewStyle,
} from 'react-native';

import { Text } from './Text';
import { addOpacity } from '../utils/theme';
import { useCurrentTheme } from '../utils/useExpoTheme';

type Color = 'default' | 'primary';
type Props = TouchableOpacityProps & {
  color?: Color;
  title: string;
};

const Button = ({ title, color = 'default', disabled, ...otherProps }: Props) => {
  const theme = useCurrentTheme();
  const { textStyle, touchableStyle } = getStylesForColor(color, theme);

  return (
    <TouchableOpacity
      {...otherProps}
      disabled={disabled}
      style={[styles.base, touchableStyle, disabled && styles.disabled, otherProps.style]}>
      <Text style={textStyle} size="tiny" weight="semibold">
        {title}
      </Text>
    </TouchableOpacity>
  );
};

export default Button;

export function getStylesForColor(color: Color, theme: ReturnType<typeof useCurrentTheme>) {
  let textStyle: StyleProp<TextStyle> = {};
  let touchableStyle: StyleProp<ViewStyle> = {};

  switch (color) {
    case 'primary':
      touchableStyle = {
        backgroundColor:
          theme === 'light'
            ? addOpacity(lightTheme.background.default, 0.8)
            : addOpacity(darkTheme.background.default, 0.4),
        borderColor: theme === 'light' ? lightTheme.border.default : darkTheme.border.default,
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
    borderRadius: 6,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.7,
  },
});
