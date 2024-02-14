import { NativeModules } from 'react-native';

import { WebAuthenticationSessionModuleType, WebBrowserResultType } from './types';

const WebAuthenticationSessionModule: WebAuthenticationSessionModuleType =
  NativeModules.WebAuthenticationSession;

export default WebAuthenticationSessionModule;

export { WebBrowserResultType };
