import { lightTheme } from '@expo/styleguide-native';
import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import WifiIcon from '../assets/icons/wifi.svg';
import { Row, Text, View } from '../components';
import PairAndroidDeviceForm from '../components/PairAndroidDeviceForm';
import { addOpacity } from '../utils/theme';

const PairAndroidDevice = () => {
  return (
    <View flex="1" px="medium" pb="medium" testID="pair-android-device-window">
      <ScrollView alwaysBounceVertical={false}>
        <Row align="center" gap="2.5" mb="3">
          <View rounded="medium" align="centered" style={styles.iconBadge}>
            <WifiIcon width={20} height={20} fill={lightTheme.button.secondary.background} />
          </View>
          <View flex="1">
            <Text size="medium" weight="semibold">
              Pair Android over Wi-Fi
            </Text>
            <Text size="tiny" color="secondary">
              Connect a physical Android device
            </Text>
          </View>
        </Row>

        <PairAndroidDeviceForm />

        <View mt="4">
          <Text size="tiny" color="warning" align="center">
            The device stays paired until you turn off Wireless debugging.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

export default PairAndroidDevice;

const styles = StyleSheet.create({
  iconBadge: {
    width: 36,
    height: 36,
    backgroundColor: addOpacity(lightTheme.button.secondary.background, 0.14),
  },
});
