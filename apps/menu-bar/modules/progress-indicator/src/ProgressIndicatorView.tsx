import { requireNativeViewManager } from 'expo-modules-core';
import * as React from 'react';
import { StyleSheet } from 'react-native';

import { ProgressIndicatorViewProps } from './ProgressIndicator.types';

const NativeView: React.ComponentType<ProgressIndicatorViewProps> =
  requireNativeViewManager('ProgressIndicator');

export default function ProgressIndicatorView(props: ProgressIndicatorViewProps) {
  const [key, setKey] = React.useState(0);

  React.useEffect(() => {
    /**
     * There is a bug in NSProgressIndicator where the progress animation does not
     * work if we switch from a progress indicator (using doubleValue) to indeterminate.
     * To work around this, we need to force a re-render of the component.
     */
    setKey((key) => key + 1);
  }, [props.indeterminate]);
  return (
    <NativeView
      key={key}
      {...props}
      style={[styles.container, getSizeStyle(props.size), props.style]}
    />
  );
}

function getSizeStyle(size: ProgressIndicatorViewProps['size']) {
  return size === 'small' ? styles.Small : styles.sizeLarge;
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
