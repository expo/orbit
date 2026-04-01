import { requireNativeViewManager } from 'expo-modules-core';
import { StyleSheet } from 'react-native';

import { SystemIconViewProps } from './types';

const NativeView: React.ComponentType<SystemIconViewProps> =
  requireNativeViewManager('SystemIconView');

export default function SystemIconView(props: SystemIconViewProps) {
  return <NativeView {...props} style={[styles.icon, props.style]} />;
}

const styles = StyleSheet.create({
  icon: {
    height: 18,
    width: 18,
  },
});
