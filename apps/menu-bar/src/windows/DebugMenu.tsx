import { StyleSheet, TouchableOpacity } from 'react-native';

import { apolloClient } from '../api/ApolloClient';
import { View, Text } from '../components';
import NativeColorPalette from '../components/NativeColorPalette';
import MenuBarModule from '../modules/MenuBarModule';
import { resetStorage, storage } from '../modules/Storage';

const DebugMenu = () => {
  return (
    <View flex="1" px="medium" pb="medium" padding="2" gap="1.5">
      <TouchableOpacity onPress={resetStorage}>
        <Text color="warning">Reset storage</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => {
          apolloClient.resetStore();
          storage.delete('apollo-cache-persist');
        }}>
        <Text color="warning">Clear Apollo Store</Text>
      </TouchableOpacity>
      <NativeColorPalette />
      <Text color="secondary" style={styles.about}>
        {`App version: ${MenuBarModule.constants.appVersion}`}
      </Text>
      <Text color="secondary" style={styles.about}>
        {`Build version: ${MenuBarModule.constants.buildVersion}`}
      </Text>
    </View>
  );
};

export default DebugMenu;

const styles = StyleSheet.create({
  about: {
    fontSize: 13,
  },
});
