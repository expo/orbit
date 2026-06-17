import { lightTheme, darkTheme } from '@expo/styleguide-native';
import { InternalError, AppleTwoFactorRequiredErrorDetails } from 'common-types';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { WindowsNavigator } from './index';
import { TextInput, Text, View, Row, Divider } from '../components';
import Button from '../components/Button';
import {
  appleIdSignInAsync,
  appleIdVerifyTwoFactorAsync,
} from '../commands/appleIdAuthAsync';
import {
  AppleAuthCompletedEvent,
  AppleAuthEmitter,
} from '../utils/appleAuthEvents';
import { useCurrentTheme } from '../utils/useExpoTheme';

type Stage = 'credentials' | 'two-factor' | 'busy';

const AppleIdAuth: React.FC = () => {
  const themeName = useCurrentTheme();
  const theme = themeName === 'dark' ? darkTheme : lightTheme;
  const [stage, setStage] = useState<Stage>('credentials');
  const [appleId, setAppleId] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [twoFactorDetails, setTwoFactorDetails] =
    useState<AppleTwoFactorRequiredErrorDetails | null>(null);

  const finish = (event: AppleAuthCompletedEvent) => {
    AppleAuthEmitter.emit('apple-id-auth:complete', event);
    WindowsNavigator.close('AppleIdAuth');
  };

  const submitCredentials = async () => {
    setError(null);
    setStage('busy');
    try {
      await appleIdSignInAsync({ appleId, password });
      finish({ status: 'success', appleId });
    } catch (e: any) {
      if (e instanceof InternalError && e.code === 'APPLE_TWO_FACTOR_REQUIRED') {
        setTwoFactorDetails(e.details as unknown as AppleTwoFactorRequiredErrorDetails);
        setStage('two-factor');
      } else {
        setError(humanizeError(e));
        setStage('credentials');
      }
    }
  };

  const submitTwoFactor = async () => {
    setError(null);
    setStage('busy');
    try {
      await appleIdVerifyTwoFactorAsync({ appleId, password, code });
      finish({ status: 'success', appleId });
    } catch (e: any) {
      setError(humanizeError(e));
      setStage('two-factor');
    }
  };

  const cancel = () => {
    finish({ status: 'cancelled' });
  };

  return (
    <View padding="large" flex="1" style={{ backgroundColor: theme.background.default }}>
      <Text size="large" weight="bold">
        Sign in with Apple ID
      </Text>
      <Text size="small" color="secondary" style={styles.subtitle}>
        Orbit uses your Apple ID to issue a free 7-day signing certificate so
        downloaded IPAs can install on your iPhone. Your password is never
        stored.
      </Text>
      <Divider style={styles.divider} />

      {stage === 'busy' ? (
        <View align="centered" justify="center" style={styles.busy}>
          <ActivityIndicator />
          <Text size="small" color="secondary" style={styles.busyMessage}>
            Talking to Apple…
          </Text>
        </View>
      ) : stage === 'credentials' ? (
        <View>
          <Text size="tiny" weight="medium" style={styles.label}>
            Apple ID
          </Text>
          <TextInput
            value={appleId}
            onChangeText={setAppleId}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="you@icloud.com"
            border="default"
            rounded="small"
            padding="small"
            style={styles.input}
          />
          <Text size="tiny" weight="medium" style={styles.label}>
            Password
          </Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            border="default"
            rounded="small"
            padding="small"
            style={styles.input}
          />
        </View>
      ) : (
        <View>
          <Text size="tiny" color="secondary" style={styles.label}>
            {describeTwoFactorChannel(twoFactorDetails)}
          </Text>
          <TextInput
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="6-digit code"
            border="default"
            rounded="small"
            padding="small"
            style={styles.input}
          />
        </View>
      )}

      {error ? (
        <Text size="tiny" style={styles.error}>
          {error}
        </Text>
      ) : null}

      <Row align="center" style={styles.actions}>
        <Button title="Cancel" onPress={cancel} />
        <View flex="1" />
        {stage === 'credentials' && (
          <Button
            title="Continue"
            color="primary"
            onPress={submitCredentials}
            disabled={!appleId || !password}
          />
        )}
        {stage === 'two-factor' && (
          <Button
            title="Verify"
            color="primary"
            onPress={submitTwoFactor}
            disabled={code.length < 4}
          />
        )}
      </Row>
    </View>
  );
};

function humanizeError(error: unknown): string {
  if (error instanceof InternalError) {
    if (error.code === 'APPLE_BAD_CREDENTIALS') {
      return 'Incorrect Apple ID or password.';
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong.';
}

function describeTwoFactorChannel(
  details: AppleTwoFactorRequiredErrorDetails | null
): string {
  if (!details) return 'Enter the verification code Apple sent to your trusted device.';
  if (details.authMode === 'sms') {
    const numbers = details.trustedPhoneNumbers?.join(', ');
    return numbers
      ? `A code was sent via SMS to ${numbers}`
      : 'A code was sent via SMS to your trusted phone number.';
  }
  const devices = details.trustedDevices?.join(', ');
  return devices
    ? `A code was sent to your trusted device${details.trustedDevices!.length > 1 ? 's' : ''}: ${devices}`
    : 'Enter the verification code Apple sent to your trusted devices.';
}

const styles = StyleSheet.create({
  subtitle: {
    marginTop: 8,
  },
  divider: {
    marginVertical: 16,
  },
  label: {
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    marginBottom: 12,
  },
  busy: {
    flex: 1,
  },
  busyMessage: {
    marginTop: 12,
  },
  error: {
    color: '#cc3333',
    marginTop: 8,
  },
  actions: {
    marginTop: 24,
  },
});

export default AppleIdAuth;
