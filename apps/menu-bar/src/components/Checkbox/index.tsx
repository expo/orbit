import { useRef } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import NativeCheckbox from './NativeCheckbox';
import { CheckboxChangeEvent, CheckboxProps } from './types';
import { Text } from '../Text';
import { Row } from '../View';

const Checkbox = ({ onChange, onValueChange, label, ...props }: CheckboxProps) => {
  const nativeCheckboxRef = useRef<React.ElementRef<typeof NativeCheckbox>>(null);

  const handleChange = (event: CheckboxChangeEvent) => {
    onChange?.(event);
    onValueChange?.(event.nativeEvent.value);
  };

  return (
    <Row align="center" gap="1">
      <NativeCheckbox
        {...props}
        style={[styles.checkbox, props.style]}
        onChange={handleChange}
        ref={nativeCheckboxRef}
      />
      {label && (
        <Pressable
          onPress={() => {
            onValueChange?.(!props.value);
            nativeCheckboxRef.current?.setNative({ value: !props.value });
          }}>
          <Text size="small">{label}</Text>
        </Pressable>
      )}
    </Row>
  );
};

export default Checkbox;

const styles = StyleSheet.create({
  checkbox: { height: 18, width: 18 },
});
