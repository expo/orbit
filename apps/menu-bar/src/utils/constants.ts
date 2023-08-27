import { Linking } from 'react-native';

export const openProjectsSelectorURL = () =>
  Linking.openURL('https://expo.dev/accounts/[account]/projects/[project]/builds');
