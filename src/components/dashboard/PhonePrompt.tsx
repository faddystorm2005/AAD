'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';

/**
 * Persistent banner that nags signed-in users to add a phone number.
 * We use phone for booking confirmations and day-of communication, so
 * accounts without one are effectively unreachable.
 *
 * Behavior:
 *  - Banner only renders if profiles.phone is null/empty.
 *  - Inline form so they can save it in one tap, no page change.
 *  - Once saved, the banner unmounts immediately.
 *  - Reappears on every visit until phone is filled in - "bugging" by design.
 */
export default function PhonePrompt() {
  const { user } = useAuth();
  const [needsPhone, setNeedsPhone] = useState<boolean | null>(null);
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);

  // Look up the current phone on mount. Only show the banner if missing.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', user.id)
        .maybeSingle();
      if (cancelled) return;
      const stored = (data?.phone ?? '').trim();
      setNeedsPhone(stored.length === 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const cleaned = phone.trim();
    if (cleaned.length < 7) {
      setError('Please enter a valid phone number.');
      return;
    }
    setSaving(true);
    setError('');
    const { error: upsertError } = await supabase
      .from('profiles')
      .update({ phone: cleaned })
      .eq('id', user.id);
    setSaving(false);
    if (upsertError) {
      setError(upsertError.message);
      return;
    }
    setNeedsPhone(false);
  };

  if (!needsPhone) return null;

  return (
    <div
      role="region"
      aria-label="Add phone number"
      className="reveal-on-scroll animate-fade-up rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-950/60 via-amber-900/40 to-amber-950/60 p-5 shadow-lg shadow-amber-900/20 backdrop-blur"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-lg">
            📱
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-100">
              Add your phone number
            </p>
            <p className="mt-1 text-xs text-amber-200/80">
              We text booking confirmations and day-of updates here. Your
              account is unreachable without one.
            </p>
          </div>
        </div>
        {!expanded && (
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="btn-primary press rounded-lg px-4 py-2 text-xs font-semibold"
            >
              + Add Phone
            </button>
            <Link
              href="/settings"
              className="press rounded-lg border border-white/20 bg-black/30 px-4 py-2 text-xs font-medium text-white hover:bg-black/50"
            >
              Settings
            </Link>
          </div>
        )}
      </div>

      {expanded && (
        <form onSubmit={handleSave} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="(512) 555-0123"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            className="flex-1 rounded-lg border border-amber-500/30 bg-black/40 px-3 py-2 text-sm text-white placeholder-amber-200/40 focus:border-amber-400 focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary press shrink-0 rounded-lg px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Phone'}
            </button>
            <button
              type="button"
              onClick={() => {
                setExpanded(false);
                setError('');
              }}
              className="press shrink-0 rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm text-white hover:bg-black/50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {error && (
        <p className="mt-3 text-xs text-red-300" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
