import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';

// After the pointer leaves, the row stays hovered for this time. If the pointer comes back,
// for example after it crossed the next row on its way to a button, nothing changes.
const LINGER_MS = 140;
const FADE_IN_MS = 70;
const FADE_OUT_MS = 160;

/**
 * Hover state for a row with actions that show on hover. The row is hovered immediately when
 * the pointer enters it. When the pointer leaves, the hover stays for a short time and then
 * fades out. `opacity` goes from 0 to 1 with the hover.
 */
export function useLingeringHover() {
  const [isHovered, setIsHovered] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const onHoverIn = useCallback(() => {
    clearTimeout(timer.current);
    setIsHovered(true);
    Animated.timing(opacity, { toValue: 1, duration: FADE_IN_MS, useNativeDriver: true }).start();
  }, [opacity]);

  const onHoverOut = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: FADE_OUT_MS,
        useNativeDriver: true,
      }).start(({ finished }) => {
        // Not finished: the pointer came back and the fade-in replaced this animation.
        if (finished) {
          setIsHovered(false);
        }
      });
    }, LINGER_MS);
  }, [opacity]);

  useEffect(() => () => clearTimeout(timer.current), []);

  return { isHovered, opacity, onHoverIn, onHoverOut };
}
