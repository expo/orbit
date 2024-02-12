import { Switch as FluentSwitch } from '@fluentui/react-components';
import { SwitchProps } from 'react-native';
export function Switch({ onValueChange, value, ...props }: SwitchProps) {
  return (
    <FluentSwitch
      checked={value}
      onChange={(ev) => {
        if (onValueChange) {
          onValueChange(Boolean(ev.target.checked));
        }
      }}
    />
  );
}
