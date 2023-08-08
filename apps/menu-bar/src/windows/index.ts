import {
  WindowStyleMask,
  createWindowsNavigator,
} from '../modules/WindowManager';
import Onboarding from './Onboarding';
import Settings from './Settings';

export const WindowsNavigator = createWindowsNavigator({
  Settings: {
    component: Settings,
    options: {
      title: 'Settings',
      windowStyle: {
        mask: WindowStyleMask.Titled | WindowStyleMask.Closable,
        titlebarAppearsTransparent: true,
        height: 275,
        width: 400,
      },
    },
  },
  Onboarding: {
    component: Onboarding,
    options: {
      title: '',
      windowStyle: {
        mask: WindowStyleMask.Titled | WindowStyleMask.FullSizeContentView,
        titlebarAppearsTransparent: true,
        height: 618,
        width: 400,
      },
    },
  },
});
