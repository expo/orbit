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
    if (!isNativeMac()) {
      // Pressing "Get Started" runs closeOnboarding() in Onboarding.tsx, which
      // destroys the Onboarding window (the one this session is currently
      // focused on, having been switched to it by the previous test) and opens
      // the popover. Capture the onboarding handle up front, then after the
      // click poll until it drops out of the handle list and switch to a
      // surviving window by id, so we never query the dead target.
      //
      // Note: the Linux CI flake on this test was not in this body but in the
      // afterTest screenshot of the popover window; see wdio.shared.ts.
      const onboardingHandle = await browser.getWindowHandle();
      console.log(
        `[e2e] onboarding handle ${onboardingHandle}, all handles before click:`,
        await browser.getWindowHandles()
      );
      await byTestId(TestIDs.getStartedButton).click();

      let remainingHandle = '';
      await browser.waitUntil(
        async () => {
          const handles = await browser.getWindowHandles();
          if (handles.includes(onboardingHandle) || handles.length !== 1) {
            return false;
          }
          remainingHandle = handles[0];
          await browser.switchToWindow(remainingHandle);
          return true;
        },
        {
          timeout: 10000,
          timeoutMsg: 'Onboarding window did not close after pressing "Get Started"',
        }
      );
      // getUrl is answered by the browser process, so it tells us which window
      // survived even when its renderer is wedged (Linux CI investigation).
      console.log(`[e2e] switched to ${remainingHandle}: ${await browser.getUrl()}`);
    } else {
      await byTestId(TestIDs.getStartedButton).click();
      await expect(byTestId(TestIDs.getStartedButton)).not.toExist();
    }
  });
});
