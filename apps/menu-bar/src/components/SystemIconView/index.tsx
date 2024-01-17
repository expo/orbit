import { requireNativeComponent, StyleSheet, ImageProps } from 'react-native';

type Props = Omit<ImageProps, 'source'> & { systemIconName: string };

const SystemIconViewInternal = requireNativeComponent<Props>('SystemIconView');

const SystemIconView = (props: Props) => {
  return <SystemIconViewInternal {...props} style={[styles.icon, props?.style]} />;
};

const styles = StyleSheet.create({
  icon: {
    height: 18,
    width: 18,
  },
});

export default SystemIconView;
