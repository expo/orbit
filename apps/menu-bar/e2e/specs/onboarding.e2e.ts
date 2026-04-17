import { browser, expect } from '@wdio/globals';

import { byTestId } from '../helpers';
import { TestIDs } from '../testIDs';

const isElectron = () => browser.capabilities.browserName === 'electron';

describe('Onboarding', () => {
  it('should show onboarding window on first launch', async () => {
    if (isElectron()) {
      // Electron opens onboarding in a separate BrowserWindow; switch to it.
      const handles = await browser.getWindowHandles();
      expect(handles.length).toBeGreaterThanOrEqual(2);
      await browser.switchToWindow(handles[1]);
    }

    // On macOS all app windows live in the same accessibility tree, no switch needed.
    await expect(byTestId(TestIDs.onboardingWindow)).toExist();
    await expect(byTestId(TestIDs.getStartedButton)).toExist();
  });

  it('should close onboarding when "Get Started" is pressed', async () => {
    await byTestId(TestIDs.getStartedButton).click();

    if (isElectron()) {
      const currentHandles = await browser.getWindowHandles();
      expect(currentHandles.length).toBe(1);
      await browser.switchToWindow(currentHandles[0]);
    } else {
      await expect(byTestId(TestIDs.onboardingWindow)).not.toExist();
    }
  });
});
