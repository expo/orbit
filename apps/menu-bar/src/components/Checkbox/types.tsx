import { TargetedEvent, NativeSyntheticEvent, ViewProps } from 'react-native';

interface CheckboxChangeEventData extends TargetedEvent {
  value: boolean;
}

export interface CheckboxChangeEvent extends NativeSyntheticEvent<CheckboxChangeEventData> {}

export type NativeCheckboxProps = ViewProps & {
  disabled?: boolean;
  onChange?: (event: CheckboxChangeEvent) => void;
  value?: boolean;
};

export type CheckboxProps = Omit<NativeCheckboxProps, ''> & {
  onValueChange?: (value: boolean) => void;
  label?: string;
};
