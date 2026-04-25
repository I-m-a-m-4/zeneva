
/**
 * useNativeNotifications provides a bridge between Zeneva's internal events
 * and the Native Mobile/Desktop notification system.
 */
export function useNativeNotifications() {
  const notify = async (title: string, body: string) => {
    try {
      const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;
      if (!isTauri) {
        if (!("Notification" in window)) {
          console.warn("This browser does not support desktop notification");
          return;
        }

        if (Notification.permission === "granted") {
          new Notification(title, { body, icon: '/icon-192x192.png' });
        } else if (Notification.permission !== "denied") {
          const permission = await Notification.requestPermission();
          if (permission === "granted") {
            new Notification(title, { body, icon: '/icon-192x192.png' });
          }
        }
        return;
      }

      const { isPermissionGranted, requestPermission, sendNotification } = await import('@tauri-apps/plugin-notification');
      
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
