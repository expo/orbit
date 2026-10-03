import { Host, ProgressView } from '@expo/ui/swift-ui';
import { progressViewStyle } from '@expo/ui/swift-ui/modifiers';
import * as React from 'react';
import { StyleSheet } from 'react-native';

import { ProgressIndicatorViewProps } from './ProgressIndicator.types';

export default function ProgressIndicatorView({
  progress,
  indeterminate,
  size,
  style,
}: ProgressIndicatorViewProps) {
  return (
    <Host style={[styles.container, getSizeStyle(size), style]}>
      <ProgressView
        value={indeterminate ? undefined : (progress ?? 0) / 100}
        modifiers={[progressViewStyle('linear')]}
      />
    </Host>
  );
}

function getSizeStyle(size: ProgressIndicatorViewProps['size']) {
  return size === 'small' ? styles.sizeSmall : styles.sizeLarge;
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
  },
  sizeSmall: {
    height: 20,
  },
  sizeLarge: {
    height: 24,
  },
});
