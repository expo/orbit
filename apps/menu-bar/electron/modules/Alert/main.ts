import { dialog } from 'electron';
import type { AlertButton } from 'react-native';

const AlertModule: {
  name: string;
  alert: (title: string, message?: string, buttons?: AlertButton[]) => Promise<number>;
} = {
  name: 'Alert',
  async alert(title: string, message?: string, buttons?: AlertButton[]) {
    const labels = buttons?.map((button) => button.text ?? '') ?? ['OK'];
    // Map any 'cancel'-styled button so the dialog's default-cancel behavior
    // (Esc / window close) reports the right index back to the renderer.
    const cancelId = buttons?.findIndex((button) => button.style === 'cancel');
    const { response } = await dialog.showMessageBox({
      type: 'info',
      message: title,
      detail: message ?? '',
      buttons: labels,
      cancelId: cancelId !== undefined && cancelId >= 0 ? cancelId : undefined,
    });
    return response;
  },
};

export default AlertModule;
