import { Alert as RNAlert, AlertOptions, AlertButton } from 'react-native';

type MacOSAlertOptions = AlertOptions & {
  modal?: boolean;
  critical?: boolean;
};

/**
 * A wrapper around RNAlert to override the
 * default alert and set modal true, that way
 * users can dismiss it even without an active window
 **/
const Alert = {
  ...RNAlert,
  alert(
    title: string,
    message?: string,
    buttons?: AlertButton[],
    options: MacOSAlertOptions = {}
  ): void {
    RNAlert.alert(title, message, buttons, { modal: true, ...options });
  },
};

export default Alert;
