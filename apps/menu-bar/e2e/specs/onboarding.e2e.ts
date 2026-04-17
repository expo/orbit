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
      await expect(byTestId(TestIDs.onboardingWindow)).toExist();
    }

    // On macOS, plain Views aren't accessibility elements — only interactive
    // elements (Pressable, Button) appear in the tree. Use the Get Started
    // button as the indicator that the onboarding screen is showing.
    await expect(byTestId(TestIDs.getStartedButton)).toExist();
  });

  it('should close onboarding when "Get Started" is pressed', async () => {
    await byTestId(TestIDs.getStartedButton).click();

    if (isElectron()) {
      const currentHandles = await browser.getWindowHandles();
      expect(currentHandles.length).toBe(1);
      await browser.switchToWindow(currentHandles[0]);
    } else {
      // Verify onboarding dismissed by checking button is gone.
      await expect(byTestId(TestIDs.getStartedButton)).not.toExist();
    }
  });
});
