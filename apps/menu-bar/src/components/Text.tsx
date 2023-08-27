import { shadows } from '@expo/styleguide-native';
import { PlatformColor, Text as RNText, TextInput as RNTextInput } from 'react-native';

import { create } from '../utils/create-component-primitive';
import { text, textDark, padding, rounded } from '../utils/theme';

export const Text = create(RNText, {
  base: {
    fontSize: 14,
    lineHeight: 18,
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
