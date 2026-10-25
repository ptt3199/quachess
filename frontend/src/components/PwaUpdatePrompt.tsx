import { useRegisterSW } from 'virtual:pwa-register/react';
import { Download } from 'lucide-react';

export function PwaUpdatePrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(url) {
      // Periodically check for updates so the prompt appears on next visit
      const intervalMs = 60 * 60 * 1000;
      const check = async () => {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          await registration?.update();
        } catch {
          // ignore
        }
      };
      window.setInterval(check, intervalMs);
      void url;
    },
  });

  if (!offlineReady && !needRefresh) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-24 inset-x-0 z-50 flex justify-center px-4 pointer-events-none"
    >
      <div className="pointer-events-auto flex items-center gap-3 bg-night-700 border border-line-strong rounded-2xl px-4 py-3 shadow-lg animate-fade-in max-w-md w-full">
        <Download className="w-4 h-4 text-brass-400 shrink-0" aria-hidden="true" />
        <p className="flex-1 text-xs text-slate-300 font-medium">
          {needRefresh ? 'A new version is available.' : 'App ready to work offline.'}
        </p>
        {needRefresh ? (
          <button
            type="button"
            onClick={() => updateServiceWorker(true)}
            className="h-8 px-3 rounded-lg bg-brass-500 text-night-900 text-xs font-bold hover:bg-brass-400 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-300"
          >
            Reload
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            setOfflineReady(false);
            setNeedRefresh(false);
          }}
          className="h-8 px-2 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-300 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        >
          Close
        </button>
      </div>
    </div>
  );
}
