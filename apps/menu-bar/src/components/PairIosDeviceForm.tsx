import { lightTheme } from '@expo/styleguide-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import Button from './Button';
import { NumberedStep, StatusBadge, SuccessState } from './PairAndroidDeviceForm';
import { Text } from './Text';
import { Row, Spacer, View } from './View';
import { pairIosDeviceAsync } from '../commands/pairIosDeviceAsync';
import MenuBarModule from '../modules/MenuBarModule';
import { addOpacity } from '../utils/theme';
import { WindowsNavigator } from '../windows';

type State =
  | { status: 'waiting'; hostName?: string }
  | { status: 'pin'; pin: string }
  | { status: 'paired'; deviceName?: string }
  | { status: 'error'; message?: string };

/**
 * iOS 27 Remote Device Pairing: this computer shows up on the iPhone under Developer Mode,
 * the user picks it and types the PIN shown here. The CLI owns advertising and the secret.
 */
const PairIosDeviceForm = () => {
  const [state, setState] = useState<State>({ status: 'waiting' });
  // Bumped by "Try again" to start a fresh pairing session.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    pairIosDeviceAsync({
      onAdvertising: (hostName) => !cancelled && setState({ status: 'waiting', hostName }),
      onPin: (pin) => !cancelled && setState({ status: 'pin', pin }),
      onPaired: () => !cancelled && setState({ status: 'paired' }),
    })
      .then((result) => {
        if (cancelled) return;
        if (result.success) {
          setState({ status: 'paired', deviceName: result.device?.name });
        } else {
          setState({ status: 'error', message: result.error?.message });
        }
      })
      .catch(
        (error) =>
          !cancelled &&
          setState({ status: 'error', message: error instanceof Error ? error.message : undefined })
      );
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  if (state.status === 'paired') {
    return (
      <SuccessState
        deviceName={state.deviceName ?? 'Your iPhone'}
        onDone={() => {
          WindowsNavigator.close('PairIosDevice');
          MenuBarModule.openPopover();
        }}
      />
    );
  }

  if (state.status === 'error') {
    return (
      <View align="centered" pt="2" gap="1">
        <StatusBadge glyph="✕" color={lightTheme.text.error} />
        <Spacer.Vertical size="tiny" />
        <Text size="medium" weight="semibold">
          Pairing failed
        </Text>
        <Text size="tiny" color="secondary" align="center" style={styles.stateSubtitle}>
          {state.message ??
            "Couldn't pair with the iPhone. Make sure both are on the same Wi-Fi network."}
        </Text>
        <Button
          title="Try again"
          color="primary"
          onPress={() => {
            setState({ status: 'waiting' });
            setAttempt((value) => value + 1);
          }}
          style={styles.wideButton}
        />
      </View>
    );
  }

  if (state.status === 'pin') {
    return (
      <View align="centered" pt="2" gap="2">
        <Text size="tiny" color="secondary" align="center">
          Enter this code on your iPhone
        </Text>
        <Row gap="2" justify="center">
          {state.pin.split('').map((digit, index) => (
            <View key={index} rounded="medium" align="centered" style={styles.pinDigit}>
              <Text style={styles.pinText}>{digit}</Text>
            </View>
          ))}
        </Row>
        <Row align="center" gap="2" mt="2">
          <ActivityIndicator size="small" />
          <Text size="tiny" color="secondary">
            Waiting for your iPhone…
          </Text>
        </Row>
      </View>
    );
  }

  const hostName = state.hostName ?? 'this computer';
  return (
    <View gap="2.5">
      <NumberedStep number={1}>
        On your iPhone (iOS 27 or later, on the same Wi-Fi), open Settings → Privacy & Security →
        Developer Mode → Remote Device Pairing.
      </NumberedStep>
      <NumberedStep number={2}>Select “{hostName}”.</NumberedStep>
      <NumberedStep number={3}>Enter the code that appears here.</NumberedStep>
      <Row
        align="center"
        justify="center"
        gap="2"
        mt="1"
        rounded="medium"
        py="2"
        style={styles.waitingBox}>
        <ActivityIndicator size="small" />
        <Text size="tiny" color="secondary">
          {state.hostName ? 'Waiting for your iPhone…' : 'Getting ready…'}
        </Text>
      </Row>
    </View>
  );
};

export default PairIosDeviceForm;

const styles = StyleSheet.create({
  pinDigit: {
    width: 40,
    height: 52,
    borderWidth: 1,
    borderColor: addOpacity(lightTheme.border.default, 0.5),
  },
  pinText: {
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '600',
  },
  waitingBox: {
    backgroundColor: addOpacity(lightTheme.button.secondary.background, 0.08),
  },
  stateSubtitle: {
    lineHeight: 16,
    maxWidth: 280,
  },
  wideButton: {
    alignSelf: 'stretch',
    height: 36,
    marginTop: 12,
  },
});
