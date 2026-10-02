import type { AlertButton } from 'react-native';

/**
 * Browser fallback for showAlert.ts using window.alert/window.confirm. Those only
 * offer OK/Cancel, so an alert with several actions asks about each action in turn
 * and runs the first one confirmed; dismissing them all runs the cancel button.
 */
export function showAlert(title: string, message?: string, buttons?: AlertButton[]): void {
  const alertText = message ? `${title}\n\n${message}` : title;
  const actionButtons = (buttons ?? []).filter((button) => button.style !== 'cancel');
  const cancelButton = buttons?.find((button) => button.style === 'cancel');

  if (actionButtons.length === 0) {
    window.alert(alertText);
    cancelButton?.onPress?.();
    return;
  }

  if (actionButtons.length === 1) {
    if (window.confirm(alertText)) actionButtons[0].onPress?.();
    else cancelButton?.onPress?.();
    return;
  }

  for (const actionButton of actionButtons) {
    if (window.confirm(`${alertText}\n\nOK → ${actionButton.text}`)) {
      actionButton.onPress?.();
      return;
    }
  }
  cancelButton?.onPress?.();
}
