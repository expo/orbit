export type PairAndroidDeviceResult = {
  success: boolean;
  /** Set when `success` is `false`. */
  error?: { code: string; message: string };
};
