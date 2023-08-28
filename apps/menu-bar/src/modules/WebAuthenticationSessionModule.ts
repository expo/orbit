import { NativeModules } from 'react-native';

export enum WebBrowserResultType {
  CANCEL = 'cancel',
  SUCCESS = 'success',
}

export type WebBrowserResult =
  | {
      type: WebBrowserResultType.CANCEL;
    }
  | {
      type: WebBrowserResultType.SUCCESS;
      url: string;
    };

type WebAuthenticationSessionModuleType = {
  openAuthSessionAsync: (url: string) => Promise<WebBrowserResult>;
};

const WebAuthenticationSessionModule: WebAuthenticationSessionModuleType =
  NativeModules.WebAuthenticationSession;

export default WebAuthenticationSessionModule;
