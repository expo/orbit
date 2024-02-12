import { ProgressBar } from '@fluentui/react-components';
import * as React from 'react';

import { ProgressIndicatorViewProps } from './ProgressIndicator.types';

export default function ProgressIndicatorView({
  progress = 0,
  indeterminate,
}: ProgressIndicatorViewProps) {
  return (
    <ProgressBar
      thickness="large"
      value={!indeterminate ? progress : undefined}
      max={100}
      style={{
        width: 'auto',
        height: 6,
      }}
    />
  );
}
