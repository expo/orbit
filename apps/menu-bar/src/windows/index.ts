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
        mask: [WindowStyleMask.Titled, WindowStyleMask.Closable],
        titlebarAppearsTransparent: true,
        height: 720,
        width: 500,
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
        height: 420,
        width: 440,
      },
    },
  },
});
