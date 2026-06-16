import { browser, $, $$ } from '@wdio/globals';

/**
 * Detect macOS native (Appium mac2) vs Electron (web).
 *
 * We check for `automationName === 'Mac2'` because:
 * - `browserName` is unreliable (Chromedriver overrides 'electron' → 'chrome')
 * - `platformName` is unreliable (wdio-electron-service sets it to 'mac' on macOS)
 * - `automationName` is only set in wdio.macos.ts and never present for Electron
 */
export function isNativeMac(): boolean {
  return (browser.capabilities as Record<string, unknown>)['automationName'] === 'Mac2';
}

/**
 * Returns the correct WebdriverIO selector for a testID based on the current platform.
 *
 * - Electron (web): uses CSS attribute selector `[data-testid="..."]`
 * - macOS native (Appium mac2): uses accessibility id selector `~...`
 */
function selectorForTestId(testId: string): string {
  if (isNativeMac()) {
    return `~${testId}`;
  }
  return `[data-testid="${testId}"]`;
}

export function byTestId(testId: string) {
  return $(selectorForTestId(testId));
}

export function allByTestId(testId: string) {
  return $$(selectorForTestId(testId));
}

/**
 * Electron-only. Iterate window handles, switch to each, and resolve when one
 * contains `testId`. Used because Orbit is a multi-window app (popover is the
 * hidden mainWindow until shown; Onboarding is a separate window) and the
 * session's default handle isn't always the one we want to query.
 *
 * Keeps polling (cheap — no DOM wait per handle) until the overall `timeoutMs`
 * elapses, since the popover only renders after `hasInitialized` flips true
 * (DevicesProvider CLI call completes), which can take several seconds.
 */
export async function switchToWindowContaining(
  testId: string,
  { timeoutMs = 30000, intervalMs = 250 }: { timeoutMs?: number; intervalMs?: number } = {}
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const handles = await browser.getWindowHandles();
    for (const handle of handles) {
      await browser.switchToWindow(handle);
      if (await byTestId(testId).isExisting()) {
        return true;
      }
    }
    await browser.pause(intervalMs);
  }
  return false;
}
