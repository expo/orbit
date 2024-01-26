import { ViewProps } from 'react-native';

export type ProgressIndicatorViewProps = ViewProps & {
  progress?: number;
  indeterminate?: boolean;
  size?: 'small' | 'large';
};
