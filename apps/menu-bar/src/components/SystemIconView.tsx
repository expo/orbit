import { requireNativeComponent, ImageProps } from 'react-native';

type Props = Omit<ImageProps, 'source'> & { systemIconName: string };

const SystemIconViewInternal = requireNativeComponent<Props>('SystemIconView');

const SystemIconView = (props: Props) => {
  return <SystemIconViewInternal {...props} style={[defaultStyle, props?.style]} />;
};

const defaultStyle = {
  height: 18,
  width: 18,
};

export default SystemIconView;
