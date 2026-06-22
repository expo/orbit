import { darkTheme, lightTheme } from '@expo/styleguide-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  TextInput as RNTextInput,
  TouchableOpacity,
} from 'react-native';

import Button from './Button';
import QRCode from './QRCode';
import { Text } from './Text';
import { Row, Spacer, View } from './View';
import {
  AndroidPairingService,
  DEVICE_PAIRED_LOG,
  listAndroidPairingServicesAsync,
  pairAndroidDeviceAsync,
  pairAndroidDeviceWithQRCodeAsync,
} from '../commands/pairAndroidDeviceAsync';
import MenuBarModule from '../modules/MenuBarModule';
import { PlatformColor } from '../modules/PlatformColor';
import { addOpacity } from '../utils/theme';
import { useCurrentTheme } from '../utils/useExpoTheme';
import { WindowsNavigator } from '../windows';

const QR_CODE_SIZE = 160;
const DISCOVERY_INTERVAL_MS = 2000;

type Tab = 'qr' | 'code';
type Status = 'idle' | 'connecting' | 'success' | 'error';

type PairingCallbacks = {
  onStart: (deviceName: string) => void;
  onSuccess: (deviceName: string) => void;
  onError: (message?: string) => void;
};

function randomAlphanumeric(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

const PairAndroidDeviceForm = () => {
  const theme = useCurrentTheme();
  const [tab, setTab] = useState<Tab>('qr');
  const [status, setStatus] = useState<Status>('idle');
  const [deviceName, setDeviceName] = useState('your device');
  const [errorMessage, setErrorMessage] = useState<string>();

  const onStart = useCallback((name: string) => {
    setDeviceName(name);
    setStatus('connecting');
  }, []);
  const onSuccess = useCallback((name: string) => {
    setDeviceName(name);
    setStatus('success');
  }, []);
  const onError = useCallback((message?: string) => {
    setErrorMessage(message);
    setStatus('error');
  }, []);
  const callbacks: PairingCallbacks = { onStart, onSuccess, onError };

  const reset = () => {
    setErrorMessage(undefined);
    setStatus('idle');
  };

  if (status === 'connecting') {
    return <ConnectingState deviceName={deviceName} />;
  }
  if (status === 'success') {
    return (
      <SuccessState
        deviceName={deviceName}
        onDone={() => {
          WindowsNavigator.close('PairAndroidDevice');
          MenuBarModule.openPopover();
        }}
      />
    );
  }
  if (status === 'error') {
    return (
      <ErrorState
        message={errorMessage}
        onRetry={reset}
        onUseQr={() => {
          setTab('qr');
          reset();
        }}
      />
    );
  }

  return (
    <View>
      <Segmented tab={tab} onChange={setTab} theme={theme} />
      <View mt="3">
        {tab === 'qr' ? (
          <QRCodePairing {...callbacks} />
        ) : (
          <PairingCodeForm theme={theme} {...callbacks} />
        )}
      </View>
    </View>
  );
};

const Segmented = ({
  tab,
  onChange,
  theme,
}: {
  tab: Tab;
  onChange: (tab: Tab) => void;
  theme: ReturnType<typeof useCurrentTheme>;
}) => {
  const trackColor = theme === 'light' ? addOpacity('#000000', 0.08) : addOpacity('#ffffff', 0.08);
  // Raised "selected" surface, lighter than the track it sits on.
  const activeColor = theme === 'light' ? '#ffffff' : '#2b2f37';

  const renderSegment = (value: Tab, label: string) => {
    const active = tab === value;
    return (
      <TouchableOpacity
        onPress={() => onChange(value)}
        activeOpacity={0.8}
        style={[
          styles.segment,
          active && [styles.segmentActive, { backgroundColor: activeColor }],
        ]}>
        <Text size="tiny" weight="semibold" color={active ? 'default' : 'secondary'}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Row gap="1" rounded="medium" px="0.5" py="0.5" style={{ backgroundColor: trackColor }}>
      {renderSegment('qr', 'Scan QR code')}
      {renderSegment('code', 'Pairing code')}
    </Row>
  );
};

const QRCodePairing = ({ onSuccess, onError }: PairingCallbacks) => {
  const [qrCodeContent, setQrCodeContent] = useState<string>();

  useEffect(() => {
    // Ignore results once the component unmounts (e.g. user switches tabs).
    let active = true;
    const serviceName = `expo-orbit-${randomAlphanumeric(10)}`;
    const pairingCode = randomAlphanumeric(8);
    setQrCodeContent(`WIFI:T:ADB;S:${serviceName};P:${pairingCode};;`);

    pairAndroidDeviceWithQRCodeAsync({ serviceName, pairingCode }, (statusMessage) => {
      // Show success the moment pairing lands; the CLI connects in the
      // background (discovering the connect service can take ~15s).
      if (active && statusMessage.includes(DEVICE_PAIRED_LOG)) {
        onSuccess('your device');
      }
    })
      .then((result) => {
        // Only surface failures here — success is driven by the log above so
        // the user isn't kept waiting on the background connect step.
        if (active && !result.success) {
          onError(result.error?.message);
        }
      })
      .catch((error) => {
        if (active) {
          onError(error instanceof Error ? error.message : undefined);
        }
      });

    // ponytail: this abandons the in-flight CLI wait, but the process keeps
    // running until it times out (no cancellation hook exists).
    return () => {
      active = false;
    };
  }, [onSuccess, onError]);

  return (
    <View>
      <Row gap="3" align="center">
        <View rounded="medium" style={styles.qrCodeContainer}>
          {qrCodeContent ? <QRCode value={qrCodeContent} size={QR_CODE_SIZE} /> : null}
        </View>
        <View flex="1" gap="2.5">
          <NumberedStep number={1}>
            On your phone, open Wireless debugging and tap "Pair device with QR code".
          </NumberedStep>
          <NumberedStep number={2}>
            Point the camera at this code to pair automatically.
          </NumberedStep>
        </View>
      </Row>
      <Row
        align="center"
        justify="center"
        gap="2"
        mt="3"
        rounded="medium"
        py="2"
        style={styles.waitingBox}>
        <ActivityIndicator size="small" />
        <Text size="tiny" color="secondary">
          Waiting for your device to scan…
        </Text>
      </Row>
    </View>
  );
};

const NumberedStep = ({ number, children }: { number: number; children: React.ReactNode }) => (
  <Row gap="2" align="start">
    <View rounded="large" align="centered" style={styles.stepBadge}>
      <Text size="tiny" weight="semibold" color="secondary">
        {number}
      </Text>
    </View>
    <Text size="tiny" color="secondary" style={styles.flex}>
      {children}
    </Text>
  </Row>
);

const PairingCodeForm = ({
  theme,
  onStart,
  onSuccess,
  onError,
}: PairingCallbacks & { theme: ReturnType<typeof useCurrentTheme> }) => {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [services, setServices] = useState<AndroidPairingService[]>([]);
  const code = digits.join('');

  // Continuously discover devices on the "Pair device with pairing code" screen,
  // the way Android Studio lists them, so the user only types the code.
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const discovered = await listAndroidPairingServicesAsync();
        if (!cancelled) {
          setServices(discovered);
        }
      } catch {
        // Ignore transient discovery failures; the next poll retries.
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
    if (code.length !== 6) {
      return;
    }
    const name = `Device at ${service.address}`;
    onStart(name);
    try {
      const result = await pairAndroidDeviceAsync(
        { pairingAddress: service.address, pairingCode: code },
        (statusMessage) => {
          // Show success as soon as pairing lands; connect runs in the
          // background (the runCli listener outlives this unmounted form).
          if (statusMessage.includes(DEVICE_PAIRED_LOG)) {
            onSuccess(name);
          }
        }
      );
      // Pairing itself failed (sentinel never logged) — surface the error.
      if (!result.success) {
        onError(result.error?.message);
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : undefined);
    }
  };

  const backgroundColor =
    theme === 'light'
      ? addOpacity(lightTheme.background.default, 0.6)
      : addOpacity(darkTheme.background.default, 0.2);

  return (
    <View>
      <Text size="tiny" weight="semibold" color="secondary" style={styles.label}>
        Wi-Fi pairing code
      </Text>
      <CodeInput digits={digits} onChange={setDigits} backgroundColor={backgroundColor} />

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
                Available to pair
              </Text>
            </View>
            <Button
              title="Pair"
              color="primary"
              disabled={code.length !== 6}
              onPress={() => handlePair(service)}
              style={styles.button}
            />
          </Row>
        ))
      )}

      <Text size="tiny" color="secondary" style={[styles.description, styles.hint]}>
        Tap "Pair device with pairing code" on your phone to reveal the code.
      </Text>
    </View>
  );
};

