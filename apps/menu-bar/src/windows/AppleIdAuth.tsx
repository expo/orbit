import { lightTheme, darkTheme } from '@expo/styleguide-native';
import { InternalError, AppleTwoFactorRequiredErrorDetails } from 'common-types';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';

import { WindowsNavigator } from './index';
import { AUTH_REASON_KEY, loadAppleIdHint, rememberAppleId } from '../commands/appleAccountAsync';
import { appleIdSignInAsync, appleIdVerifyTwoFactorAsync } from '../commands/appleIdAuthAsync';
import { TextInput, Text, View, Row, Divider } from '../components';
import Button from '../components/Button';
import TwoFactorCodeInput from '../components/TwoFactorCodeInput';
import MenuBarModule from '../modules/MenuBarModule';
import { storage } from '../modules/Storage';
import { AppleAuthCompletedEvent, AppleAuthEmitter } from '../utils/appleAuthEvents';
import { describeResignError } from '../utils/resignErrorCopy';
import { useCurrentTheme } from '../utils/useExpoTheme';

type Stage = 'credentials' | 'two-factor' | 'busy';

function isInternal(error: unknown, code: string): boolean {
  return error instanceof InternalError && error.code === code;
}

const AppleIdAuth: React.FC = () => {
  const themeName = useCurrentTheme();
  const theme = themeName === 'dark' ? darkTheme : lightTheme;
  const [stage, setStage] = useState<Stage>('credentials');
  const [appleId, setAppleId] = useState(() => loadAppleIdHint() ?? '');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [preferSms, setPreferSms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [twoFactorDetails, setTwoFactorDetails] =
    useState<AppleTwoFactorRequiredErrorDetails | null>(null);
  // The window navigator passes no props; the opener leaves the banner reason
  // in storage instead. Read-and-clear on mount.
  const [sessionExpired] = useState(() => {
    const reason = storage.getString(AUTH_REASON_KEY);
    if (reason) storage.delete(AUTH_REASON_KEY);
    return reason === 'session-expired';
  });
  // Guard against the auto-submitting code input re-submitting a rejected code.
  const lastSubmittedCodeRef = useRef<string | null>(null);

  const finish = (event: AppleAuthCompletedEvent) => {
    if (event.status === 'success') {
      rememberAppleId(event.appleId);
    }
    AppleAuthEmitter.emit('apple-id-auth:complete', event);
    if (event.status === 'success') {
      MenuBarModule.openPopover();
    }
    WindowsNavigator.close('AppleIdAuth');
  };

  const signIn = async (sms: boolean) => {
    setError(null);
    setStage('busy');
    try {
      await appleIdSignInAsync({ appleId, password, preferSms: sms });
      finish({ status: 'success', appleId });
    } catch (e: any) {
      if (isInternal(e, 'APPLE_TWO_FACTOR_REQUIRED')) {
        setPreferSms(sms);
        setCode('');
        lastSubmittedCodeRef.current = null;
        setTwoFactorDetails(e.details as unknown as AppleTwoFactorRequiredErrorDetails);
        setStage('two-factor');
      } else {
        setError(describeResignError(e, { context: 'credentials' }).message);
        setStage(twoFactorDetails ? 'two-factor' : 'credentials');
      }
    }
  };

  const submitCredentials = () => signIn(false);

  // Re-running sign-in issues a fresh challenge; used by both resend links.
  const resendChallenge = (sms: boolean) => signIn(sms);

  const submitTwoFactor = async (submittedCode?: string) => {
    const codeToSubmit = submittedCode ?? code;
    if (codeToSubmit.length !== 6 || lastSubmittedCodeRef.current === codeToSubmit) {
      return;
    }
    lastSubmittedCodeRef.current = codeToSubmit;
    setError(null);
    setStage('busy');
    try {
      await appleIdVerifyTwoFactorAsync({ appleId, password, code: codeToSubmit, preferSms });
      finish({ status: 'success', appleId });
    } catch (e: any) {
      setError(describeResignError(e, { context: 'code' }).message);
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
        Orbit uses your Apple ID to issue a free 7-day signing certificate so downloaded IPAs can
        install on your iPhone. Your password is never stored.
      </Text>
      <Divider style={styles.divider} />

      {sessionExpired && stage !== 'busy' ? (
        <Text size="tiny" style={styles.banner}>
          Your Apple ID session expired. Sign in again to continue.
        </Text>
      ) : null}

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
          <TwoFactorCodeInput value={code} onChangeText={setCode} onComplete={submitTwoFactor} />
          <View mt="2" gap="1">
            {twoFactorDetails?.authMode === 'sms' ? (
              <LinkText onPress={() => resendChallenge(true)}>Resend code</LinkText>
            ) : (
              <>
                <LinkText onPress={() => resendChallenge(false)}>Resend code to devices</LinkText>
                <LinkText onPress={() => resendChallenge(true)}>
                  Can’t get to your devices? Text me a code
                </LinkText>
              </>
            )}
          </View>
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
            onPress={() => submitTwoFactor()}
            disabled={code.length !== 6}
          />
        )}
      </Row>
    </View>
  );
};

const LinkText = ({ onPress, children }: { onPress: () => void; children: string }) => (
  <TouchableOpacity onPress={onPress}>
    <Text size="tiny" color="link">
      {children}
    </Text>
  </TouchableOpacity>
);

function describeTwoFactorChannel(details: AppleTwoFactorRequiredErrorDetails | null): string {
  // Apple's challenge response carries only the authMode — no device or phone
  // lists — so keep the copy generic per channel.
  if (details?.authMode === 'sms') {
    return 'Enter the code Apple sent by SMS to your trusted phone number.';
  }
  return 'Enter the verification code Apple sent to your trusted devices.';
}

const styles = StyleSheet.create({
  subtitle: {
    marginTop: 8,
  },
  divider: {
    marginVertical: 16,
  },
  banner: {
    color: '#b25000',
    marginBottom: 8,
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
