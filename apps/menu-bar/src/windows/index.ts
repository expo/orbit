import CloudSimulator from './CloudSimulator';
import DebugMenu from './DebugMenu';
import LaunchCloudSimulator from './LaunchCloudSimulator';
import Onboarding from './Onboarding';
import PairAndroidDevice from './PairAndroidDevice';
import Settings from './Settings';
import { getUserPreferences } from '../modules/Storage';
import { WindowStyleMask, createWindowsNavigator } from '../modules/WindowManager';

// Design B is opt-in: a borderless, transparent window whose shape comes from the
// device bezel that the preview page draws. Design A keeps a normal titled window.
const framelessCloudSimulator = getUserPreferences().framelessCloudSimulator;

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
  LaunchCloudSimulator: {
    component: LaunchCloudSimulator,
    options: {
      title: 'Launch Cloud Simulator',
      windowStyle: {
        mask: [WindowStyleMask.Titled, WindowStyleMask.Closable],
        titlebarAppearsTransparent: true,
        height: 520,
        width: 500,
      },
    },
  },
  CloudSimulator: {
    component: CloudSimulator,
    options: {
      title: 'Cloud Simulator',
      windowStyle: {
        // Narrow enough that serve-sim keeps its devices sidebar collapsed, and
        // tall enough for a phone bezel.
        mask: framelessCloudSimulator
          ? [WindowStyleMask.Borderless, WindowStyleMask.Resizable]
          : [WindowStyleMask.Titled, WindowStyleMask.Closable, WindowStyleMask.Resizable],
        titlebarAppearsTransparent: true,
        height: 860,
        width: 420,
        transparent: framelessCloudSimulator,
        hasShadow: true,
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
});
