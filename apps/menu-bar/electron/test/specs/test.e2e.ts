import { browser, $, $$ } from '@wdio/globals';
import { expect } from 'expect-webdriverio';

function findByTestId(testId: string) {
  return $(`div[data-testid="${testId}"]`);
}

function findAllByTestId(testId: string) {
  return $$(`div[data-testid="${testId}"]`);
}

describe('Menu Bar Electron App', () => {
  it('should show Onboarding Window', async () => {
    const originalHandles = await browser.getWindowHandles();
    const onboardingHandle = originalHandles[1];
    // Switch to Onboarding screen
    await browser.switchToWindow(onboardingHandle);

    await expect(findByTestId('get-started-button')).toExist();
    await findByTestId('get-started-button').click();

    // Press the "Get Started" button should close the Onboarding screen
    const currentHandles = await browser.getWindowHandles();
    expect(currentHandles.includes(onboardingHandle)).toBe(false);
    expect(currentHandles.length).toBe(1);

    await browser.switchToWindow(currentHandles[0]);
  });

  it('should list devices', async () => {
    await expect(findByTestId('popover-core')).toExist();

    await expect(findByTestId('device-item')).toExist();
    await expect(findAllByTestId('device-item')).toBeElementsArrayOfSize(2);
  });
});
