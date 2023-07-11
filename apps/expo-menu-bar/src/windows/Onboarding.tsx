import {
  Text,
  View,
  TouchableOpacity,
  Image,
  PlatformColor,
  StyleSheet,
} from 'react-native';
import {useEffect, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import ExpoIcon from '../assets/icon.png';
import {WindowsNavigator} from './index';
import CommandCheckItem from '../components/CommandCheckItem';
import MenuBarModule from '../modules/MenuBarModule';
import AndroidStudio from '../assets/android-studio.png';
import Xcode from '../assets/xcode.png';

export const hasSeenOnboardingStorageKey = 'has-seen-onboarding';

type PlatformToolsCheck = {
  android?: {success: boolean; reason?: string};
  ios?: {success: boolean; reason?: string};
};

const Onboarding = () => {
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
    <View style={styles.container}>
      <Image source={ExpoIcon} style={styles.icon} />
      <Text style={styles.title}>Welcome to Quick Launcher</Text>
      <Text style={{marginBottom: 5}}>
        To get the most out Quick Launcher make sure all necessary tools
        installed
      </Text>
      <View style={{width: '100%', gap: 10, marginTop: 20}}>
        <CommandCheckItem
          title="Android Studio"
          description="Install Android studio to manage devices and install apps on Android"
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
      <TouchableOpacity
        onPress={closeOnboarding}
        style={{
          marginTop: 'auto',
          paddingHorizontal: 15,
          paddingVertical: 5,
          borderRadius: 5,
          backgroundColor: PlatformColor('controlAccentColor'),
        }}>
        <Text>Start using Quick Launcher</Text>
      </TouchableOpacity>
    </View>
  );
};

export default Onboarding;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 15,
    paddingBottom: 25,
    alignItems: 'center',
  },
  icon: {
    tintColor: PlatformColor('text'),
  },
  title: {
    textAlign: 'center',
    fontSize: 30,
    marginVertical: 20,
  },
});
