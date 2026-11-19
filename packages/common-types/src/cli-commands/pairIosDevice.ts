export type PairIosDeviceResult = {
  success: boolean;
  /** The paired iPhone. Set when `success` is `true`. */
  device?: { udid: string; name: string; osVersion: string };
  /** Set when `success` is `false`. */
  error?: { code: string; message: string };
};
