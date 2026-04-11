import { browser, $, $$ } from '@wdio/globals';
import { expect } from 'expect-webdriverio';

/**
 * Mirror of e2e/testIDs.ts — kept in sync manually to avoid bundler issues
 * with WebdriverIO's test runner.
 */
const TestIDs = {
  popoverCore: 'popover-core',
  popoverFooter: 'popover-footer',
  settingsButton: 'settings-button',
  quitButton: 'quit-button',
  buildsSection: 'builds-section',
  selectBuildEAS: 'select-build-eas',
  selectBuildLocal: 'select-build-local',
  deviceItem: 'device-item',
  onboardingWindow: 'onboarding-window',
  getStartedButton: 'get-started-button',
  settingsWindow: 'settings-window',
} as const;

function byTestId(testId: string) {
  return $(`[data-testid="${testId}"]`);
}

function allByTestId(testId: string) {
  return $$(`[data-testid="${testId}"]`);
}

describe('Onboarding', () => {
  it('should show onboarding window on first launch', async () => {
    const handles = await browser.getWindowHandles();
    // The app opens two windows: the main popover and the onboarding window
    expect(handles.length).toBeGreaterThanOrEqual(2);

    const onboardingHandle = handles[1];
    await browser.switchToWindow(onboardingHandle);

    await expect(byTestId(TestIDs.onboardingWindow)).toExist();
    await expect(byTestId(TestIDs.getStartedButton)).toExist();
  });

  it('should close onboarding when "Get Started" is pressed', async () => {
    await byTestId(TestIDs.getStartedButton).click();

    const currentHandles = await browser.getWindowHandles();
    expect(currentHandles.length).toBe(1);

    await browser.switchToWindow(currentHandles[0]);
  });
});

describe('Popover', () => {
  it('should render the main popover content', async () => {
    await expect(byTestId(TestIDs.popoverCore)).toExist();
  });

  it('should show the builds section', async () => {
    await expect(byTestId(TestIDs.buildsSection)).toExist();
    await expect(byTestId(TestIDs.selectBuildEAS)).toExist();
    await expect(byTestId(TestIDs.selectBuildLocal)).toExist();
  });

  it('should show the footer with settings and quit buttons', async () => {
    await expect(byTestId(TestIDs.popoverFooter)).toExist();
    await expect(byTestId(TestIDs.settingsButton)).toExist();
    await expect(byTestId(TestIDs.quitButton)).toExist();
  });
});
