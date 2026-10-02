import React, { useRef, useState } from 'react';
import { Pressable, TextInput as RNTextInput, StyleSheet } from 'react-native';

import { Row, Text, View } from './index';
import { useExpoTheme } from '../utils/useExpoTheme';

type Props = {
  value: string;
  onChangeText: (code: string) => void;
  /** Fires once when the 6th digit lands. */
  onComplete: (code: string) => void;
};

const CODE_LENGTH = 6;

/**
 * Six display boxes backed by one invisible full-size TextInput, so paste and
 * normal typing both work and focus handling stays native.
 */
const TwoFactorCodeInput = ({ value, onChangeText, onComplete }: Props) => {
  const theme = useExpoTheme();
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

  return (
    <Pressable onPress={() => inputRef.current?.focus()}>
      <Row gap="1">
        {Array.from({ length: CODE_LENGTH }, (_, index) => (
          <View
            key={index}
            border="default"
            rounded="small"
            align="centered"
            style={[
              styles.box,
              focused && index === activeIndex ? { borderColor: theme.text.default } : null,
            ]}>
            <Text size="large">{value[index] ?? ''}</Text>
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
        style={styles.hiddenInput}
      />
    </Pressable>
  );
};

export default TwoFactorCodeInput;

const styles = StyleSheet.create({
  box: {
    width: 38,
    height: 46,
  },
  hiddenInput: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0,
  },
});
