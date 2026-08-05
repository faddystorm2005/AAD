'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';

/**
 * Persistent banner that nags signed-in users to add a phone number
 * and full name. Both are required for booking confirmations and
 * day-of communication.
 *
 * Behavior:
 *  - Banner only renders if profiles.phone or profiles.full_name is missing.
 *  - Inline form so they can save in one tap, no page change.
 *  - Once both are saved, the banner unmounts immediately.
 *  - Reappears on every visit until both fields are filled in.
 */
interface PhonePromptProps {
  forceExpanded?: boolean;
  onComplete?: () => void;
}

export default function PhonePrompt({ forceExpanded, onComplete }: PhonePromptProps) {
  const { user } = useAuth();
  const [needsInfo, setNeedsInfo] = useState<boolean | null>(null);
  const [needsPhone, setNeedsPhone] = useState(false);
  const [needsName, setNeedsName] = useState(false);
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('phone, full_name')
        .eq('id', user.id)
        .maybeSingle();
      if (cancelled) return;
      const storedPhone = (data?.phone ?? '').trim();
      const storedName = (data?.full_name ?? '').trim();
      const missingPhone = storedPhone.length === 0;
      const missingName = storedName.length === 0;
      setNeedsPhone(missingPhone);
      setNeedsName(missingName);
      setNeedsInfo(missingPhone || missingName);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const cleanedPhone = phone.trim();
    const cleanedName = fullName.trim();

    if (needsPhone && cleanedPhone.length < 7) {
      setError('Please enter a valid phone number.');
      return;
    }
    if (needsName && cleanedName.length < 2) {
      setError('Please enter your full name.');
      return;
    }

    setSaving(true);
    setError('');

    const updates: Record<string, string> = {};
    if (needsPhone) updates.phone = cleanedPhone;
    if (needsName) updates.full_name = cleanedName;

    const { error: upsertError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    setSaving(false);
    if (upsertError) {
      setError(upsertError.message);
      return;
    }
    setNeedsInfo(false);
    onComplete?.();
  };

  // Auto-expand when the parent wants to force the form open (e.g. booking gated on profile).
  useEffect(() => {
    if (forceExpanded && needsInfo) setExpanded(true);
  }, [forceExpanded, needsInfo]);

  if (!needsInfo) return null;

  const bothMissing = needsPhone && needsName;
  const bannerTitle = bothMissing
    ? 'Add your name and phone number'
    : needsName
    ? 'Add your full name'
    : 'Add your phone number';
  const bannerDesc = bothMissing
    ? 'We need your name and phone for booking confirmations and day-of updates.'
    : needsName
    ? 'We use your name to personalize your booking experience.'
    : 'We text booking confirmations and day-of updates here. Your account is unreachable without one.';

  return (
    <div
      role="region"
      aria-label={bannerTitle}
      className="reveal-on-scroll animate-fade-up rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-950/60 via-amber-900/40 to-amber-950/60 p-5 shadow-lg shadow-amber-900/20 backdrop-blur"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-lg">
            📱
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-100">
              {bannerTitle}
            </p>
            <p className="mt-1 text-xs text-amber-200/80">
              {bannerDesc}
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
              + Add Info
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
        <form onSubmit={handleSave} className="mt-4 flex flex-col gap-3">
          {needsName && (
            <input
              type="text"
              autoComplete="name"
              placeholder="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="rounded-lg border border-amber-500/30 bg-black/40 px-3 py-2 text-sm text-white placeholder-amber-200/40 focus:border-amber-400 focus:outline-none"
            />
          )}
          {needsPhone && (
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="(480) 555-0123"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="rounded-lg border border-amber-500/30 bg-black/40 px-3 py-2 text-sm text-white placeholder-amber-200/40 focus:border-amber-400 focus:outline-none"
            />
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary press shrink-0 rounded-lg px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save'}
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
