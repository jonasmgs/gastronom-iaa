import { useEffect, useState } from 'react';

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [pushSupported, setPushSupported] = useState(false);

  useEffect(() => {
    if ('Notification' in window && 'serviceWorker' in navigator) {
      setPushSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!pushSupported) return false;

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  };

  const subscribeToPush = async () => {
    if (permission !== 'granted') return null;

    try {
      const registration = await navigator.serviceWorker.ready;
      
      if ('pushManager' in registration) {
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: null,
        });
        return subscription;
      }
    } catch (error) {
      console.error('Error subscribing to push:', error);
    }
    return null;
  };

  return {
    permission,
    pushSupported,
    requestPermission,
    subscribeToPush,
  };
}
