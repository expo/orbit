export type AppleAppInfo = {
  deviceType: 'device' | 'simulator';
  osType: 'iOS' | 'tvOS' | 'watchOS' | 'macOS';
  /**
   * From the app's embedded.mobileprovision; absent for simulator, macOS and
   * unsigned builds. Lets the host tell before installing whether the build can
   * install on a given device or has to be resigned.
   */
  provisioning?: {
    name?: string;
    teamId?: string;
    /** ISO date; absent if the profile carries no (parseable) expiry. */
    expiresAt?: string;
    provisionsAllDevices: boolean;
    /** UDIDs; absent for enterprise and App Store / TestFlight profiles. */
    provisionedDevices?: string[];
    kind: 'development' | 'ad-hoc' | 'enterprise' | 'app-store';
  };
};
