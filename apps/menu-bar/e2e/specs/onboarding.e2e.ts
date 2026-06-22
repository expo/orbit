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
      // the popover. If we issue any WebDriver command against that destroyed
      // target — as a bare `getWindowHandles()` after the click would — the
      // legacy IPC bridge hangs instead of erroring, wedging the session until
      // the 60s Mocha timeout (and then a 120s session-teardown timeout). That
      // race is the source of this spec's flakiness.
      //
      // Capture the onboarding handle up front, then after the click poll until
      // it drops out of the handle list and switch to a surviving window by id,
      // so we never query the dead target.
      const onboardingHandle = await browser.getWindowHandle();
      await byTestId(TestIDs.getStartedButton).click();

      await browser.waitUntil(
        async () => {
          const handles = await browser.getWindowHandles();
          if (handles.includes(onboardingHandle) || handles.length !== 1) {
            return false;
          }
          await browser.switchToWindow(handles[0]);
          return true;
        },
        {
          timeout: 10000,
          timeoutMsg: 'Onboarding window did not close after pressing "Get Started"',
        }
      );
    } else {
      await byTestId(TestIDs.getStartedButton).click();
      await expect(byTestId(TestIDs.getStartedButton)).not.toExist();
    }
  });
});
