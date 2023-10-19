import { lightTheme, darkTheme, shadows, palette } from '@expo/styleguide-native';
import { View as RNView, StyleSheet } from 'react-native';

import { create } from '../utils/create-component-primitive';
import {
  scale,
  padding,
  margin,
  rounded,
  bg,
  bgDark,
  width,
  height,
  borderDark,
  border,
  gap,
  addOpacity,
} from '../utils/theme';

export const View = create(RNView, {
  variants: {
    overflow: {
      hidden: {
        overflow: 'hidden',
      },
    },

    align: {
      centered: {
        justifyContent: 'center',
        alignItems: 'center',
      },
      start: {
        alignItems: 'flex-start',
      },
    },

    flex: {
      '1': { flex: 1 },
      '0': { flex: 0 },
    },

    shrink: {
      '1': { flexShrink: 1 },
      '0': { flexShrink: 0 },
    },

    grow: {
      '1': { flexGrow: 1 },
      '0': { flexGrow: 0 },
    },

    bg,

    opacity: {
      '1': { opacity: 1 },
      '0.5': { opacity: 0.5 },
      '0.75': { opacity: 0.75 },
      '0': { opacity: 0 },
    },

    inset: {
      top: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
      },

      bottom: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
      },

      full: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      },
    },

    border: {
      default: { borderColor: lightTheme.border.default, borderWidth: 1 },
      light: { borderColor: addOpacity(lightTheme.border.default, 0.2), borderWidth: 1 },
      hairline: {
        borderColor: lightTheme.border.default,
        borderWidth: StyleSheet.hairlineWidth,
      },
      warning: { borderColor: lightTheme.border.warning, borderWidth: 1 },
      error: { borderColor: lightTheme.border.error, borderWidth: 1 },
    },

    ...rounded,

    shadow: {
      micro: shadows.micro,
      tiny: { ...shadows.tiny, shadowOpacity: 0.075 },
      small: shadows.small,
      medium: shadows.medium,
      button: shadows.button,
    },

    width,
    height,

    ...padding,
    ...margin,
    gap,

    justify: {
      center: { justifyContent: 'center' },
      start: { justifyContent: 'flex-start' },
      end: { justifyContent: 'flex-end' },
      between: { justifyContent: 'space-between' },
      around: { justifyContent: 'space-around' },
    },
  },

  selectors: {
    dark: {
      bg: bgDark,
      border: borderDark,
    },

    light: {
      bg: {},
    },
  },
});

export const Row = create(RNView, {
  base: {
    flexDirection: 'row',
  },

  variants: {
    bg,

    flex: {
      '1': { flex: 1 },
      '0': { flex: 0 },
    },

    shrink: {
      '1': { flexShrink: 1 },
      '0': { flexShrink: 0 },
    },

    grow: {
      '1': { flexGrow: 1 },
      '0': { flexGrow: 0 },
    },

    align: {
      center: { alignItems: 'center' },
      start: { alignItems: 'flex-start' },
      end: { alignItems: 'flex-end' },
    },

    justify: {
      center: { justifyContent: 'center' },
      start: { justifyContent: 'flex-start' },
      end: { justifyContent: 'flex-end' },
      between: { justifyContent: 'space-between' },
      around: { justifyContent: 'space-around' },
    },

    ...padding,
    ...margin,
    gap,

    ...rounded,

    border,
  },

  selectors: {
    dark: {
      bg: bgDark,
      border: borderDark,
    },
  },
});

const Horizontal = create(RNView, {
  base: {
    flex: 1,
  },
  variants: {
    bg,
    size: {
      micro: { width: scale.micro, flex: 0 },
      tiny: { width: scale.tiny, flex: 0 },
      small: { width: scale.small, flex: 0 },
      medium: { width: scale.medium, flex: 0 },
      large: { width: scale.large, flex: 0 },
      xl: { width: scale.xl, flex: 0 },
    },
  },

  selectors: {
    dark: {
      bg: bgDark,
    },
  },
});

const Vertical = create(RNView, {
  base: {
    flex: 1,
  },
  variants: {
    bg,
    size: {
      micro: { height: scale.micro, flex: 0 },
      tiny: { height: scale.tiny, flex: 0 },
      small: { height: scale.small, flex: 0 },
      medium: { height: scale.medium, flex: 0 },
      large: { height: scale.large, flex: 0 },
      xl: { height: scale.xl, flex: 0 },
    },
  },

  selectors: {
    dark: {
      bg: bgDark,
    },
  },
});

export const Spacer = {
  Vertical,
  Horizontal,
};

export const Divider = create(RNView, {
  base: {
    height: 1,
    backgroundColor: palette.light.gray['700'],
    opacity: 0.1,
  },

  variants: {
    weight: {
      thin: { height: StyleSheet.hairlineWidth },
      normal: { height: 1 },
      heavy: { height: 2 },
    },

    ...margin,
  },

  selectors: {
    dark: {
      base: {
        height: 1,
        backgroundColor: palette.dark.gray['700'],
      },
    },
  },
});

export const StatusIndicator = create(RNView, {
  base: {
    backgroundColor: lightTheme.status.default,
    borderRadius: 9999,
  },

  variants: {
    status: {
      info: { backgroundColor: lightTheme.status.info },
      success: { backgroundColor: lightTheme.status.success },
      warning: { backgroundColor: lightTheme.status.warning },
      error: { backgroundColor: lightTheme.status.error },
      default: { backgroundColor: lightTheme.status.default },
    },

    size: {
      small: {
        width: scale.small,
        height: scale.small,
      },
      medium: {
        width: scale.medium,
        height: scale.medium,
      },
    },
  },

  selectors: {
    dark: {
      info: { backgroundColor: darkTheme.status.info },
      success: { backgroundColor: darkTheme.status.success },
      warning: { backgroundColor: darkTheme.status.warning },
      error: { backgroundColor: darkTheme.status.error },
      default: { backgroundColor: darkTheme.status.default },
    },
  },
});
