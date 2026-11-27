import React from 'react';
import { ScrollView } from 'react-native';

import { View } from '../components';
import PairIosDeviceForm from '../components/PairIosDeviceForm';

const PairIosDevice = () => (
  <View flex="1" px="medium" pt="2" pb="medium" testID="pair-ios-device-window">
    <ScrollView alwaysBounceVertical={false}>
      <PairIosDeviceForm />
    </ScrollView>
  </View>
);

export default PairIosDevice;
