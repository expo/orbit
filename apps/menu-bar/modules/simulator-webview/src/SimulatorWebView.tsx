import { requireNativeViewManager } from 'expo-modules-core';
import * as React from 'react';
import { StyleSheet } from 'react-native';

import { SimulatorWebViewProps } from './SimulatorWebView.types';

const NativeView: React.ComponentType<SimulatorWebViewProps> =
  requireNativeViewManager('SimulatorWebView');

export default function SimulatorWebView(props: SimulatorWebViewProps) {
  return <NativeView {...props} style={[styles.container, props.style]} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
