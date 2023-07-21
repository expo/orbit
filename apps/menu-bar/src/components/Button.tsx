import {
  PlatformColor,
  StyleProp,
  StyleSheet,
  TextStyle,
  TouchableOpacity,
  TouchableOpacityProps,
  ViewStyle,
} from 'react-native';
import {darkTheme, lightTheme, palette} from '@expo/styleguide-native';

import {Text} from './Text';
import {useCurrentTheme} from '../utils/useExpoTheme';
import {addOpacity} from '../utils/theme';

type Color = 'default' | 'primary';
interface Props extends TouchableOpacityProps {
  children: string;
  color?: Color;
}

const Button = ({
  children,
  color = 'default',
  disabled,
  ...otherProps
}: Props) => {
  const theme = useCurrentTheme();
  const {textStyle, touchableStyle} = getStylesForColor(color, theme);

  return (
    <TouchableOpacity
      {...otherProps}
      disabled={disabled}
      style={[
        styles.base,
        touchableStyle,
        disabled && styles.disabled,
        otherProps.style,
      ]}>
      <Text style={textStyle} size="tiny" weight="semibold">
        {children}
      </Text>
    </TouchableOpacity>
  );
};

export default Button;

function getStylesForColor(
  color: Color,
  theme: ReturnType<typeof useCurrentTheme>,
) {
  let textStyle: StyleProp<TextStyle> = {};
  let touchableStyle: StyleProp<ViewStyle> = {};

  switch (color) {
    case 'primary':
      touchableStyle = {
        backgroundColor:
          theme === 'light'
            ? addOpacity(lightTheme.background.default, 0.8)
            : addOpacity(darkTheme.background.default, 0.4),
        borderColor:
          theme === 'light'
            ? addOpacity(lightTheme.border.default, 1)
            : 'transparent',
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
  disabled: {
    opacity: 0.7,
  },
});
