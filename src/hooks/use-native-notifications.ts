
import { 
  isPermissionGranted, 
  requestPermission, 
  sendNotification 
} from '@tauri-apps/plugin-notification';

/**
 * useNativeNotifications provides a bridge between Zeneva's internal events
 * and the Native Mobile/Desktop notification system.
 */
export function useNativeNotifications() {
  const notify = async (title: string, body: string) => {
    try {
      const isTauri = !!(window as any).__TAURI_INTERNALS__;
      if (!isTauri) {
        console.log('Web Notification (Fallback):', title, body);
        return;
      }

      let permission = await isPermissionGranted();
      
      if (!permission) {
        const permissionResponse = await requestPermission();
        permission = permissionResponse === 'granted';
      }

      if (permission) {
        sendNotification({
          title,
          body,
          // You can add more options here like icons/attachments in future
        });
      }
    } catch (err) {
      console.error('Failed to send native notification:', err);
    }
  };

  return { notify };
}
