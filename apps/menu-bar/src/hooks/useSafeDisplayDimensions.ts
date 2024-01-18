import { useCallback, useState } from 'react';

import { usePopoverFocusEffect } from './usePopoverFocus';
import MenuBarModule from '../modules/MenuBarModule';

export const SAFE_AREA_FACTOR = 0.85;

const { initialScreenSize } = MenuBarModule;

export const useSafeDisplayDimensions = () => {
  const [dimensions, setDimensions] = useState(initialScreenSize);

  usePopoverFocusEffect(
    useCallback(({ screenSize }) => {
      setDimensions(screenSize);
    }, [])
  );

  return {
    ...dimensions,
    height:
      dimensions.height !== 0
        ? dimensions.height * SAFE_AREA_FACTOR
        : initialScreenSize.height * SAFE_AREA_FACTOR,
    width:
      dimensions.width !== 0
        ? dimensions.width * SAFE_AREA_FACTOR
        : initialScreenSize.width * SAFE_AREA_FACTOR,
  };
};
