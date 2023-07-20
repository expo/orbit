type DeviceState = "Shutdown" | "Booted";

export type SimulatorDevice = {
  availabilityError: "runtime profile not found";
  /**
   * '/Users/name/Library/Developer/CoreSimulator/Devices/00E55DC0-0364-49DF-9EC6-77BE587137D4/data'
   */
  dataPath: string;
  /**
   * '/Users/name/Library/Logs/CoreSimulator/00E55DC0-0364-49DF-9EC6-77BE587137D4'
   */
  logPath: string;
  /**
   * '00E55DC0-0364-49DF-9EC6-77BE587137D4'
   */
  udid: string;
  /**
   * com.apple.CoreSimulator.SimRuntime.tvOS-13-4
   */
  runtime: string;
  isAvailable: boolean;
  /**
   * 'com.apple.CoreSimulator.SimDeviceType.Apple-TV-1080p'
   */
  deviceTypeIdentifier: string;
  state: DeviceState;
  /**
   * 'Apple TV'
   */
  name: string;

  osType: OSType;
  /**
   * '13.4'
   */
  osVersion: string;
  /**
   * 'iPhone 11 (13.6)'
   */
  windowName: string;
};

export type XCTraceDevice = {
  /**
   * '00E55DC0-0364-49DF-9EC6-77BE587137D4'
   */
  udid: string;
  /**
   * 'Apple TV'
   */
  name: string;

  deviceType: "device" | "catalyst";
  /**
   * '13.4'
   */
  osVersion: string;
};

type OSType = "iOS" | "tvOS" | "watchOS" | "macOS";
