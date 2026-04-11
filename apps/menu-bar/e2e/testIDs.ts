/**
 * Shared test IDs used across both Electron (WebdriverIO) and macOS (XCUITest) E2E tests.
 *
 * These IDs map to `testID` props in React Native components, which become:
 * - `data-testid` attributes in the Electron/web build
 * - `accessibilityIdentifier` in the macOS native build
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
