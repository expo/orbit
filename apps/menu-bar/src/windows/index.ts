import DebugMenu from './DebugMenu';
import Onboarding from './Onboarding';
import Settings from './Settings';
import { WindowStyleMask, createWindowsNavigator } from '../modules/WindowManager';

export const WindowsNavigator = createWindowsNavigator({
  Settings: {
    component: Settings,
    options: {
      title: 'Settings',
      windowStyle: {
        // eslint-disable-next-line no-bitwise
        mask: WindowStyleMask.Titled | WindowStyleMask.Closable,
        titlebarAppearsTransparent: true,
        height: 352,
        width: 500,
      },
    },
  },
  Onboarding: {
    component: Onboarding,
    options: {
      title: '',
      windowStyle: {
        // eslint-disable-next-line no-bitwise
        mask: WindowStyleMask.Titled | WindowStyleMask.FullSizeContentView,
        titlebarAppearsTransparent: true,
        height: 618,
        width: 400,
      },
    },
  },
  DebugMenu: {
    component: DebugMenu,
    options: {
      title: 'Debug Menu',
      windowStyle: {
        height: 300,
        width: 400,
      },
    },
  },
});
