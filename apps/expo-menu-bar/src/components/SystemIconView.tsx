import {requireNativeComponent, ViewProps} from 'react-native';

type Props = ViewProps & {systemIconName: string};

const SystemIconViewInternal = requireNativeComponent<Props>('SystemIconView');

const SystemIconView = (props: Props) => {
  return (
    <SystemIconViewInternal {...props} style={[defaultStyle, props?.style]} />
  );
};

const defaultStyle = {
  height: 22,
  width: 22,
};

export default SystemIconView;
