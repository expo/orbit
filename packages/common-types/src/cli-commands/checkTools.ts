export type PlatformToolsCheck = {
  android?: { success: boolean; reason?: string };
  ios?: { success: boolean; reason?: string };
};
