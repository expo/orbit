import {
  Button,
  Column,
  Host,
  Icon,
  RNHostView,
  Row,
  Spacer,
  Text,
  TextInput,
  type TextInputRef,
  useNativeState,
} from '@expo/ui';
import { Key24Regular, ShieldCheckmark24Regular } from '@fluentui/react-icons';
import { InternalError, AppleTwoFactorRequiredErrorDetails } from 'common-types';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';

import { WindowsNavigator } from './index';
import {
  AUTH_REASON_KEY,
  consumeTwoFactorPrompt,
  loadAppleIdHint,
  rememberAppleId,
} from '../commands/appleAccountAsync';
import { appleIdSignInAsync, appleIdVerifyTwoFactorAsync } from '../commands/appleIdAuthAsync';
import Checkbox from '../components/Checkbox';
import TwoFactorCodeInput from '../components/TwoFactorCodeInput';
import MenuBarModule from '../modules/MenuBarModule';
import { storage } from '../modules/Storage';
import { AppleAuthCompletedEvent, AppleAuthEmitter } from '../utils/appleAuthEvents';
import { AppleRetryInfo, retryNoticeMessage } from '../utils/appleRetry';
import { describeResignError } from '../utils/resignErrorCopy';
import { useCurrentTheme, useExpoTheme } from '../utils/useExpoTheme';

// `@expo/ui` renders these components with SwiftUI on macOS and React Native on Electron.
// The SwiftUI modifiers need the ExpoUI native module, which Electron lacks, so load them on macOS only.
const swiftUI: typeof import('@expo/ui/swift-ui/modifiers') | null =
  Platform.OS === 'macos' ? require('@expo/ui/swift-ui/modifiers') : null;
const isWeb = Platform.OS === 'web';

const ACCENT = '#0A84FF';
const CODE_LENGTH = 6;

type Stage = 'credentials' | 'two-factor';

function isInternal(error: unknown, code: string): boolean {
  return error instanceof InternalError && error.code === code;
}

