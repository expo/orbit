import { Linking } from '../modules/Linking';
import MenuBarModule from '../modules/MenuBarModule';

export const openProjectsSelectorURL = () => {
  Linking.openURL('https://expo.dev/accounts/[account]/projects/[project]/builds');
  MenuBarModule.closePopover();
};
