import {
  spacing,
  lightTheme,
  darkTheme,
  borderRadius,
  typography,
  palette,
} from '@expo/styleguide-native';
import { TextStyle, Platform, StyleSheet } from 'react-native';

import { PlatformColor } from '../modules/PlatformColor';

type SpacingKey = `${keyof typeof spacing}`;
type DescriptiveScale = 'micro' | 'tiny' | 'small' | 'medium' | 'large' | 'xl';
type ScaleKey = SpacingKey | DescriptiveScale;
type Scale = Record<ScaleKey, number>;

export const scale: Scale = {
  micro: spacing[0.5],
  tiny: spacing[1],
  small: spacing[3],
  medium: spacing[4],
  large: spacing[6],
  xl: spacing[8],
  ...spacing,
};

function fullSpacingScaleForAttributes(attributes: string[]) {
  const obj: { [scaleKey: string]: any } = {};

  Object.keys(scale).forEach((key) => {
    key = `${key}`;
    const value: { [attribute: string]: number } = {};

    attributes.forEach((attribute) => {
      value[attribute] = scale[key as ScaleKey];
    });

    obj[key] = value;
  });

  return obj as Record<SpacingKey | DescriptiveScale, any>;
}

export const padding = {
  padding: fullSpacingScaleForAttributes(['padding']),
  px: fullSpacingScaleForAttributes(['paddingHorizontal']),
  py: fullSpacingScaleForAttributes(['paddingVertical']),
  pb: fullSpacingScaleForAttributes(['paddingBottom']),
  pt: fullSpacingScaleForAttributes(['paddingTop']),
};

export const margin = {
  margin: fullSpacingScaleForAttributes(['margin']),
  mx: fullSpacingScaleForAttributes(['marginHorizontal']),
  my: fullSpacingScaleForAttributes(['marginVertical']),
  mb: fullSpacingScaleForAttributes(['marginBottom']),
  mt: fullSpacingScaleForAttributes(['marginTop']),
};

export const gap = fullSpacingScaleForAttributes(['gap']);
export const width = fullSpacingScaleForAttributes(['width']);
export const height = fullSpacingScaleForAttributes(['height']);

export const rounded = {
  rounded: {
    none: { borderRadius: 0 },
    small: { borderRadius: borderRadius.small },
    medium: { borderRadius: borderRadius.medium },
    large: { borderRadius: borderRadius.large },
    full: { borderRadius: 99999 },
  },

  roundedTop: {
    none: { borderTopLeftRadius: 0, borderTopRightRadius: 0 },
    small: {
      borderTopLeftRadius: borderRadius.small,
      borderTopRightRadius: borderRadius.small,
    },
    medium: {
      borderTopLeftRadius: borderRadius.medium,
      borderTopRightRadius: borderRadius.medium,
    },
    large: {
      borderTopLeftRadius: borderRadius.large,
      borderTopRightRadius: borderRadius.large,
    },
    full: { borderTopLeftRadius: 9999, borderTopRightRadius: 9999 },
  },

  roundedBottom: {
    none: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
    small: {
      borderBottomLeftRadius: borderRadius.small,
      borderBottomRightRadius: borderRadius.small,
    },
    medium: {
      borderBottomLeftRadius: borderRadius.medium,
      borderBottomRightRadius: borderRadius.medium,
    },
    large: {
      borderBottomLeftRadius: borderRadius.large,
      borderBottomRightRadius: borderRadius.large,
    },
    full: { borderBottomLeftRadius: 9999, borderBottomRightRadius: 9999 },
  },
};

