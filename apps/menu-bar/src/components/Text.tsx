import { shadows } from '@expo/styleguide-native';
import { Platform, Text as RNText, TextInput as RNTextInput } from 'react-native';

import { PlatformColor } from '../modules/PlatformColor';
import { create } from '../utils/create-component-primitive';
import { text, textDark, padding, rounded } from '../utils/theme';

/**
 * The style of secondary text in the popover. A system color, so the text stays readable on the
 * popover material in light and dark.
 */
export const secondaryText = { color: PlatformColor('labelColor'), opacity: 0.65 };

export const Text = create(RNText, {
  base: {
    fontSize: 14,
    lineHeight: 18,
    ...Platform.select({
      web: {
        color: 'var(--text-color)',
      },
    }),
  },

  props: {
    accessibilityRole: 'text',
  },

  variants: {
    ...text,
  },

  selectors: {
    dark: textDark,
  },
});

export const TextInput = create(RNTextInput, {
  base: {
    fontSize: 16,
  },

  variants: {
    ...text,

    border: {
      default: {
        borderWidth: 1,
        borderColor: PlatformColor('gridColor'),
      },
    },

    ...rounded,

    ...padding,

    shadow: {
      input: shadows.input,
    },
  },

  selectors: {
    dark: {
      ...textDark,

      border: {
        default: {
          borderColor: PlatformColor('gridColor'),
        },
      },
    },
  },
});