const AppleIdAuth = () => {
  const theme = useExpoTheme();
  const dark = useCurrentTheme() === 'dark';
  const colors = {
    fill: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    separator: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
    secondary: dark ? '#9aa4ae' : '#596068',
  };

  // A silent re-sign-in with the saved password may have hit a 2FA challenge:
  // the opener left it in storage, and the window then starts on the code step.
  const [pendingTwoFactor] = useState(() => consumeTwoFactorPrompt());
  const [stage, setStage] = useState<Stage>(pendingTwoFactor ? 'two-factor' : 'credentials');
  const [busy, setBusy] = useState(false);
  const [appleId, setAppleId] = useState(
    () => pendingTwoFactor?.appleId ?? loadAppleIdHint() ?? ''
  );
  const appleIdText = useNativeState(appleId);
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [preferSms, setPreferSms] = useState(pendingTwoFactor?.authMode === 'sms');
  // "Keep me signed in": save the password so Orbit can sign in again by itself.
  // Already on when the window is finishing a saved-password sign-in.
  const [rememberPassword, setRememberPassword] = useState(Boolean(pendingTwoFactor));
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState<AppleRetryInfo | null>(null);
  const [twoFactorDetails, setTwoFactorDetails] =
    useState<AppleTwoFactorRequiredErrorDetails | null>(
      pendingTwoFactor ? { authMode: pendingTwoFactor.authMode } : null
    );
  // The window navigator passes no props; the opener leaves the banner reason
  // in storage instead. Read-and-clear on mount.
  const [sessionExpired] = useState(() => {
    const reason = storage.getString(AUTH_REASON_KEY);
    if (reason) storage.delete(AUTH_REASON_KEY);
    return reason === 'session-expired';
  });
  // Guard against the auto-submitting code input re-submitting a rejected code.
  const lastSubmittedCodeRef = useRef<string | null>(null);
  const appleIdRef = useRef<TextInputRef>(null);
  const isTwoFactor = stage === 'two-factor';
  const isSmsChallenge = twoFactorDetails?.authMode === 'sms';

  // SwiftUI applies `autoFocus` before the new window is key, so focus the field once it is up.
  useEffect(() => {
    if (isTwoFactor) return;
    const timeout = setTimeout(() => appleIdRef.current?.focus(), 300);
    return () => clearTimeout(timeout);
  }, [isTwoFactor]);

  const finish = (event: AppleAuthCompletedEvent) => {
    if (event.status === 'success') {
      rememberAppleId(event.appleId, { passwordSaved: rememberPassword });
    }
    AppleAuthEmitter.emit('apple-id-auth:complete', event);
    if (event.status === 'success') {
      MenuBarModule.openPopover();
    }
    WindowsNavigator.close('AppleIdAuth');
  };

  const signIn = async (sms: boolean) => {
    if (busy) return;
    setError(null);
    setRetry(null);
    setBusy(true);
    try {
      // No password typed (resending a code for a saved-password sign-in): the
      // CLI falls back to the saved one.
      await appleIdSignInAsync({
        appleId,
        password: password || undefined,
        preferSms: sms,
        rememberPassword,
        onRetry: setRetry,
      });
      finish({ status: 'success', appleId });
    } catch (e: any) {
      setRetry(null);
      if (isInternal(e, 'APPLE_TWO_FACTOR_REQUIRED')) {
        setPreferSms(sms);
        setCode('');
        lastSubmittedCodeRef.current = null;
        setTwoFactorDetails(e.details as unknown as AppleTwoFactorRequiredErrorDetails);
        setStage('two-factor');
      } else {
        setError(describeResignError(e, { context: 'credentials' }).message);
      }
    } finally {
      setBusy(false);
    }
  };

  const canContinue = Boolean(appleId && password) && !busy;
  const canVerify = code.length === CODE_LENGTH && !busy;

  const submitCredentials = () => {
    if (canContinue) signIn(false);
  };

  // Re-running sign-in issues a fresh challenge; used by both resend links.
  const resendChallenge = (sms: boolean) => signIn(sms);

  const submitTwoFactor = async (submittedCode?: string) => {
    const codeToSubmit = submittedCode ?? code;
    if (
      busy ||
      codeToSubmit.length !== CODE_LENGTH ||
      lastSubmittedCodeRef.current === codeToSubmit
    ) {
      return;
    }
    lastSubmittedCodeRef.current = codeToSubmit;
    setError(null);
    setRetry(null);
    setBusy(true);
    try {
      await appleIdVerifyTwoFactorAsync({
        appleId,
        password: password || undefined,
        code: codeToSubmit,
        preferSms,
        rememberPassword,
        onRetry: setRetry,
      });
      finish({ status: 'success', appleId });
    } catch (e: any) {
      setRetry(null);
      setError(describeResignError(e, { context: 'code' }).message);
    } finally {
      setBusy(false);
    }
  };

  const backToCredentials = () => {
    setError(null);
    setRetry(null);
    setCode('');
    lastSubmittedCodeRef.current = null;
    setTwoFactorDetails(null);
    setStage('credentials');
  };

  const cancel = () => finish({ status: 'cancelled' });

  const secondaryText = { fontSize: 13, color: colors.secondary, textAlign: 'center' } as const;
  const linkText = { fontSize: 12, color: ACCENT } as const;
  const smallText = { fontSize: 12, color: colors.secondary } as const;
  // On Electron the input has a fixed default width, so let it fill the row (SwiftUI fields already do).
  // boxShadow: 'none' drops @expo/ui's web focus ring (a 3px primary-color box-shadow).
  const inputStyle = isWeb
    ? {
        flex: 1,
        minWidth: 0,
        paddingHorizontal: 0,
        borderWidth: 0,
        backgroundColor: 'transparent',
        boxShadow: 'none',
      }
    : undefined;
  const inputModifiers = swiftUI ? [swiftUI.textFieldStyle('plain')] : undefined;
  const buttonStyle = isWeb ? { height: 28, borderRadius: 14, paddingHorizontal: 14 } : undefined;
  const buttonModifiers = swiftUI ? [swiftUI.buttonBorderShape('capsule')] : undefined;

  return (
    <Host
      // On macOS the buttons follow the system accent color; Electron has none, so seed one.
      seedColor={isWeb ? ACCENT : undefined}
      style={[styles.host, isWeb && { backgroundColor: theme.background.default }]}>
      <Column
        alignment="center"
        spacing={20}
        style={{
          paddingTop: 12,
          paddingHorizontal: 28,
          paddingBottom: 20,
          ...(isWeb && { height: '100%' }),
        }}>
        {isWeb ? (
          // `Icon` renders SF Symbols only, so Electron draws the tile with Fluent icons.
          <RNHostView matchContents>
            <View style={[styles.tile, { backgroundColor: colors.fill }]}>
              {isTwoFactor ? <ShieldCheckmark24Regular /> : <Key24Regular />}
            </View>
          </RNHostView>
        ) : (
          <Icon
            name={isTwoFactor ? 'checkmark.shield' : 'key'}
            size={30}
            style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: colors.fill }}
          />
        )}

        <Column alignment="center" spacing={6}>
          <Text textStyle={{ fontSize: 17, fontWeight: '600', textAlign: 'center' }}>
            {isTwoFactor ? 'Two-factor authentication' : 'Sign in with Apple ID'}
          </Text>
          <Text textStyle={secondaryText}>
            {isTwoFactor
              ? isSmsChallenge
                ? 'Enter the 6-digit code Apple sent by SMS to your trusted phone number.'
                : `Enter the 6-digit code sent to your trusted Apple devices for ${appleId}.`
              : 'Orbit uses your Apple ID to issue a development certificate so downloaded IPAs can install on your iPhone. Free and paid developer accounts both work. Your password is used once and not stored unless you choose to stay signed in.'}
          </Text>
        </Column>

        {isTwoFactor ? (
          <Column alignment="center" spacing={12}>
            <RNHostView matchContents={{ vertical: true }}>
              {/* Hosted React Native content is sized from its children, so give the boxes a width. */}
              <View style={styles.codeInput}>
                <TwoFactorCodeInput
                  value={code}
                  onChangeText={setCode}
                  onComplete={submitTwoFactor}
                />
              </View>
            </RNHostView>
            <Row spacing={4}>
              <Spacer flexible />
              <Text textStyle={smallText}>Didn’t get a code?</Text>
              <Text textStyle={linkText} onPress={() => resendChallenge(isSmsChallenge)}>
                Resend code
              </Text>
              <Spacer flexible />
            </Row>
            {!isSmsChallenge ? (
              <Row spacing={4}>
                <Spacer flexible />
                <Text textStyle={smallText}>Can’t get to your devices?</Text>
                <Text textStyle={linkText} onPress={() => resendChallenge(true)}>
                  Text me a code
                </Text>
                <Spacer flexible />
              </Row>
            ) : null}
          </Column>
        ) : (
          <Column spacing={0} style={{ backgroundColor: colors.fill, borderRadius: 12 }}>
            <FieldRow label="Apple ID">
              <TextInput
                ref={appleIdRef}
                value={appleIdText}
                onChangeText={setAppleId}
                placeholder="you@icloud.com"
                autoFocus
                textAlign="right"
                textStyle={{ fontSize: 13 }}
                style={inputStyle}
                modifiers={inputModifiers}
              />
            </FieldRow>
            <Column style={{ paddingLeft: 14 }}>
              <Row style={{ height: 1, backgroundColor: colors.separator }}>
                <Spacer flexible />
              </Row>
            </Column>
            <FieldRow label="Password">
              <TextInput
                onChangeText={setPassword}
                onSubmitEditing={submitCredentials}
                secureTextEntry
                placeholder="Required"
                textAlign="right"
                textStyle={{ fontSize: 13 }}
                style={inputStyle}
                modifiers={inputModifiers}
              />
            </FieldRow>
          </Column>
        )}

        {isTwoFactor ? null : (
          <Column>
            <RNHostView matchContents>
              <Checkbox
                value={rememberPassword}
                onValueChange={setRememberPassword}
                label="Keep me signed in"
              />
            </RNHostView>
          </Column>
        )}

        {sessionExpired ? (
          <Text textStyle={{ fontSize: 12, color: '#FF9F0A', textAlign: 'center' }}>
            Your Apple ID session expired. Sign in again to continue.
          </Text>
        ) : null}
        {retry ? (
          <Text textStyle={{ fontSize: 12, color: colors.secondary, textAlign: 'center' }}>
            {retryNoticeMessage(retry)}
          </Text>
        ) : null}
        {error ? (
          <Text textStyle={{ fontSize: 12, color: '#FF453A', textAlign: 'center' }}>{error}</Text>
        ) : null}

        <Spacer flexible />

        <Row alignment="center" spacing={8}>
          {isTwoFactor ? (
            <Button
              variant="outlined"
              label="Back"
              onPress={backToCredentials}
              style={buttonStyle}
              modifiers={buttonModifiers}
            />
          ) : null}
          {busy ? (
            <RNHostView matchContents>
              <ActivityIndicator size="small" />
            </RNHostView>
          ) : null}
          <Spacer flexible />
          <Button
            variant="outlined"
            label="Cancel"
            onPress={cancel}
            style={buttonStyle}
            modifiers={buttonModifiers}
          />
          <Button
            label={isTwoFactor ? 'Verify' : 'Continue'}
            onPress={isTwoFactor ? () => submitTwoFactor() : submitCredentials}
            disabled={isTwoFactor ? !canVerify : !canContinue}
            style={buttonStyle}
            modifiers={buttonModifiers}
          />
        </Row>
      </Column>
    </Host>
  );
};

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Row alignment="center" spacing={12} style={{ height: 40, paddingHorizontal: 14 }}>
      <Text textStyle={{ fontSize: 13 }}>{label}</Text>
      {children}
    </Row>
  );
}

const styles = StyleSheet.create({
  host: {
    flex: 1,
  },
  codeInput: {
    // Window width (440) minus the 28pt side padding.
    width: 384,
  },
  tile: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AppleIdAuth;
