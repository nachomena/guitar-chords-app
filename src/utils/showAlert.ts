import { Alert, type AlertButton } from 'react-native';

/**
 * Cross-platform Alert.alert. On native this is Alert.alert itself; react-native-web's
 * Alert.alert is a no-op, so showAlert.web.ts falls back to the browser's dialogs.
 */
export function showAlert(title: string, message?: string, buttons?: AlertButton[]): void {
  Alert.alert(title, message, buttons);
}
