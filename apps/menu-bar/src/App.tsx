import React, {useEffect} from 'react';
import {StyleSheet} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import AutoResizerRootView from './components/AutoResizerRootView';
import {WindowsNavigator} from './windows';
import {hasSeenOnboardingStorageKey} from './windows/Onboarding';
import {ThemeProvider} from './providers/ThemeProvider';
import Popover from './popover';
import {SAFE_AREA_FACTOR} from './hooks/useSafeDisplayDimensions';

type Props = {
  isDevWindow: boolean;
};

function App(props: Props) {
  useEffect(() => {
    AsyncStorage.getItem(hasSeenOnboardingStorageKey).then(value => {
      if (!value) {
        WindowsNavigator.open('Onboarding');
      }
    });
  }, []);

  return (
    <AutoResizerRootView
      style={styles.container}
      enabled={!props.isDevWindow}
      maxRelativeHeight={SAFE_AREA_FACTOR}>
      <ThemeProvider themePreference="no-preference">
        <Popover isDevWindow={props.isDevWindow} />
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
