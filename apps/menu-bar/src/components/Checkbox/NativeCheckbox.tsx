import { Host, Toggle } from '@expo/ui/swift-ui';
import { disabled as disabledModifier } from '@expo/ui/swift-ui/modifiers';

import { CheckboxChangeEvent, NativeCheckboxProps } from './types';

const Checkbox = ({ value, disabled, onChange, style }: NativeCheckboxProps) => (
  <Host style={style}>
    <Toggle
      isOn={Boolean(value)}
      modifiers={disabled ? [disabledModifier(true)] : undefined}
      onIsOnChange={(isOn) => onChange?.({ nativeEvent: { value: isOn } } as CheckboxChangeEvent)}
    />
  </Host>
);

export default Checkbox;
