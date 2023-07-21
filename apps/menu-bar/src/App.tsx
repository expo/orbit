import React, {useEffect} from 'react';
import {StyleSheet, Dimensions} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import AutoResizerRootView from './components/AutoResizerRootView';
import {WindowsNavigator} from './windows';
import {hasSeenOnboardingStorageKey} from './windows/Onboarding';
import {ThemeProvider} from './providers/ThemeProvider';
import Popover from './popover';

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
    <AutoResizerRootView style={styles.container} enabled={!props.isDevWindow}>
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
    maxHeight: Dimensions.get('screen').height * 0.85,
  },
});
