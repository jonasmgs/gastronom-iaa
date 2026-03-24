import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const VAPID_PUBLIC_KEY = 'BIsGrgamd1ZhYgVBmzCJa4cvxyHBZFns5ffUsUwXTDC+clYyB1bxuOf6+IXg3PYMp3W4UPjptSBHWEgkOubet8U=';

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [pushSupported, setPushSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  useEffect(() => {
    if ('Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window) {
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

  const subscribeToPush = async (userId: string) => {
    if (permission !== 'granted') {
      const granted = await requestPermission();
      if (!granted) return null;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      setSubscription(sub);

      await supabase.functions.invoke('push-notification', {
        body: {
          method: 'subscribe',
          subscription: sub,
          userId,
        },
      });

      return sub;
    } catch (error) {
      console.error('Error subscribing to push:', error);
      return null;
    }
  };

  const unsubscribeFromPush = async (userId: string) => {
    if (!subscription) return false;

    try {
      await subscription.unsubscribe();
      setSubscription(null);

      await supabase.functions.invoke('push-notification', {
        body: {
          method: 'unsubscribe',
          userId,
        },
      });

      return true;
    } catch (error) {
      console.error('Error unsubscribing from push:', error);
      return false;
    }
  };

  return {
    permission,
    pushSupported,
    subscription,
    requestPermission,
    subscribeToPush,
    unsubscribeFromPush,
  };
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
