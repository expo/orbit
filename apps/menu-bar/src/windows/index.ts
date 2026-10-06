import { Platform } from 'react-native';

import AppleIdAuth from './AppleIdAuth';
import DebugMenu from './DebugMenu';
import Onboarding from './Onboarding';
import PairAndroidDevice from './PairAndroidDevice';
import Settings from './Settings';
import { WindowStyleMask, createWindowsNavigator } from '../modules/WindowManager';

export const WindowsNavigator = createWindowsNavigator({
  Settings: {
    component: Settings,
    options: {
      title: 'Settings',
      windowStyle: {
        // Electron renders FullSizeContentView windows frameless, so only macOS
        // draws the sidebar under the traffic lights.
        mask: [
          WindowStyleMask.Titled,
          WindowStyleMask.Closable,
          ...(Platform.OS === 'macos' ? [WindowStyleMask.FullSizeContentView] : []),
        ],
        titlebarAppearsTransparent: true,
        titleVisibility: 'hidden',
        toolbar: true,
        height: 520,
        width: 680,
      },
    },
  },
  Onboarding: {
    component: Onboarding,
    options: {
      title: '',
      windowStyle: {
        mask: [WindowStyleMask.Titled, WindowStyleMask.FullSizeContentView],
        titlebarAppearsTransparent: true,
        height: 618,
        width: 400,
      },
    },
  },
  PairAndroidDevice: {
    component: PairAndroidDevice,
    options: {
      title: 'Pair Android Device',
      windowStyle: {
        mask: [WindowStyleMask.Titled, WindowStyleMask.Closable],
        titlebarAppearsTransparent: true,
        height: 440,
        width: 500,
      },
    },
  },
  DebugMenu: {
    component: DebugMenu,
    options: {
      title: 'Debug Menu',
      windowStyle: {
        height: 600,
        width: 800,
      },
    },
  },
  AppleIdAuth: {
    component: AppleIdAuth,
    options: {
      title: 'Sign in with Apple ID',
      windowStyle: {
        mask: [WindowStyleMask.Titled, WindowStyleMask.Closable],
        titlebarAppearsTransparent: true,
        titleVisibility: 'hidden',
        height: 380,
        width: 440,
      },
    },
  },
});
