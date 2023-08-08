import {requireNativeComponent, ViewProps} from 'react-native';

const AutoResizerRootView = requireNativeComponent<
  ViewProps & {enabled: boolean; maxRelativeHeight: number}
>('AutoResizerRootView');

export default AutoResizerRootView;
