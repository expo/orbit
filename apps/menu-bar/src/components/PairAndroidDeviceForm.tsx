import { darkTheme, lightTheme } from '@expo/styleguide-native';
import React, { useState } from 'react';
import { StyleSheet } from 'react-native';

import Button from './Button';
import { Text, TextInput } from './Text';
import { Row, View } from './View';
import { pairAndroidDeviceAsync } from '../commands/pairAndroidDeviceAsync';
import Alert from '../modules/Alert';
import { PlatformColor } from '../modules/PlatformColor';
import { addOpacity } from '../utils/theme';
import { useCurrentTheme } from '../utils/useExpoTheme';

const ADDRESS_REGEX = /^[^\s:]+:\d+$/;

const PairAndroidDeviceForm = () => {
  const theme = useCurrentTheme();
  const [pairingAddress, setPairingAddress] = useState('');
  const [pairingCode, setPairingCode] = useState('');
  const [connectAddress, setConnectAddress] = useState('');
  const [isPairing, setIsPairing] = useState(false);

  const backgroundColor =
    theme === 'light'
      ? addOpacity(lightTheme.background.default, 0.6)
      : addOpacity(darkTheme.background.default, 0.2);

  const canPair =
    !isPairing && ADDRESS_REGEX.test(pairingAddress.trim()) && pairingCode.trim().length > 0;

  const handlePair = async () => {
    if (!canPair) {
      return;
    }

    setIsPairing(true);
    try {
      const result = await pairAndroidDeviceAsync({
        pairingAddress: pairingAddress.trim(),
        pairingCode: pairingCode.trim(),
        connectAddress: connectAddress.trim() || undefined,
      });

      if (result.success) {
        Alert.alert(
          'Device paired',
          connectAddress.trim()
            ? 'Your Android device was paired and connected over Wi-Fi.'
            : 'Your Android device was paired. Enter the "Wireless debugging" address below to connect to it.'
        );
        setPairingCode('');
      } else {
        Alert.alert(
          'Unable to pair device',
          result.error?.message ??
            'Make sure the pairing code is still valid and that your computer is on the same network.'
        );
      }
    } catch (error) {
      Alert.alert(
        'Unable to pair device',
        error instanceof Error ? error.message : 'Something went wrong while pairing the device.'
      );
    } finally {
      setIsPairing(false);
    }
  };

  const renderInput = (props: React.ComponentProps<typeof TextInput>) => (
    <Row
      border="light"
      rounded="medium"
      align="center"
      mt="1"
      style={[styles.inputContainer, { backgroundColor }]}>
      <TextInput
        {...props}
        shadow="input"
        style={styles.input}
        placeholderTextColor={PlatformColor('placeholderTextColor')}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </Row>
  );

  return (
    <View>
      <Text size="tiny" color="secondary" style={styles.description}>
        Enable "Wireless debugging" in your device's developer options, then choose "Pair device
        with pairing code" to get the values below.
      </Text>

      {renderInput({
        value: pairingAddress,
        onChangeText: setPairingAddress,
        placeholder: 'Pairing IP address & port (e.g. 192.168.1.10:37123)',
      })}
      {renderInput({
        value: pairingCode,
        onChangeText: setPairingCode,
        placeholder: 'Pairing code (e.g. 123456)',
        keyboardType: 'number-pad',
      })}
      {renderInput({
        value: connectAddress,
        onChangeText: setConnectAddress,
        placeholder: 'Connect IP address & port (optional, e.g. 192.168.1.10:5555)',
      })}

      <Row justify="end" mt="2">
        <Button
          title={isPairing ? 'Pairing…' : 'Pair device'}
          color="primary"
          disabled={!canPair}
          onPress={handlePair}
          style={styles.button}
        />
      </Row>
    </View>
  );
};

export default PairAndroidDeviceForm;

const styles = StyleSheet.create({
  description: {
    lineHeight: 15,
  },
  inputContainer: {
    overflow: 'hidden',
  },
  input: {
    padding: 6,
    flex: 1,
    textAlignVertical: 'center',
    justifyContent: 'center',
    textAlign: 'left',
    verticalAlign: 'middle',
    fontSize: 13,
  },
  button: {
    height: 28,
  },
});
