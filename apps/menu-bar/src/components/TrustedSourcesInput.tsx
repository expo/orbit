import { darkTheme, lightTheme } from '@expo/styleguide-native';
import React, { useState } from 'react';
import { StyleSheet, TextInput as NativeTextInput } from 'react-native';

import { TextInput } from './Text';
import { Row } from './View';
import { PlatformColor } from '../modules/PlatformColor';
import { addOpacity } from '../utils/theme';
import { useCurrentTheme } from '../utils/useExpoTheme';

const TrustedSourcesInput = React.forwardRef<
  NativeTextInput,
  React.ComponentProps<typeof TextInput> & {
    initialValue?: string[];
    onSave: (value: string[]) => void;
  }
>(({ editable, initialValue, onSave, ...props }, forwardedRef) => {
  const theme = useCurrentTheme();
  const [value, setValue] = useState(initialValue?.join(', ') ?? '');

  const backgroundColor =
    theme === 'light'
      ? addOpacity(lightTheme.background.default, 0.6)
      : addOpacity(darkTheme.background.default, 0.2);

  const handleSave = () => {
    const formattedValue = value
      ?.split(',')
      .map((domain) => domain.trim())
      .filter((i) => !!i);

    onSave(formattedValue ?? []);
  };

  return (
    <Row
      border="light"
      rounded="medium"
      align="center"
      style={[styles.inputContainer, { backgroundColor }, !editable && styles.inputDisabled]}>
      <TextInput
        shadow="input"
        {...props}
        value={value}
        style={styles.input}
        placeholderTextColor={PlatformColor('placeholderTextColor')}
        ref={forwardedRef as any}
        editable={editable}
        onChangeText={setValue}
        onSubmitEditing={handleSave}
        onBlur={handleSave}
        numberOfLines={2}
      />
    </Row>
  );
});

export default TrustedSourcesInput;

const styles = StyleSheet.create({
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
  inputDisabled: {
    opacity: 0.66,
  },
  icon: {
    paddingHorizontal: 6,
  },
});
