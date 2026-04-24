import { browser, expect } from '@wdio/globals';

import { byTestId, isNativeMac, switchToWindowContaining } from '../helpers';
import { TestIDs } from '../testIDs';

describe('Onboarding', () => {
  it('should show onboarding window on first launch', async () => {
    if (!isNativeMac()) {
      const found = await switchToWindowContaining(TestIDs.getStartedButton);
      expect(found).toBe(true);
    }

    await expect(byTestId(TestIDs.getStartedButton)).toExist();
  });

  it('should close onboarding when "Get Started" is pressed', async () => {
    await byTestId(TestIDs.getStartedButton).click();

    if (!isNativeMac()) {
      // After closing onboarding, switch back to the main popover window.
      await browser.pause(500);
      const currentHandles = await browser.getWindowHandles();
      expect(currentHandles.length).toBe(1);
      await browser.switchToWindow(currentHandles[0]);
    } else {
      await expect(byTestId(TestIDs.getStartedButton)).not.toExist();
    }
  });
});
