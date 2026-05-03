'use client';

import { useEffect, useState } from 'react';
import { useDialog } from '@/contexts/DialogContext';

interface Props {
  /** The admin's Supabase user_id - used to build the ICS subscription URL. */
  adminUserId: string;
  /** The admin's Supabase access token - used to call the status/disconnect endpoints. */
  accessToken: string | null;
}

type ConnectionState = 'loading' | 'connected' | 'not_connected';

export default function GoogleCalendarSubscribe({ adminUserId, accessToken }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [state, setState] = useState<ConnectionState>('loading');
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const showDialog = useDialog();

  // Build the ICS subscription URL - works on localhost AND production.
  const icsUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/admin/calendar?u=${adminUserId}`
      : `/api/admin/calendar?u=${adminUserId}`;

  // Surface query-param outcomes from the OAuth callback redirect.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const g = params.get('google');
    if (g === 'connected') {
      setFlash({ type: 'success', text: 'Google Calendar connected!' });
      setOpen(true);
    } else if (g === 'error') {
      const reason = params.get('reason') || 'unknown';
      setFlash({ type: 'error', text: `Connection failed: ${reason}` });
      setOpen(true);
    }
    if (g) {
      // Clean the URL so refreshing doesn't re-fire the message.
      const url = new URL(window.location.href);
      url.searchParams.delete('google');
      url.searchParams.delete('reason');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  // Auto-clear flash messages.
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 4000);
    return () => clearTimeout(t);
  }, [flash]);

  // Load connection status.
  useEffect(() => {
    if (!accessToken) {
      setState('not_connected');
      return;
    }
    let cancelled = false;
    fetch('/api/admin/google/status', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setState(data.connected ? 'connected' : 'not_connected');
      })
      .catch(() => {
        if (!cancelled) setState('not_connected');
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const handleConnect = () => {
    window.location.href = '/api/admin/google/connect';
  };

  const handleDisconnect = async () => {
    if (!accessToken) return;
    const ok = await showDialog({
      title: 'Disconnect Google Calendar?',
      body: 'Future booking changes will no longer sync.',
      confirmLabel: 'Disconnect',
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch('/api/admin/google/disconnect', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('Disconnect failed');
      setState('not_connected');
      setFlash({ type: 'success', text: 'Disconnected.' });
    } catch (err: any) {
      setFlash({ type: 'error', text: err?.message || 'Disconnect failed' });
    } finally {
      setBusy(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(icsUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const statusBadge =
    state === 'loading'
      ? { text: 'Checking…', cls: 'bg-gray-800 text-gray-400 border-gray-700' }
      : state === 'connected'
      ? { text: '✓ Connected', cls: 'bg-green-900/40 text-green-300 border-green-800' }
      : { text: 'Not connected', cls: 'bg-gray-800 text-gray-400 border-gray-700' };

  return (
    <div className="rounded-xl border border-white/10 bg-gray-900/50 p-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">
              📅 Google Calendar
            </h2>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusBadge.cls}`}>
              {statusBadge.text}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-gray-400">
            {state === 'connected'
              ? 'Bookings push to your Google Calendar in seconds.'
              : 'Connect to push bookings instantly, or use the read-only ICS feed.'}
          </p>
        </div>
        <span className="text-gray-400">{open ? '▲' : '▼'}</span>
      </button>

      {flash && (
        <div
          role="status"
          className={`mt-3 rounded-lg border p-2 text-xs ${
            flash.type === 'success'
              ? 'border-green-700 bg-green-900/30 text-green-200'
              : 'border-red-700 bg-red-900/30 text-red-200'
          }`}
        >
          {flash.text}
        </div>
      )}

      {open && (
        <div className="mt-4 space-y-5 border-t border-white/10 pt-4">
          {/* OAuth - instant push */}
          <div className="space-y-3">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
                Instant push (recommended)
              </h3>
              <p className="mt-1 text-xs text-gray-400">
                Approve a booking → it appears in your Google Calendar within seconds.
                Decline → it disappears.
              </p>
            </div>
            {state === 'connected' ? (
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={busy}
                className="press rounded-lg border border-red-600 px-4 py-2 text-xs font-semibold text-red-300 hover:bg-red-900/20 disabled:opacity-50"
              >
                {busy ? 'Disconnecting…' : 'Disconnect Google Calendar'}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConnect}
                className="press rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Connect Google Calendar
              </button>
            )}
          </div>

          <div className="border-t border-white/10 pt-4 space-y-3">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
                Or - subscribe via URL (no sign-in, ~12h delay)
              </h3>
              <p className="mt-1 text-xs text-gray-400">
                Read-only ICS feed Google polls on its own schedule.
              </p>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={icsUrl}
                readOnly
                onClick={(e) => (e.target as HTMLInputElement).select()}
                className="flex-1 rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-xs text-gray-300 font-mono"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="press shrink-0 rounded-lg bg-gray-700 px-3 py-2 text-xs font-medium text-white hover:bg-gray-600"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="text-xs text-yellow-300">
              ⚠️ Keep this URL private - anyone with it can see your bookings.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
