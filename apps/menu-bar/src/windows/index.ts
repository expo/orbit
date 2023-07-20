import {
  WindowStyleMask,
  createWindowsNavigator,
} from '../modules/WindowManager';
import Onboarding from './Onboarding';
import Settings from './Settings';

export const WindowsNavigator = createWindowsNavigator({
  Settings: {
    component: Settings,
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
