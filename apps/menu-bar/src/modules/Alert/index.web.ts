import { Alert as RNAlert, AlertButton } from 'react-native';
import { requireElectronModule } from 'react-native-electron-modules/build/requireElectronModule';

const ElectronAlert = requireElectronModule<{
  alert(title: string, message?: string, buttons?: AlertButton[]): void;
}>('Alert');

const Alert = {
  ...RNAlert,
  alert(title: string, message?: string, buttons?: AlertButton[]) {
    ElectronAlert.alert(title, message, buttons);
  },
};

export default Alert;
