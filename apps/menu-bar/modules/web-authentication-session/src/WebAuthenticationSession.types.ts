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

export type WebAuthenticationSessionModuleType = {
  openAuthSessionAsync: (url: string) => Promise<WebBrowserResult>;
};
