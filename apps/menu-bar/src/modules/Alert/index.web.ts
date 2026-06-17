import { Alert as RNAlert, AlertButton } from 'react-native';
import { requireElectronModule } from 'react-native-electron-modules/build/requireElectronModule';

const ElectronAlert = requireElectronModule<{
  alert(
    title: string,
    message?: string,
    buttons?: Pick<AlertButton, 'text' | 'style'>[]
  ): Promise<number>;
}>('Alert');

const Alert = {
  ...RNAlert,
  async alert(title: string, message?: string, buttons?: AlertButton[]) {
    // The IPC bridge serializes args via structured clone, so onPress callbacks would
    // be dropped on the way to main. Strip them before sending, then dispatch the
    // matching one ourselves once main returns the clicked button's index.
    const serializable = buttons?.map(({ text, style }) => ({ text, style }));
    const index = await ElectronAlert.alert(title, message, serializable);
    buttons?.[index]?.onPress?.();
  },
};

export default Alert;
