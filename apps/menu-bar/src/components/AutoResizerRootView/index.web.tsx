import React, { useEffect, useRef } from 'react';
import { requireElectronModule } from 'react-native-electron-modules/build/requireElectronModule';

export const AutoResizerRootViewManager = requireElectronModule<{
  setPopoverSize: (width: number, height: number) => void;
}>('AutoResizerRootViewManager');

const AutoResizerRootView = ({
  maxRelativeHeight,
  enabled,
  children,
  style,
}: {
  enabled: boolean;
  maxRelativeHeight: number;
} & React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>) => {
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentDiv = divRef.current;
    if (!currentDiv) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;

      if (!enabled || !height) {
        return;
      }

      const screenHeight = window.screen.height;
      const maxHeight = screenHeight * maxRelativeHeight;

      const newHeight = height <= maxHeight ? height : maxHeight;

      AutoResizerRootViewManager.setPopoverSize(width, Math.round(newHeight));
    });

    observer.observe(currentDiv);

    return () => {
      observer.unobserve(currentDiv);
    };
  }, [enabled, maxRelativeHeight]);

  return (
    <div
      ref={divRef}
      style={{
        height: 'fit-content',
        backgroundColor: 'var(--popover-background)',
        ...style,
      }}>
      {children}
    </div>
  );
};

export default AutoResizerRootView;
