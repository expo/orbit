import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';

import { Analytics, Event } from './analytics';
import { refreshShellCommandAsync } from './commands/shellCommandAsync';
import AutoResizerRootView from './components/AutoResizerRootView';
import { SAFE_AREA_FACTOR } from './hooks/useSafeDisplayDimensions';
import { useSimulatorCameraBootstrap } from './hooks/useSimulatorCamera';
import Popover from './popover';
import { DevicesProvider } from './providers/DevicesProvider';
import { FluentProvider } from './providers/FluentProvider';
import { ThemeProvider } from './providers/ThemeProvider';

type Props = {
  isDevWindow: boolean;
};

function App(props: Props = { isDevWindow: false }) {
  // Turns the simulator camera back on when it was on; it is off with every launch.
  useSimulatorCameraBootstrap();

  useEffect(() => {
    Analytics.track(Event.APP_OPENED);
    refreshShellCommandAsync().catch(() => {});
  }, []);

  return (
    <AutoResizerRootView
      style={styles.container}
      enabled={!props.isDevWindow}
      maxRelativeHeight={SAFE_AREA_FACTOR}>
      <ThemeProvider themePreference="no-preference">
        <FluentProvider>
          <DevicesProvider>
            <Popover isDevWindow={props.isDevWindow} />
          </DevicesProvider>
        </FluentProvider>
      </ThemeProvider>
    </AutoResizerRootView>
  );
}

export default App;

const styles = StyleSheet.create({
  container: {
    minWidth: 380,
  },
});