const CodeInput = ({
  digits,
  onChange,
  backgroundColor,
}: {
  digits: string[];
  onChange: (digits: string[]) => void;
  backgroundColor: string;
}) => {
  const refs = useRef<(RNTextInput | null)[]>([]);

  const setDigit = (index: number, raw: string) => {
    // ponytail: take the last digit typed; multi-char paste lands in one box.
    const value = raw.replace(/\D/g, '').slice(-1);
    const next = digits.slice();
    next[index] = value;
    onChange(next);
    if (value && index < digits.length - 1) {
      refs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  return (
    <Row gap="2" align="center" justify="center" style={{ backgroundColor }}>
      {digits.map((digit, index) => (
        <RNTextInput
          key={index}
          ref={(ref) => {
            refs.current[index] = ref;
          }}
          value={digit}
          onChangeText={(text) => setDigit(index, text)}
          onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
          keyboardType="number-pad"
          maxLength={1}
          placeholder="•"
          placeholderTextColor={PlatformColor('placeholderTextColor')}
          style={[styles.codeBox, { backgroundColor }]}
        />
      ))}
    </Row>
  );
};

const ConnectingState = ({ deviceName }: { deviceName: string }) => (
  <View align="centered" py="6" gap="3">
    <ActivityIndicator size="large" />
    <Text size="medium" weight="semibold" align="center">
      Pairing with {deviceName}…
    </Text>
    <Text size="tiny" color="secondary" align="center" style={styles.stateSubtitle}>
      Establishing a secure connection over your local network.
    </Text>
  </View>
);

const SuccessState = ({ deviceName, onDone }: { deviceName: string; onDone: () => void }) => (
  <View align="centered" pt="2" gap="1">
    <StatusBadge glyph="✓" color={lightTheme.text.success} />
    <Spacer.Vertical size="tiny" />
    <Text size="medium" weight="semibold">
      Device paired
    </Text>
    <Text size="tiny" color="secondary" align="center" style={styles.stateSubtitle}>
      {deviceName} is now available in your device list.
    </Text>
    <Button title="Done" color="primary" onPress={onDone} style={[styles.wideButton, styles.mt3]} />
  </View>
);

const ErrorState = ({
  message,
  onRetry,
  onUseQr,
}: {
  message?: string;
  onRetry: () => void;
  onUseQr: () => void;
}) => (
  <View align="centered" pt="2" gap="1">
    <StatusBadge glyph="✕" color={lightTheme.text.error} />
    <Spacer.Vertical size="tiny" />
    <Text size="medium" weight="semibold">
      Pairing failed
    </Text>
    <Text size="tiny" color="secondary" align="center" style={styles.stateSubtitle}>
      {message ??
        "Couldn't reach the device. Make sure both are on the same Wi-Fi network and the code hasn't expired."}
    </Text>
    <Button
      title="Try again"
      color="primary"
      onPress={onRetry}
      style={[styles.wideButton, styles.mt3]}
    />
    <TouchableOpacity onPress={onUseQr} style={styles.linkButton}>
      <Text size="tiny" color="secondary">
        Pair with a QR code instead
      </Text>
    </TouchableOpacity>
  </View>
);

const StatusBadge = ({ glyph, color }: { glyph: string; color: string }) => (
  <View align="centered" style={[styles.statusBadge, { backgroundColor: addOpacity(color, 0.14) }]}>
    <Text style={{ color, fontSize: 28, lineHeight: 32 }}>{glyph}</Text>
  </View>
);

export default PairAndroidDeviceForm;

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  description: {
    lineHeight: 15,
  },
  hint: {
    marginTop: 12,
  },
  label: {
    marginBottom: 7,
  },
  button: {
    height: 28,
  },
  segment: {
    flex: 1,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
  },
  segmentActive: {
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  wideButton: {
    alignSelf: 'stretch',
    height: 36,
  },
  mt3: {
    marginTop: 12,
  },
  linkButton: {
    marginTop: 8,
    paddingVertical: 6,
  },
  qrCodeContainer: {
    overflow: 'hidden',
    padding: 8,
    backgroundColor: '#ffffff',
  },
  waitingBox: {
    backgroundColor: addOpacity(lightTheme.button.secondary.background, 0.08),
  },
  stepBadge: {
    width: 18,
    height: 18,
    backgroundColor: addOpacity(lightTheme.text.default, 0.07),
  },
  codeBox: {
    flex: 1,
    // Height comes from padding so the digit/placeholder stays vertically
    // centered — a fixed height top-aligns the text on macOS.
    paddingVertical: 13,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 22,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: addOpacity(lightTheme.border.default, 0.5),
    borderRadius: 9,
    color: PlatformColor('labelColor') as unknown as string,
  },
  statusBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  stateSubtitle: {
    lineHeight: 16,
    maxWidth: 280,
  },
  helpDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: addOpacity(lightTheme.border.default, 0.3),
  },
});
