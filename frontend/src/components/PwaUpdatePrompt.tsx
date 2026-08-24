import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, WifiOff, X } from 'lucide-react';

export function PwaUpdatePrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ', r);
    },
    onRegisterError(error) {
      console.error('SW Registration Error: ', error);
    },
  });

  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-close offlineReady toast after 4 seconds
  useEffect(() => {
    if (offlineReady) {
      const timer = setTimeout(() => {
        setOfflineReady(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [offlineReady, setOfflineReady]);

  const handleClose = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  return (
    <>
      {/* Offline Status Persistent Banner */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-600 text-white text-xs font-semibold py-1 px-4 flex items-center justify-center gap-1.5 shadow-md animate-fade-in">
          <WifiOff size={14} className="animate-pulse" />
          <span>You are currently offline. Using cached rating data.</span>
        </div>
      )}

      {/* PWA Toast Notifications Container */}
      <div className="fixed bottom-20 left-4 right-4 z-40 max-w-sm mx-auto flex flex-col gap-2 pointer-events-none">
        {/* Offline Ready Toast */}
        {offlineReady && (
          <div className="pointer-events-auto bg-slate-900/95 text-white p-4 rounded-xl shadow-2xl flex items-center justify-between gap-3 border border-slate-700/50 backdrop-blur-md animate-slide-up">
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-100">Ready to work offline!</p>
              <p className="text-xs text-slate-400 mt-0.5">
                The ratings app is cached and available on the go.
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-1 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800"
              aria-label="Dismiss"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Update Available Prompt */}
        {needRefresh && (
          <div className="pointer-events-auto bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-white p-4 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800/80 backdrop-blur-md animate-slide-up flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Update Available
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  A new version of the ELO rating system is ready. Refresh now to apply.
                </p>
              </div>
              <button
                onClick={handleClose}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-lg"
                aria-label="Dismiss"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => updateServiceWorker(true)}
                className="flex-1 py-2 px-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-violet-500/10 active:scale-[0.98]"
              >
                <RefreshCw size={14} />
                <span>Reload and Update</span>
              </button>
              <button
                onClick={handleClose}
                className="py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors"
              >
                Not Now
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
