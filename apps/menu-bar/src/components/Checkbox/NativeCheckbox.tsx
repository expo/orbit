import React, { useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { requireNativeComponent } from 'react-native';
import codegenNativeCommands from 'react-native/Libraries/Utilities/codegenNativeCommands';

import { CheckboxChangeEvent, NativeCheckboxProps } from './types';

const NativeCheckbox = requireNativeComponent<NativeCheckboxProps>('Checkbox');

interface NativeCommands {
  setValue: (viewRef: React.ElementRef<typeof NativeCheckbox>, value: boolean) => void;
}

const Commands: NativeCommands = codegenNativeCommands<NativeCommands>({
  supportedCommands: ['setValue'],
});

const Checkbox = React.forwardRef(
  (
    {
      onChange,
      ...props
    }: NativeCheckboxProps & {
      onChange?: (event: CheckboxChangeEvent) => void;
    },
    ref: React.ForwardedRef<{ setNative: (native: { value?: boolean }) => void }>
  ) => {
    const nativeSwitchRef = useRef<React.ElementRef<typeof NativeCheckbox> | null>(null);
    const [native, setNative] = useState<{ value?: boolean }>({ value: undefined });

    useImperativeHandle(
      ref,
      () => ({
        setNative,
      }),
      []
    );

    useLayoutEffect(() => {
      // This is necessary in case native updates the switch and JS decides
      // that the update should be ignored and we should stick with the value
      // that we have in JS.
      const jsValue = props.value === true;
      const shouldUpdateNativeSwitch = native.value != null && native.value !== jsValue;
      if (shouldUpdateNativeSwitch && nativeSwitchRef.current?.setNativeProps != null) {
        Commands.setValue(nativeSwitchRef.current, jsValue);
      }
    }, [props.value, native]);

    const handleChange = (event: CheckboxChangeEvent) => {
      onChange?.(event);
      setNative({ value: event.nativeEvent.value });
    };

    return <NativeCheckbox {...props} onChange={handleChange} ref={nativeSwitchRef} />;
  }
);
export default Checkbox;
