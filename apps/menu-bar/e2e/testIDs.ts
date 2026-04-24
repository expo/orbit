/**
 * Shared test IDs used across both Electron and macOS E2E tests.
 *
 * These map to `testID` props in React Native components, which become:
 * - `data-testid` attributes in the Electron/web build (queried via CSS selector)
 * - `accessibilityIdentifier` in the macOS native build (queried via Appium accessibility id)
 */
export const TestIDs = {
  // Popover (main menu bar content)
  popoverCore: 'popover-core',
  popoverFooter: 'popover-footer',
  settingsButton: 'settings-button',
  quitButton: 'quit-button',

  // Builds section
  buildsSection: 'builds-section',
  selectBuildEAS: 'select-build-eas',
  selectBuildLocal: 'select-build-local',

  // Devices
  deviceItem: 'device-item',

  // Onboarding
  onboardingWindow: 'onboarding-window',
  getStartedButton: 'get-started-button',

  // Settings
  settingsWindow: 'settings-window',
} as const;
