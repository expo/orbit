import { ViewProps } from 'react-native';

export type SystemIconViewProps = ViewProps & {
  systemIconName: string;
  tintColor?: string;
};
