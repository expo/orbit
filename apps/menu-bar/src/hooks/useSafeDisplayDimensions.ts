import { useCallback, useRef, useState } from 'react';
import { Dimensions } from 'react-native';

import { usePopoverFocusEffect } from './usePopoverFocus';

export const SAFE_AREA_FACTOR = 0.85;

export const useSafeDisplayDimensions = () => {
  const [dimensions, setDimensions] = useState(Dimensions.get('screen'));
  const attemptsToGetDimensions = useRef(0);

  usePopoverFocusEffect(
    useCallback(() => {
      attemptsToGetDimensions.current = 0;
      setDimensions(Dimensions.get('screen'));
    }, [])
  );

  /**
   * Sometimes Dimensions.get('screen') returns height 0 after the computer goes to sleep
   * from one monitor and that same monitor gets unplugged. This workaround attempts to mitigate
   * this problem by waiting 100ms and trying to get the dimensions again.
   */
  if (dimensions?.height === 0 && attemptsToGetDimensions.current < 5) {
    attemptsToGetDimensions.current++;
    setTimeout(() => {
      setDimensions(Dimensions.get('screen'));
    }, 100);
  }

  return {
    ...dimensions,
    height: dimensions.height !== 0 ? dimensions.height * SAFE_AREA_FACTOR : undefined,
    width: dimensions.width * SAFE_AREA_FACTOR,
  };
};