export const text = {
  align: {
    center: { textAlign: 'center' as TextStyle['textAlign'] },
  },

  size: {
    tiny: typography.fontSizes[12],
    small: typography.fontSizes[13],
    medium: typography.fontSizes[16],
    large: typography.fontSizes[18],
  },

  leading: {
    large: { lineHeight: 18 },
    medium: { lineHeight: 15 },
    small: { lineHeight: 13 },
  },

  type: {
    mono: {
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    InterBlack: { fontFamily: 'Inter-Black' },
    InterBlackItalic: { fontFamily: 'Inter-BlackItalic' },
    InterBold: { fontFamily: 'Inter-Bold' },
    InterBoldItalic: { fontFamily: 'Inter-BoldItalic' },
    InterExtraBold: { fontFamily: 'Inter-ExtraBold' },
    InterExtraBoldItalic: { fontFamily: 'Inter-ExtraBoldItalic' },
    InterExtraLight: { fontFamily: 'Inter-ExtraLight' },
    InterExtraLightItalic: { fontFamily: 'Inter-ExtraLightItalic' },
    InterRegular: { fontFamily: 'Inter-Regular' },
    InterItalic: { fontFamily: 'Inter-Italic' },
    InterLight: { fontFamily: 'Inter-Light' },
    InterLightItalic: { fontFamily: 'Inter-LightItalic' },
    InterMedium: { fontFamily: 'Inter-Medium' },
    InterMediumItalic: { fontFamily: 'Inter-MediumItalic' },
    InterSemiBold: { fontFamily: 'Inter-SemiBold' },
    InterSemiBoldItalic: { fontFamily: 'Inter-SemiBoldItalic' },
    InterThin: { fontFamily: 'Inter-Thin' },
    InterThinItalic: { fontFamily: 'Inter-ThinItalic' },
  },

  weight: {
    thin: {
      fontFamily: 'Inter-Thin',
      fontWeight: '100' as TextStyle['fontWeight'],
    },
    extralight: {
      fontFamily: 'Inter-ExtraLight',
      fontWeight: '200' as TextStyle['fontWeight'],
    },
    light: {
      fontFamily: 'Inter-Light',
      fontWeight: '300' as TextStyle['fontWeight'],
    },
    normal: {
      fontFamily: 'Inter-Regular',
      fontWeight: '400' as TextStyle['fontWeight'],
    },
    medium: {
      fontFamily: 'Inter-Medium',
      fontWeight: '500' as TextStyle['fontWeight'],
    },
    semibold: {
      fontFamily: 'Inter-SemiBold',
      fontWeight: '600' as TextStyle['fontWeight'],
    },
    bold: {
      fontFamily: 'Inter-Bold',
      fontWeight: '700' as TextStyle['fontWeight'],
    },
    extrabold: {
      fontFamily: 'Inter-ExtraBold',
      fontWeight: '800' as TextStyle['fontWeight'],
    },
    black: {
      fontFamily: 'Inter-Black',
      fontWeight: '900' as TextStyle['fontWeight'],
    },
  },

  color: {
    default: {
      ...Platform.select({
        native: {
          color: PlatformColor('labelColor'),
        },
        web: {
          color: 'var(--label-color)',
        },
      }),
    },
    error: { color: lightTheme.text.error },
    warning: { color: lightTheme.text.warning },
    success: { color: lightTheme.text.success },
    secondary: { color: palette.light.gray['800'] },
    primary: { color: lightTheme.button.primary.background },
    link: { color: lightTheme.link.default },
  },
};

export const textDark = {
  color: {
    default: {
      ...Platform.select({
        native: {
          color: PlatformColor('labelColor'),
        },
        web: {
          color: 'var(--label-color)',
        },
      }),
    },
    error: { color: darkTheme.text.error },
    warning: { color: darkTheme.text.warning },
    success: { color: darkTheme.text.success },
    secondary: { color: palette.dark.gray['800'] },
    primary: { color: darkTheme.button.primary.background },
    link: { color: darkTheme.link.default },
  },
};

export const bg = {
  none: { backgroundColor: 'transparent' },
  default: { backgroundColor: lightTheme.background.default },
  secondary: { backgroundColor: lightTheme.background.secondary },
  overlay: { backgroundColor: lightTheme.background.overlay },
  success: { backgroundColor: lightTheme.background.success },
  warning: { backgroundColor: lightTheme.background.warning },
  error: { backgroundColor: lightTheme.background.error },
};

export const bgDark = {
  default: { backgroundColor: darkTheme.background.default },
  secondary: { backgroundColor: darkTheme.background.secondary },
  overlay: { backgroundColor: darkTheme.background.overlay },
  success: { backgroundColor: darkTheme.background.success },
  warning: { backgroundColor: darkTheme.background.warning },
  error: { backgroundColor: darkTheme.background.error },
};

export const border = {
  default: {
    ...Platform.select({
      native: {
        borderColor: PlatformColor('gridColor'),
      },
      web: {
        borderColor: 'var(--grid-color)',
      },
    }),
    borderWidth: 1,
  },
  light: { borderColor: addOpacity(lightTheme.border.default, 0.2), borderWidth: 1 },
  warning: { borderColor: lightTheme.border.warning, borderWidth: 1 },
  hairline: {
    borderColor: lightTheme.border.default,
    borderWidth: StyleSheet.hairlineWidth,
  },
};

export const borderDark = {
  default: {
    ...Platform.select({
      native: {
        borderColor: PlatformColor('controlColor'),
      },
      web: {
        borderColor: 'var(--control-color)',
      },
    }),
    borderWidth: 1,
  },
  warning: { borderColor: darkTheme.border.warning, borderWidth: 1 },
  error: { borderColor: darkTheme.border.error, borderWidth: 1 },
  hairline: {
    borderColor: darkTheme.border.default,
    borderWidth: StyleSheet.hairlineWidth,
  },
};

export function addOpacity(colorString: string, opacity: number) {
  const opacityHex = Math.round(opacity * 255).toString(16);

  let color = colorString.replace('#', '').substring(0, 6);
  if (color.length === 3) {
    const [r, g, b] = color;
    color = r + r + g + g + b + b;
  }

  return `#${color}${opacityHex}`;
}

const COLORS_MAP = {
  'app-cyan': '#07c0cb',
  'app-light-blue': '#1e92c4',
  'app-dark-blue': '#0b67af',
  'app-indigo': '#4b50b2',
  'app-purple': '#8945a3',
  'app-pink': '#c04891',
  'app-orange': '#e96d3c',
  'app-gold': '#f38f2f',
  'app-yellow': '#eebc01',
  'app-lime': '#aabd04',
  'app-light-green': '#6aa72a',
  'app-dark-green': '#3a8e39',
} as const;

const COLORS = Object.values(COLORS_MAP);

function hashNameToColorIndex(name: string) {
  return Array.from(name).reduce((acc, val) => (acc * 31 + val.charCodeAt(0)) % COLORS.length, 0);
}

export function getProjectBackgroundColor(name: string) {
  return COLORS[hashNameToColorIndex(name)];
}
