import { DeviceListErrorHelper } from './listDevices';

export type FailureReason = {
  message: string;
  command?: string;
};

export type PlatformToolsCheck = {
  android?: {
    success: boolean;
    reason?: FailureReason;
  };
  ios?: {
    success: boolean;
    reason?: FailureReason;
  };
  /** Helper software for installing apps on a physical iPhone over USB. */
  appleDevice?: {
    success: boolean;
    reason?: FailureReason;
    helper?: DeviceListErrorHelper;
  };
};
