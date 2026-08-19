import * as React from 'react';

import { SimulatorWebViewProps } from './SimulatorWebView.types';

/**
 * Electron's <webview> tag, not an <iframe>. A <webview> hosts a separate
 * top-level browsing context, so framing headers do not apply and serve-sim's
 * same-origin /exec token keeps working. Requires `webviewTag: true` on the
 * host BrowserWindow's webPreferences.
 */
type ElectronWebViewElement = HTMLElement & {
  insertCSS: (css: string) => Promise<string>;
  reload: () => void;
};

export default function SimulatorWebView({
  url,
  injectedCSS,
  transparent,
  onLoadingChange,
  onLoadError,
  style,
}: SimulatorWebViewProps) {
  const ref = React.useRef<ElectronWebViewElement | null>(null);

  React.useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    const handleStart = () => onLoadingChange?.({ nativeEvent: { isLoading: true } });
    const handleStop = () => {
      onLoadingChange?.({ nativeEvent: { isLoading: false } });
      if (injectedCSS) {
        // insertCSS survives until the guest navigates, so re-apply on every load.
        element.insertCSS(injectedCSS).catch(() => {});
      }
    };
    const handleFail = (event: Event) => {
      const { errorDescription } = event as Event & { errorDescription?: string };
      onLoadingChange?.({ nativeEvent: { isLoading: false } });
      onLoadError?.({
        nativeEvent: { message: errorDescription ?? 'Failed to load the preview.' },
      });
    };

    element.addEventListener('did-start-loading', handleStart);
    element.addEventListener('did-stop-loading', handleStop);
    element.addEventListener('did-fail-load', handleFail);

    return () => {
      element.removeEventListener('did-start-loading', handleStart);
      element.removeEventListener('did-stop-loading', handleStop);
      element.removeEventListener('did-fail-load', handleFail);
    };
  }, [injectedCSS, onLoadingChange, onLoadError]);

  return React.createElement('webview', {
    ref,
    src: url,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    style: {
      display: 'flex',
      flex: 1,
      width: '100%',
      height: '100%',
      backgroundColor: transparent ? 'transparent' : undefined,
      ...(style as object),
    },
  });
}
