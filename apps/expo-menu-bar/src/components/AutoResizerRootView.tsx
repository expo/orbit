import {requireNativeComponent, ViewProps} from 'react-native';

const AutoResizerRootView = requireNativeComponent<
  ViewProps & {enabled: boolean}
>('AutoResizerRootView');

export default AutoResizerRootView;
