import { Config } from 'common-types';

import { Linking } from '../modules/Linking';
import MenuBarModule from '../modules/MenuBarModule';

export const openProjectsSelectorURL = () => {
  Linking.openURL(`${Config.website.origin}/accounts/[account]/projects/[project]/builds`);
  MenuBarModule.closePopover();
};
