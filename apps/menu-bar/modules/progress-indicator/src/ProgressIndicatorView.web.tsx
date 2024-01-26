import * as React from 'react';

import { ProgressIndicatorViewProps } from './ProgressIndicator.types';

export default function ProgressIndicatorView({
  progress,
  indeterminate,
}: ProgressIndicatorViewProps) {
  return <progress value={!indeterminate ? progress : undefined} max="100" />;
}
