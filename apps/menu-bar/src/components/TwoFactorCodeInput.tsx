import React, { useRef, useState } from 'react';
import { Pressable, TextInput as RNTextInput, StyleSheet } from 'react-native';

import { Row, Text, View } from './index';
import { useCurrentTheme } from '../utils/useExpoTheme';

type Props = {
  value: string;
  onChangeText: (code: string) => void;
  /** Fires once when the 6th digit lands. */
  onComplete: (code: string) => void;
};

const CODE_LENGTH = 6;
// react-native-macos prop that the upstream TextInput types do not declare.
const noFocusRing = { enableFocusRing: false } as object;
const ACCENT = '#0A84FF';

/**
 * Six display boxes backed by one invisible full-size TextInput, so paste and
 * normal typing both work and focus handling stays native.
 */
const TwoFactorCodeInput = ({ value, onChangeText, onComplete }: Props) => {
  const dark = useCurrentTheme() === 'dark';
  const inputRef = useRef<RNTextInput>(null);
  const [focused, setFocused] = useState(false);

  const handleChange = (text: string) => {
    const next = text.replace(/\D/g, '').slice(0, CODE_LENGTH);
    onChangeText(next);
    if (next.length === CODE_LENGTH) {
      onComplete(next);
    }
  };

  const activeIndex = Math.min(value.length, CODE_LENGTH - 1);
  const boxColors = {
    backgroundColor: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    borderColor: dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.1)',
  };

  return (
    <Pressable onPress={() => inputRef.current?.focus()}>
      <Row style={styles.row}>
        {Array.from({ length: CODE_LENGTH }, (_, index) => (
          <View
            key={index}
            align="centered"
            style={[
              styles.box,
              boxColors,
              focused && index === activeIndex ? styles.activeBox : null,
            ]}>
            <Text style={styles.digit}>{value[index] ?? ''}</Text>
          </View>
        ))}
      </Row>
      <RNTextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        autoFocus
        // macOS draws a focus ring around the field even when it is invisible.
        {...noFocusRing}
        style={styles.hiddenInput}
      />
    </Pressable>
  );
};

export default TwoFactorCodeInput;

const styles = StyleSheet.create({
  row: {
    gap: 8,
  },
  box: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    borderWidth: 0.5,
  },
  activeBox: {
    borderColor: ACCENT,
    borderWidth: 1.5,
  },
  digit: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  hiddenInput: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0,
  },
});
