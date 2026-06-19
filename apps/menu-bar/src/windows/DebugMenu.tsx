import { StyleSheet } from 'react-native';

import { clearAppleIdLoginAsync } from '../commands/resignAndRetryAsync';
import { View, Row, Text } from '../components';
import Button from '../components/Button';
import { DebugLogs } from '../components/DebugLogs';
import NativeColorPalette from '../components/NativeColorPalette';
import Alert from '../modules/Alert';
import MenuBarModule from '../modules/MenuBarModule';
import { resetApolloStore, resetStorage } from '../modules/Storage';

const DebugMenu = () => {
  const clearAppleIdLogin = async () => {
    try {
      const appleId = await clearAppleIdLoginAsync();
      Alert.alert(
        'Apple ID login cleared',
        appleId
          ? `Signed out ${appleId}. The next resign will ask you to sign in again.`
          : 'No Apple ID was signed in.'
      );
    } catch (error) {
      Alert.alert(
        'Could not clear Apple ID login',
        error instanceof Error ? error.message : String(error)
      );
    }
  };

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
        <Button
          style={styles.button}
          color="primary"
          title="Sign out of Apple ID"
          onPress={clearAppleIdLogin}
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
