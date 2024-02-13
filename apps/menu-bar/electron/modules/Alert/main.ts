import { dialog } from 'electron';
import type { AlertButton } from 'react-native';

const AlertModule: {
  name: string;
  alert: (title: string, message?: string, buttons?: AlertButton[]) => void;
} = {
  name: 'Alert',
  alert(title: string, message?: string, buttons?: AlertButton[]) {
    dialog.showMessageBox({
      type: 'info',
      message: title,
      detail: message ?? '',
      buttons: buttons?.map((button) => button.text ?? '') ?? ['OK'],
    });
  },
};

export default AlertModule;
