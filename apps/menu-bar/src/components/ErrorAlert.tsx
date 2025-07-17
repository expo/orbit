/**
 * Convenience wrapper for error alerts
 * to ensure that they don't overflow the screen
 */
import { Alert, AlertButton } from 'react-native';

export function abbreviatedAlertMessage(message: string) {
  const longMessageTrailer = '...\n\n + See console log for the remainder of the message';
  return message.length < 300
    ? message
    : message.substring(0, 300 - longMessageTrailer.length) + longMessageTrailer;
}

export function errorAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[],
  options?: any
) {
  Alert.alert(title, message && abbreviatedAlertMessage(message), buttons, options);
}
