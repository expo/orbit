import React from 'react';
import { StyleSheet } from 'react-native';

import AutoResizerRootView from './components/AutoResizerRootView';
import { SAFE_AREA_FACTOR } from './hooks/useSafeDisplayDimensions';
import Popover from './popover';
import { DevicesProvider } from './providers/DevicesProvider';
import { ThemeProvider } from './providers/ThemeProvider';

type Props = {
  isDevWindow: boolean;
};

function App(props: Props) {
  return (
    <AutoResizerRootView
      style={styles.container}
      enabled={!props.isDevWindow}
      maxRelativeHeight={SAFE_AREA_FACTOR}>
      <ThemeProvider themePreference="no-preference">
        <DevicesProvider>
          <Popover isDevWindow={props.isDevWindow} />
        </DevicesProvider>
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
