import { expect } from '@wdio/globals';

import { byTestId } from '../helpers';
import { TestIDs } from '../testIDs';

describe('Popover', () => {
  it('should render the main popover content', async () => {
    await expect(byTestId(TestIDs.popoverCore)).toExist();
  });

  it('should show the builds section with EAS and local file options', async () => {
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
