import {requireNativeComponent, ViewProps, View, Platform} from 'react-native';

const AutoResizerRootView =
  Platform.OS === 'windows'
    ? View
    : requireNativeComponent<ViewProps & {enabled: boolean}>(
        'AutoResizerRootView',
      );

export default AutoResizerRootView;
