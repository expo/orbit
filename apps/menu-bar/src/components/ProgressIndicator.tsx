import {
  ColorValue,
  requireNativeComponent,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';

type NativeProps = {
  color?: ColorValue;
  size?: 'small' | 'large';
  style?: StyleProp<ViewStyle>;
  indeterminate?: boolean;
  progress?: number;
};

const NativeProgressIndicator =
  requireNativeComponent<NativeProps>('ProgressIndicator');

const ProgressIndicator = (props: NativeProps) => {
  return (
    <NativeProgressIndicator
      {...props}
      style={[styles.container, getSizeStyle(props.size), props.style]}
    />
  );
};

function getSizeStyle(size: NativeProps['size']) {
  switch (size) {
    case 'small':
      return styles.sizeSmall;
    case 'large':
    default:
      return styles.sizeLarge;
  }
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
  },
  sizeSmall: {
    height: 20,
  },
  sizeLarge: {
    height: 36,
  },
});

export default ProgressIndicator;
