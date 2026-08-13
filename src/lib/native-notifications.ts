import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification';

export function isTauriEnv(): boolean {
  return (
    typeof window !== 'undefined' &&
    (!!(window as any).__TAURI_INTERNALS__ || !!(window as any).__TAURI__)
  );
}

/**
 * Request native notification permissions for Tauri (Android/iOS/Desktop) and Browser.
 */
export async function initNativeNotificationPermissions(): Promise<boolean> {
  try {
    if (isTauriEnv()) {
      let granted = await isPermissionGranted();
      if (!granted) {
        const permission = await requestPermission();
        granted = permission === 'granted';
      }
      return granted;
    } else if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        const res = await Notification.requestPermission();
        return res === 'granted';
      }
      return Notification.permission === 'granted';
    }
  } catch (err) {
    console.warn('Native notification permission error:', err);
  }
  return false;
}

/**
 * Trigger a native system status bar / tray notification on Mobile or Desktop.
 */
export async function triggerNativeNotification(options: {
  title: string;
  body: string;
  icon?: string;
}) {
  try {
    const { title, body } = options;

    if (isTauriEnv()) {
      let granted = await isPermissionGranted();
      if (!granted) {
        const permission = await requestPermission();
        granted = permission === 'granted';
      }
      if (granted) {
        sendNotification({
          title,
          body,
        });
        return;
      }
    }

    // Browser PWA fallback
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: options.icon || '/zeneva.png',
      });
    }
  } catch (err) {
    console.warn('Failed to trigger native notification:', err);
  }
}
