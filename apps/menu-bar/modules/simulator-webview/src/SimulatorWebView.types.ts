import { ViewProps } from 'react-native';

export type SimulatorWebViewProps = ViewProps & {
  /** The serve-sim preview URL from an EAS Simulator session's `remoteConfig`. */
  url?: string;
  /**
   * CSS injected into the preview page. Used to hide serve-sim's own panels when
   * Orbit draws the window chrome itself.
   */
  injectedCSS?: string;
  /** Let the page show through a transparent window, for the frameless layout. */
  transparent?: boolean;
  onLoadingChange?: (event: { nativeEvent: { isLoading: boolean } }) => void;
  onLoadError?: (event: { nativeEvent: { message: string } }) => void;
};
