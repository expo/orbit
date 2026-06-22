import { darkTheme, lightTheme } from '@expo/styleguide-native';
import React from 'react';
import { Platform, ScrollView, StyleSheet } from 'react-native';

import { Text, View } from '../components';
import PairAndroidDeviceForm from '../components/PairAndroidDeviceForm';
import { addOpacity } from '../utils/theme';
import { useCurrentTheme } from '../utils/useExpoTheme';

const PairAndroidDevice = () => {
  const theme = useCurrentTheme();

  const groupWrapperStyle = {
    backgroundColor:
      theme === 'light'
        ? addOpacity(lightTheme.background.default, 0.6)
        : addOpacity(darkTheme.background.default, 0.2),
  };

  return (
    <View flex="1" px="medium" pb="medium" testID="pair-android-device-window">
      <Text size="medium" weight="semibold">
        Pair Android Device
      </Text>
      <ScrollView alwaysBounceVertical={false}>
        <Text size="tiny" color="secondary" style={styles.subheader}>
          Connect a physical Android device over Wi-Fi
        </Text>
        <View
          mt="2"
          rounded="medium"
          style={groupWrapperStyle}
          border="light"
          px="2.5"
          pt="2"
          pb="2.5">
          <PairAndroidDeviceForm />
        </View>
      </ScrollView>
    </View>
  );
};

export default PairAndroidDevice;

const styles = StyleSheet.create({
  subheader: Platform.select({
    macos: { fontFamily: 'SF Pro Rounded', letterSpacing: 0.33 },
    default: {},
  }),
});
