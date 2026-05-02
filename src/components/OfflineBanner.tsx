'use client';

import { useEffect, useState } from 'react';

export default function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      aria-live="assertive"
      className="fixed inset-x-0 top-0 z-[300] flex items-center justify-center gap-2 bg-yellow-500 px-4 py-2 text-sm font-semibold text-black"
      style={{ top: 'env(safe-area-inset-top, 0px)' }}
    >
      <span aria-hidden>⚠️</span>
      No internet connection — some features may be unavailable.
    </div>
  );
}
