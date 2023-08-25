import {NativeModule, NativeModules} from 'react-native';

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

type WebAuthenticationSessionModule = {
  openAuthSessionAsync: (url: string) => Promise<WebBrowserResult>;
};

const WebAuthenticationSessionModule: WebAuthenticationSessionModule =
  NativeModules.WebAuthenticationSession;

export default WebAuthenticationSessionModule;
