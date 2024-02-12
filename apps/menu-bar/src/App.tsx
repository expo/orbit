import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';

import { Analytics, Event } from './analytics';
import AutoResizerRootView from './components/AutoResizerRootView';
import { SAFE_AREA_FACTOR } from './hooks/useSafeDisplayDimensions';
import Popover from './popover';
import { DevicesProvider } from './providers/DevicesProvider';
import { FluentProvider } from './providers/FluentProvider';
import { ThemeProvider } from './providers/ThemeProvider';

type Props = {
  isDevWindow: boolean;
};

function App(props: Props) {
  useEffect(() => {
    Analytics.track(Event.APP_OPENED);
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

App.defaultProps = {
  isDevWindow: false,
};

export default App;

const styles = StyleSheet.create({
  container: {
    minWidth: 380,
  },
});
