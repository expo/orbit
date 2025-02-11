import { Platform } from 'react-native';

import { RudderClient } from '../../modules/rudder';

const WRITE_KEY =
  Platform.OS === 'macos' ? '2by14lpeuvkyu0SmuBwpnAYkeIS' : '2c8NqBkxQzReHTIzDueSCQ0zD8u';
const DATA_PLANE_URL = 'https://cdp.expo.dev';

const analyticsEnabled = !__DEV__;

if (analyticsEnabled) {
  RudderClient.load(WRITE_KEY, DATA_PLANE_URL);
}

export const Analytics: { track: typeof RudderClient.track } = {
  track: async (...args) => {
    if (analyticsEnabled) {
      await RudderClient.track(...args);
    }
  },
};

export enum Event {
  APP_OPENED = 'APP_OPENED',
  LAUNCH_BUILD_FROM_LOCAL_FILE = 'LAUNCH_BUILD_FROM_LOCAL_FILE',
  LAUNCH_SNACK = 'LAUNCH_SNACK',
  LAUNCH_EXPO_GO = 'LAUNCH_EXPO_GO',
  LAUNCH_BUILD = 'LAUNCH_BUILD',
  LAUNCH_EXPO_UPDATE = 'LAUNCH_EXPO_UPDATE',
}
