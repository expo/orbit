import {AppRegistry, NativeModules} from 'react-native';

type WindowsConfig = {
  [key: string]: {
    component: React.ComponentType<any>;
  };
};

export function createWindowsNavigator<T extends WindowsConfig>(config: T) {
  Object.entries(config).forEach(([key, value]) => {
    AppRegistry.registerComponent(key, () => value.component);
  });

  return {
    open: (window: keyof T) => {
      NativeModules.WindowsManager.createWindow(window);
    },
  };
}
