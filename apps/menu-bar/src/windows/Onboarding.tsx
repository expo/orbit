import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet } from 'react-native';

import { WindowsNavigator } from './index';
import AndroidStudio from '../assets/images/android-studio.png';
import Background from '../assets/images/onboarding/background.png';
import ExpoOrbitText from '../assets/images/onboarding/expo-orbit-text.svg';
import Logo from '../assets/images/onboarding/logo.svg';
import Xcode from '../assets/images/xcode.png';
import { Text, View } from '../components';
import Button from '../components/Button';
import CommandCheckItem from '../components/CommandCheckItem';
import MenuBarModule from '../modules/MenuBarModule';
import { useExpoTheme } from '../utils/useExpoTheme';

export const hasSeenOnboardingStorageKey = 'has-seen-onboarding';

type PlatformToolsCheck = {
  android?: { success: boolean; reason?: string };
  ios?: { success: boolean; reason?: string };
};

const WINDOW_TITLE_HEIGHT = 28;

const Onboarding = () => {
  const theme = useExpoTheme();
  const [platformToolsCheck, setPlatformToolsCheck] = useState<PlatformToolsCheck>({});

  const closeOnboarding = () => {
    AsyncStorage.setItem(hasSeenOnboardingStorageKey, 'true').then(() => {
      WindowsNavigator.close('Onboarding');
    });
  };

  useEffect(() => {
    MenuBarModule.runCli('check-tools', []).then((output) => {
      // eslint-disable-next-line no-eval
      setPlatformToolsCheck(eval(`(${output})`));
    });
  }, []);

  return (
    <View flex="1" bg="default">
      <Image source={Background} style={styles.background} />
      <ScrollView style={{ marginTop: -WINDOW_TITLE_HEIGHT }} alwaysBounceVertical={false}>
        <View style={styles.header}>
          <Logo />
          <View mt="medium" mb="2">
            <ExpoOrbitText />
          </View>
          <Text size="small" style={styles.subtitle}>
            Download and launch builds.
          </Text>
        </View>
        <View bg="default">
          <View px="large" py="large" style={styles.container}>
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
        </View>
      </ScrollView>
      <View
        px="large"
        py="medium"
        bg="default"
        style={[styles.footer, { borderTopColor: theme.border.default }]}>
        <Button title="Get Started" onPress={closeOnboarding} />
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
    height: 230,
    overflow: 'hidden',
  },
  container: {
    flex: 1,
    gap: 14,
    overflow: 'hidden',
  },
  subtitle: {
    color: '#E1EDFF',
  },
  background: {
    position: 'absolute',
    backgroundColor: 'black',
    top: 0,
    left: 0,
  },
  footer: {
    borderTopWidth: 1,
  },
});
