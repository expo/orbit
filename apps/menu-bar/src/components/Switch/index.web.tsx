import { Switch as FluentSwitch } from '@fluentui/react-components';
import { SwitchProps } from 'react-native';

export function Switch({ onValueChange, value, disabled }: SwitchProps) {
  return (
    <FluentSwitch
      disabled={disabled}
      checked={value}
      onChange={(ev) => {
        if (onValueChange) {
          onValueChange(Boolean(ev.target.checked));
        }
      }}
    />
  );
}
