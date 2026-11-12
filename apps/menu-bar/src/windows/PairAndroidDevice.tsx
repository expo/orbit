import { SymbolView } from 'expo-symbols';
import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { Row, Text, View } from '../components';
import PairAndroidDeviceForm from '../components/PairAndroidDeviceForm';
import { useTheme } from '../providers/ThemeProvider';

const PairAndroidDevice = () => {
  const noteColor = useTheme() === 'dark' ? '#FFD60A' : '#B07D00';

  return (
    <View flex="1" px="medium" pt="2" pb="medium" testID="pair-android-device-window">
      <ScrollView alwaysBounceVertical={false}>
        <PairAndroidDeviceForm />

        <Row
          align="center"
          justify="center"
          gap="2"
          mt="3"
          py="2"
          px="3"
          rounded="medium"
          style={styles.note}>
          <SymbolView
            name="info.circle.fill"
            size={14}
            tintColor={noteColor}
            fallback={
              <Text size="tiny" weight="semibold" style={{ color: noteColor }}>
                i
              </Text>
            }
          />
          <Text size="tiny">The device stays paired until you turn off Wireless debugging.</Text>
        </Row>
      </ScrollView>
    </View>
  );
};

export default PairAndroidDevice;

const styles = StyleSheet.create({
  // A soft yellow tint that works on a light and on a dark window.
  note: { backgroundColor: 'rgba(255, 196, 0, 0.14)' },
});
