import { useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../api/client';
import { useToast } from './ui/Toast';
import { StatusMessage } from './ui/StatusMessage';

interface GoogleButtonProps {
  onSuccess: () => void | Promise<void>;
}

interface GoogleIdApi {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string;
        callback: (response: { credential: string }) => void;
      }) => void;
      renderButton: (
        parent: HTMLElement,
        options: { theme?: string; size?: string; width?: number; text?: string }
      ) => void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdApi;
  }
}

const SCRIPT_URL = 'https://accounts.google.com/gsi/client';
let scriptPromise: Promise<void> | null = null;

function loadGsiScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_URL}"]`);
    const script = existing ?? document.createElement('script');
    script.addEventListener('load', () => resolve());
    script.addEventListener('error', () => reject(new Error('Failed to load Google script')));
    if (!existing) {
      script.src = SCRIPT_URL;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  });
  return scriptPromise;
}

/** "Sign in with Google" button (Google Identity Services). Hidden when the
 * backend has no GOOGLE_CLIENT_ID configured. */
export function GoogleButton({ onSuccess }: GoogleButtonProps) {
  const toast = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const successRef = useRef(onSuccess);
  successRef.current = onSuccess;

  const loginMutation = useMutation({
    mutationFn: (credential: string) => api.googleLogin(credential),
    onSuccess: async (status) => {
      await successRef.current();
      toast(`Welcome, ${status.player?.display_name ?? 'friend'}!`, 'success');
    },
    onError: (err: Error) => toast(err.message, 'error'),
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let clientId: string | null = null;
      try {
        clientId = await api.getGoogleClientId();
      } catch {
        clientId = null;
      }
      if (cancelled || !clientId || !containerRef.current) return;

      try {
        await loadGsiScript();
      } catch {
        return;
      }
      if (cancelled || !containerRef.current || !window.google) return;

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => loginMutation.mutate(response.credential),
      });
      window.google.accounts.id.renderButton(containerRef.current, {
        theme: 'filled_black',
        size: 'large',
        width: 320,
        text: 'signin_with',
      });
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-3">
      <div ref={containerRef} className="flex justify-center min-h-10" />
      {loginMutation.isError && <StatusMessage type="error" message={(loginMutation.error as Error).message} />}
    </div>
  );
}
