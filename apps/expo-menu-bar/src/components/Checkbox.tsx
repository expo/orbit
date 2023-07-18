import {useLayoutEffect, useRef, useState} from 'react';
import {
  NativeSyntheticEvent,
  requireNativeComponent,
  StyleSheet,
  TargetedEvent,
  ViewProps,
} from 'react-native';
import codegenNativeCommands from 'react-native/Libraries/Utilities/codegenNativeCommands';

interface CheckboxChangeEventData extends TargetedEvent {
  value: boolean;
}

interface CheckboxChangeEvent
  extends NativeSyntheticEvent<CheckboxChangeEventData> {}

type NativeCheckboxProps = ViewProps & {
  disabled?: boolean;
  onChange?: (event: CheckboxChangeEvent) => void;
  value: boolean;
};

const NativeCheckbox = requireNativeComponent<NativeCheckboxProps>('Checkbox');

type CheckboxProps = NativeCheckboxProps & {
  onValueChange?: (value: boolean) => void;
};

interface NativeCommands {
  setValue: (
    viewRef: React.ElementRef<typeof NativeCheckbox>,
    value: boolean,
  ) => void;
}

export const Commands: NativeCommands = codegenNativeCommands<NativeCommands>({
  supportedCommands: ['setValue'],
});

const Checkbox = ({onChange, onValueChange, ...props}: CheckboxProps) => {
  const [native, setNative] = useState<{value?: boolean}>({value: undefined});

  const nativeSwitchRef = useRef<React.ElementRef<
    typeof NativeCheckbox
  > | null>(null);

  useLayoutEffect(() => {
    // This is necessary in case native updates the switch and JS decides
    // that the update should be ignored and we should stick with the value
    // that we have in JS.
    const jsValue = props.value === true;
    const shouldUpdateNativeSwitch =
      native.value != null && native.value !== jsValue;
    if (
      shouldUpdateNativeSwitch &&
      nativeSwitchRef.current?.setNativeProps != null
    ) {
      Commands.setValue(nativeSwitchRef.current, jsValue);
    }
  }, [props.value, native]);

  const handleChange = (event: CheckboxChangeEvent) => {
    onChange?.(event);
    onValueChange?.(event.nativeEvent.value);
    setNative({value: event.nativeEvent.value});
  };

  return (
    <NativeCheckbox
      {...props}
      style={[styles.checkbox, props.style]}
      onChange={handleChange}
      ref={nativeSwitchRef}
    />
  );
};

export default Checkbox;

const styles = StyleSheet.create({
  checkbox: {height: 18, width: 18},
});
