import { browser, expect } from '@wdio/globals';

import { byTestId } from '../helpers';
import { TestIDs } from '../testIDs';

describe('Onboarding', () => {
  it('should show onboarding window on first launch', async () => {
    const handles = await browser.getWindowHandles();
    expect(handles.length).toBeGreaterThanOrEqual(2);

    // The onboarding window is the second window opened
    const onboardingHandle = handles[1];
    await browser.switchToWindow(onboardingHandle);

    await expect(byTestId(TestIDs.onboardingWindow)).toExist();
    await expect(byTestId(TestIDs.getStartedButton)).toExist();
  });

  it('should close onboarding when "Get Started" is pressed', async () => {
    await byTestId(TestIDs.getStartedButton).click();

    const currentHandles = await browser.getWindowHandles();
    expect(currentHandles.length).toBe(1);

    // Switch back to the main popover window
    await browser.switchToWindow(currentHandles[0]);
  });
});
