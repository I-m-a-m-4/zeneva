

/**
 * useNativeNotifications provides a bridge between Zeneva's internal events
 * and the Native Mobile/Desktop notification system.
 */
export function useNativeNotifications() {
  const notify = async (title: string, body: string, link?: string) => {
    try {
      const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;
      if (!isTauri) {
        if (!("Notification" in window)) {
          console.warn("This browser does not support desktop notification");
          return;
        }

        const targetUrl = link || (title.toLowerCase().includes('ceo') || title.toLowerCase().includes('chat') ? '/support' : '/dashboard');
        const isExternal = targetUrl.startsWith('http://') || targetUrl.startsWith('https://');

        const createNotif = () => {
          const n = new Notification(title, { body, icon: '/icon-192x192.png' });
          n.onclick = () => {
            window.focus();
            if (targetUrl) {
              if (isExternal) {
                // Open store links in the system browser, not inside the app
                window.open(targetUrl, '_blank', 'noopener,noreferrer');
              } else {
                window.location.href = targetUrl;
              }
            }
          };
        };

        if (Notification.permission === "granted") {
          createNotif();
        } else if (Notification.permission !== "denied") {
          const permission = await Notification.requestPermission();
          if (permission === "granted") {
            createNotif();
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
        });
      }
    } catch (err) {
      console.error('Failed to send native notification:', err);
    }
  };

  return { notify };
}
