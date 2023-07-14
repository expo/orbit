import {Image, StyleSheet} from 'react-native';
import {useEffect, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {lightTheme} from '@expo/styleguide-native';

import {WindowsNavigator} from './index';
import CommandCheckItem from '../components/CommandCheckItem';
import MenuBarModule from '../modules/MenuBarModule';
import AndroidStudio from '../assets/images/android-studio.png';
import Xcode from '../assets/images/xcode.png';
import Background from '../assets/images/onboarding/background.png';
import Logo from '../assets/images/onboarding/logo.svg';
import ExpoOrbitText from '../assets/images/onboarding/expo-orbit-text.svg';
import {Text, View} from '../components';
import Button from '../components/Button';
import {useExpoTheme} from '../utils/useExpoTheme';

export const hasSeenOnboardingStorageKey = 'has-seen-onboarding';

type PlatformToolsCheck = {
  android?: {success: boolean; reason?: string};
  ios?: {success: boolean; reason?: string};
};

const Onboarding = () => {
  const theme = useExpoTheme();
  const [platformToolsCheck, setPlatformToolsCheck] =
    useState<PlatformToolsCheck>({});

  const closeOnboarding = () => {
    AsyncStorage.setItem(hasSeenOnboardingStorageKey, 'true').then(() => {
      WindowsNavigator.close('Onboarding');
    });
  };

  useEffect(() => {
    MenuBarModule.runCli('check-tools', []).then(output => {
      setPlatformToolsCheck(eval(`(${output})`));
    });
  }, []);

  return (
    <View flex="1" bg="default">
      <View style={styles.header} pt="2.5">
        <Image source={Background} style={styles.background} />
        <Logo />
        <View mt="medium" mb="2">
          <ExpoOrbitText />
        </View>
        <Text size="small" style={styles.subtitle}>
          Download and launch builds.
        </Text>
      </View>
      <View
        padding="large"
        style={[styles.container, {borderBottomColor: theme.border.default}]}>
        <View>
          <Text weight="bold">Pre-flight checklist</Text>
          <Text size="small" color="secondary">
            Configure developer tools to get the most out of Orbit.
          </Text>
        </View>
        <CommandCheckItem
          title="Android Studio"
          description="Install Android Studio to manage devices and install apps on Android"
          icon={AndroidStudio}
          {...platformToolsCheck?.android}
        />
        <CommandCheckItem
          title="Xcode"
          description="Install Xcode to manage devices and install apps on iOS"
          icon={Xcode}
          {...platformToolsCheck?.ios}
        />
      </View>
      <View px="large" py="medium">
        <Button onPress={closeOnboarding}>Get Started</Button>
      </View>
    </View>
  );
};

export default Onboarding;

const styles = StyleSheet.create({
  header: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    height: 250,
    overflow: 'hidden',
    backgroundColor: 'black',
  },
  container: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: lightTheme.border.default,
    gap: 14,
  },
  subtitle: {
    color: '#E1EDFF',
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
