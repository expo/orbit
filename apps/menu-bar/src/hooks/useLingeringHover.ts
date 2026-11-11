import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';

const FADE_IN_MS = 120;
const FADE_OUT_MS = 200;
// After the fade-in, the row waits this long before it is focused. So the buttons do not
// show on each row when the pointer goes up or down across the rows.
const FOCUS_DELAY_MS = 80;

/**
 * Hover state for a row with actions that show on hover. The hover fades in when the pointer
 * enters the row and starts to fade out immediately when the pointer leaves. If the pointer
 * comes back during the fade-out, for example after it crossed the next row on its way to a
 * button, the fade reverses from where it is. `opacity` goes from 0 to 1 with the hover.
 * `isHovered` is true from the start of the fade-in to the end of the fade-out.
 */
export function useLingeringHover() {
  const [isHovered, setIsHovered] = useState(false);
  // The fade-in ended, a short time passed, and the pointer is still on the row. The buttons of the row show only
  // in this state: they do not fade.
  const [isFocused, setIsFocusedState] = useState(false);
  const isFocusedRef = useRef(false);
  const wasFocusedBeforeFadeOut = useRef(false);
  const setIsFocused = useCallback((value: boolean) => {
    isFocusedRef.current = value;
    setIsFocusedState(value);
  }, []);
  const [opacity] = useState(() => new Animated.Value(0));
  const focusTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(focusTimer.current), []);

  const fadeOut = useCallback(() => {
    clearTimeout(focusTimer.current);
    wasFocusedBeforeFadeOut.current = isFocusedRef.current;
    setIsFocused(false);
    // Not the native driver: with it, the opacity stayed at 0 on macOS before the patch in
    // `patches/README.md`. This animation was not tried with it again.
    Animated.timing(opacity, {
      toValue: 0,
      duration: FADE_OUT_MS,
      useNativeDriver: false,
    }).start(({ finished }) => {
      // Not finished: the pointer came back and the fade-in replaced this animation.
      if (finished) {
        setIsHovered(false);
      }
    });
  }, [opacity, setIsFocused]);

  const onHoverIn = useCallback(() => {
    wasFocusedBeforeFadeOut.current = false;
    setIsHovered(true);
    // A new animation stops the one that runs and starts from the current opacity.
    Animated.timing(opacity, { toValue: 1, duration: FADE_IN_MS, useNativeDriver: false }).start(
      ({ finished }) => {
        if (finished) {
          clearTimeout(focusTimer.current);
          focusTimer.current = setTimeout(() => setIsFocused(true), FOCUS_DELAY_MS);
        }
      }
    );
  }, [opacity, setIsFocused]);

  // On web, the pointer that enters a Pressable inside the row ends the hover of the row at once
  // (react-native-web Pressable has `contain`). The inner Pressable calls this from its hover-in,
  // so the row stays hovered and its buttons stay.
  const onChildHoverIn = useCallback(() => {
    if (wasFocusedBeforeFadeOut.current) {
      clearTimeout(focusTimer.current);
      setIsFocused(true);
    }
    onHoverIn();
  }, [onHoverIn, setIsFocused]);

  return { isHovered, isFocused, opacity, onHoverIn, onHoverOut: fadeOut, onChildHoverIn };
}
