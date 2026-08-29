import CloudSimulator from './CloudSimulator';
import DebugMenu from './DebugMenu';
import LaunchCloudSimulator from './LaunchCloudSimulator';
import Onboarding from './Onboarding';
import PairAndroidDevice from './PairAndroidDevice';
import Settings from './Settings';
import { WindowStyleMask, createWindowsNavigator } from '../modules/WindowManager';
import { getCloudSimulatorWindowOptions } from '../utils/cloudSimulatorWindow';

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
    // Callers pass getCloudSimulatorWindowOptions() so the frameless preference is
    // read when the window opens, not when this module is first imported.
    options: getCloudSimulatorWindowOptions(false),
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
