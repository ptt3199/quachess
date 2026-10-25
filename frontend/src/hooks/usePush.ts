import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export type PushSetupState =
  | 'loading'
  | 'unsupported' // browser has no push capability
  | 'unavailable' // server has no VAPID keys configured, or no SW
  | 'permission-needed'
  | 'denied'
  | 'subscribed'
  | 'unsubscribed';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

function isSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function usePush() {
  const { isPlayerAuthed } = useAuth();
  const [state, setState] = useState<PushSetupState>('loading');
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  useEffect(() => {
    if (!isPlayerAuthed || !isSupported()) {
      setState(isSupported() ? 'loading' : 'unsupported');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const swRegistration = await navigator.serviceWorker.getRegistration();
        if (!swRegistration || !swRegistration.pushManager) {
          if (!cancelled) setState('unavailable');
          return;
        }
        setRegistration(swRegistration);
        const [serverEnabled, existing] = await Promise.all([
          api.getPushStatus().then((s) => s.enabled).catch(() => false),
          swRegistration.pushManager.getSubscription(),
        ]);
        if (cancelled) return;
        setSubscription(existing ?? null);
        if (!serverEnabled) {
          setState('unavailable');
        } else if (existing) {
          setState('subscribed');
        } else if (Notification.permission === 'granted') {
          setState('unsubscribed');
        } else if (Notification.permission === 'denied') {
          setState('denied');
        } else {
          setState('permission-needed');
        }
      } catch {
        if (!cancelled) setState('unavailable');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isPlayerAuthed]);

  const enable = useCallback(async () => {
    if (!registration) return;
    try {
      const key = await api.getVapidPublicKey();
      if (!key) {
        setState('unavailable');
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'denied' : 'permission-needed');
        return;
      }
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key) as BufferSource,
      });
      const json = sub.toJSON();
      const endpoint = json.endpoint;
      const p256dh = json.keys?.p256dh;
      const auth = json.keys?.auth;
      if (!endpoint || !p256dh || !auth) throw new Error('Malformed push subscription');
      await api.subscribePush({ endpoint, keys: { p256dh, auth } });
      setSubscription(sub);
      setState('subscribed');
    } catch (err) {
      console.error('Push subscription failed', err);
      setState('unsubscribed');
    }
  }, [registration]);

  const disable = useCallback(async () => {
    if (!subscription) return;
    try {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      await api.unsubscribePush(endpoint).catch(() => {});
    } catch {
      // best effort
    }
    setSubscription(null);
    setState('unsubscribed');
  }, [subscription]);

  return { state, enable, disable, supported: isSupported() };
}
