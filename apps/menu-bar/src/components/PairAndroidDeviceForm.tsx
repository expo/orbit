import { darkTheme, lightTheme } from '@expo/styleguide-native';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import Button from './Button';
import QRCode from './QRCode';
import { Text, TextInput } from './Text';
import { Row, View } from './View';
import {
  AndroidPairingService,
  listAndroidPairingServicesAsync,
  pairAndroidDeviceAsync,
  pairAndroidDeviceWithQRCodeAsync,
} from '../commands/pairAndroidDeviceAsync';
import Alert from '../modules/Alert';
import { PlatformColor } from '../modules/PlatformColor';
import { addOpacity } from '../utils/theme';
import { useCurrentTheme } from '../utils/useExpoTheme';

const QR_CODE_SIZE = 180;
const DISCOVERY_INTERVAL_MS = 2000;

type PairingMode = 'qrCode' | 'pairingCode';

function randomAlphanumeric(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

const PairAndroidDeviceForm = () => {
  const theme = useCurrentTheme();
  const [mode, setMode] = useState<PairingMode>('qrCode');

  return (
    <View>
      <Row gap="1">
        <Button
          title="QR code"
          color={mode === 'qrCode' ? 'default' : 'primary'}
          onPress={() => setMode('qrCode')}
          style={styles.modeButton}
        />
        <Button
          title="Pairing code"
          color={mode === 'pairingCode' ? 'default' : 'primary'}
          onPress={() => setMode('pairingCode')}
          style={styles.modeButton}
        />
      </Row>
      <View mt="2">
        {mode === 'qrCode' ? <QRCodePairing /> : <PairingCodeForm theme={theme} />}
      </View>
    </View>
  );
};

const QRCodePairing = () => {
  const [qrCodeContent, setQrCodeContent] = useState<string>();
  const [statusMessage, setStatusMessage] = useState<string>();
  // Identifies the pairing session currently shown, so that results from a
  // previous session (e.g. a timed out CLI invocation) are ignored.
  const sessionRef = useRef(0);

  const startPairingSession = async () => {
    const session = ++sessionRef.current;
    const serviceName = `expo-orbit-${randomAlphanumeric(10)}`;
    const pairingCode = randomAlphanumeric(8);

    setQrCodeContent(`WIFI:T:ADB;S:${serviceName};P:${pairingCode};;`);
    setStatusMessage('Waiting for the device to scan the QR code…');

    try {
      const result = await pairAndroidDeviceWithQRCodeAsync(
        { serviceName, pairingCode },
        (status) => {
          if (session === sessionRef.current && status.trim()) {
            setStatusMessage(status.trim());
          }
        }
      );

      if (session !== sessionRef.current) {
        return;
      }

      if (result.success) {
        Alert.alert('Device paired', 'Your Android device was paired and connected over Wi-Fi.');
      } else {
        Alert.alert(
          'Unable to pair device',
          result.error?.message ??
            'Make sure the device and your computer are on the same network and try again.'
        );
      }
    } catch (error) {
      if (session !== sessionRef.current) {
        return;
      }
      Alert.alert(
        'Unable to pair device',
        error instanceof Error ? error.message : 'Something went wrong while pairing the device.'
      );
    } finally {
      if (session === sessionRef.current) {
        setQrCodeContent(undefined);
        setStatusMessage(undefined);
      }
    }
  };

  return (
    <View>
      <Text size="tiny" color="secondary" style={styles.description}>
        Enable "Wireless debugging" in your device's developer options, then choose "Pair device
        with QR code" and scan the code below.
      </Text>
      {qrCodeContent ? (
        <View align="centered" mt="2" gap="2">
          <View rounded="medium" style={styles.qrCodeContainer}>
            <QRCode value={qrCodeContent} size={QR_CODE_SIZE} />
          </View>
          <Text size="tiny" color="secondary">
            {statusMessage}
          </Text>
        </View>
      ) : (
        <Row justify="end" mt="2">
          <Button
            title="Generate QR code"
            color="primary"
            onPress={startPairingSession}
            style={styles.button}
          />
        </Row>
      )}
    </View>
  );
};

const PairingCodeForm = ({ theme }: { theme: ReturnType<typeof useCurrentTheme> }) => {
  const [pairingCode, setPairingCode] = useState('');
  const [services, setServices] = useState<AndroidPairingService[]>([]);
  const [pairingAddress, setPairingAddress] = useState<string>();

  const backgroundColor =
    theme === 'light'
      ? addOpacity(lightTheme.background.default, 0.6)
      : addOpacity(darkTheme.background.default, 0.2);

  // Continuously discover devices sitting on the "Pair device with pairing
  // code" screen, the same way Android Studio lists them.
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const discovered = await listAndroidPairingServicesAsync();
        if (!cancelled) {
          setServices(discovered);
        }
      } catch {
        // Ignore transient discovery failures; the next poll will retry.
      }
    };
    poll();
    const interval = setInterval(poll, DISCOVERY_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const handlePair = async (service: AndroidPairingService) => {
    const code = pairingCode.trim();
    if (!code || pairingAddress) {
      return;
    }

    setPairingAddress(service.address);
    try {
      const result = await pairAndroidDeviceAsync({
        pairingAddress: service.address,
        pairingCode: code,
      });

      if (result.success) {
        Alert.alert('Device paired', 'Your Android device was paired and connected over Wi-Fi.');
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
      setPairingAddress(undefined);
    }
  };

  return (
    <View>
      <Text size="tiny" color="secondary" style={styles.description}>
        Enable "Wireless debugging" in your device's developer options, then choose "Pair device
        with pairing code". Enter the code below and pick your device once it appears.
      </Text>

      <Row
        border="light"
        rounded="medium"
        align="center"
        mt="2"
        style={[styles.inputContainer, { backgroundColor }]}>
        <TextInput
          value={pairingCode}
          onChangeText={setPairingCode}
          placeholder="Pairing code (e.g. 123456)"
          keyboardType="number-pad"
          shadow="input"
          style={styles.input}
          placeholderTextColor={PlatformColor('placeholderTextColor')}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </Row>

      <Row align="center" justify="between" mt="3" mb="1">
        <Text size="tiny" weight="semibold" color="secondary">
          Available Wi-Fi devices
        </Text>
        <ActivityIndicator size="small" />
      </Row>

      {services.length === 0 ? (
        <Text size="tiny" color="secondary" style={styles.description}>
          Searching for devices in pairing mode…
        </Text>
      ) : (
        services.map((service) => (
          <Row
            key={service.address}
            align="center"
            justify="between"
            gap="2"
            border="light"
            rounded="medium"
            mt="1"
            px="2.5"
            py="2"
            style={{ backgroundColor }}>
            <View flex="1">
              <Text size="small" weight="medium" numberOfLines={1}>
                Device at {service.address}
              </Text>
              <Text size="tiny" color="secondary">
                {pairingAddress === service.address ? 'Pairing…' : 'Available to pair'}
              </Text>
            </View>
            <Button
              title="Pair"
              color="primary"
              disabled={pairingCode.trim().length === 0 || pairingAddress !== undefined}
              onPress={() => handlePair(service)}
              style={styles.button}
            />
          </Row>
        ))
      )}
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
  modeButton: {
    height: 24,
  },
  qrCodeContainer: {
    overflow: 'hidden',
    padding: 8,
    backgroundColor: '#ffffff',
  },
});
