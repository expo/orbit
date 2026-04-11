import { browser, $, $$ } from '@wdio/globals';

/**
 * Returns the correct WebdriverIO selector for a testID based on the current platform.
 *
 * - Electron (web): uses CSS attribute selector `[data-testid="..."]`
 * - macOS native (Appium mac2): uses accessibility id selector `~...`
 */
function selectorForTestId(testId: string): string {
  // Electron sets browserName to 'electron'; Appium mac2 does not set browserName.
  const isElectron = browser.capabilities.browserName === 'electron';
  if (isElectron) {
    return `[data-testid="${testId}"]`;
  }
  return `~${testId}`;
}

export function byTestId(testId: string) {
  return $(selectorForTestId(testId));
}

export function allByTestId(testId: string) {
  return $$(selectorForTestId(testId));
}
