import { StyleSheet } from 'react-native';

import { View, Row, Text } from '../components';
import Button from '../components/Button';
import { DebugLogs } from '../components/DebugLogs';
import NativeColorPalette from '../components/NativeColorPalette';
import MenuBarModule from '../modules/MenuBarModule';
import { resetApolloStore, resetStorage } from '../modules/Storage';

const DebugMenu = () => {
  return (
    <View flex="1" px="medium" pb="medium" padding="2" gap="1.5">
      <Row>
        <Text size="medium" style={{ fontWeight: 'bold' }}>
          Logs
        </Text>
      </Row>
      <DebugLogs />
      <Row mb="1" align="center">
        <Button
          style={styles.button}
          color="primary"
          title="Reset MMKV storage"
          onPress={resetStorage}
        />
        <Button
          style={styles.button}
          color="primary"
          title="Clear Apollo Store"
          onPress={resetApolloStore}
        />
      </Row>
      <NativeColorPalette />
      <Row>
        <Text color="secondary" style={styles.about}>
          {`App version: ${MenuBarModule.appVersion} - Build version: ${MenuBarModule.buildVersion}`}
        </Text>
      </Row>
    </View>
  );
};

export default DebugMenu;

const styles = StyleSheet.create({
  about: {
    fontSize: 13,
  },
  button: {
    height: 28,
  },
});
