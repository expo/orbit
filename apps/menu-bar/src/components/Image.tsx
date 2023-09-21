import { borderRadius, iconSize } from '@expo/styleguide-native';
import { Image as RNImage } from 'react-native';

import { create } from '../utils/create-component-primitive';
import { scale } from '../utils/theme';

export const Image = create(RNImage, {
  base: {
    resizeMode: 'cover',
  },
  variants: {
    size: {
      tiny: {
        height: scale.small,
        width: scale.small,
      },
      small: {
        height: iconSize.small,
        width: iconSize.small,
      },

      large: {
        height: scale['10'],
        width: scale['10'],
      },

      xl: {
        height: scale['20'],
        width: scale['20'],
      },
    },

    rounded: {
      small: { borderRadius: borderRadius.small },
      medium: { borderRadius: borderRadius.medium },
      large: { borderRadius: borderRadius.large },
      huge: { borderRadius: borderRadius.huge },
      full: { borderRadius: 99999 },
    },
  },
});
