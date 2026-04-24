import { expect } from '@wdio/globals';

import { byTestId } from '../helpers';
import { TestIDs } from '../testIDs';

describe('Popover', () => {
  // On macOS, plain Views (popover-core, builds-section, popover-footer) aren't
  // accessibility elements — only interactive elements appear in the tree.
  // Test using the interactive children instead.

  it('should show the builds section with EAS and local file options', async () => {
    await expect(byTestId(TestIDs.selectBuildEAS)).toExist();
    await expect(byTestId(TestIDs.selectBuildLocal)).toExist();
  });

  it('should show the footer with settings and quit buttons', async () => {
    await expect(byTestId(TestIDs.settingsButton)).toExist();
    await expect(byTestId(TestIDs.quitButton)).toExist();
  });
});
