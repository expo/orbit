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
};
