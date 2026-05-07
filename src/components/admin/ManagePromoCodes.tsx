'use client';

import { useEffect, useState } from 'react';
import { useDialog } from '@/contexts/DialogContext';

interface PromoCode {
  id: string;
  code: string;
  discount_rate: number;
  max_uses: number | null;
  uses_count: number;
  expires_at: string | null;
  active: boolean;
  created_at: string;
}

interface Props {
  accessToken: string | null;
}

export default function ManagePromoCodes({ accessToken }: Props) {
  const [open, setOpen] = useState(false);
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const showDialog = useDialog();

  // Create form state
  const [code, setCode] = useState('');
  const [rate, setRate] = useState('15');
  const [maxUses, setMaxUses] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 3000);
    return () => clearTimeout(t);
  }, [flash]);

  const load = async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/promos', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Load failed');
      setPromos(data.promos ?? []);
    } catch (err: any) {
      setFlash({ type: 'error', text: err?.message || 'Load failed' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && promos.length === 0 && !loading) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleCreate = async () => {
    if (!accessToken) return;
    if (!code.trim()) {
      setFlash({ type: 'error', text: 'Code is required.' });
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/admin/promos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          code: code.trim(),
          rate: Number(rate),
          maxUses: maxUses === '' ? null : Number(maxUses),
          expiresAt: expiresAt || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Create failed');
      setPromos((p) => [data.promo, ...p]);
      setCode('');
      setRate('15');
      setMaxUses('');
      setExpiresAt('');
      setFlash({ type: 'success', text: `Code "${data.promo.code}" created.` });
    } catch (err: any) {
      setFlash({ type: 'error', text: err?.message || 'Create failed' });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (promo: PromoCode) => {
    if (!accessToken) return;
    const ok = await showDialog({
      title: `Delete code "${promo.code}"?`,
      body: "This can't be undone.",
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    setBusyId(promo.id);
    const prev = promos;
    setPromos((p) => p.filter((x) => x.id !== promo.id));
    try {
      const res = await fetch(`/api/admin/promos?id=${promo.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Delete failed');
      setFlash({ type: 'success', text: `Deleted "${promo.code}".` });
    } catch (err: any) {
      setPromos(prev);
      setFlash({ type: 'error', text: err?.message || 'Delete failed' });
    } finally {
      setBusyId(null);
    }
  };

  const isExpired = (p: PromoCode) =>
    p.expires_at != null && new Date(p.expires_at) < new Date();
  const isUsedUp = (p: PromoCode) =>
    p.max_uses != null && p.uses_count >= p.max_uses;

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
              🎟️ Promo Codes
            </h2>
            {promos.length > 0 && (
              <span className="rounded-full border border-gray-700 bg-gray-800 px-2 py-0.5 text-[10px] font-medium text-gray-300">
                {promos.length}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-gray-300">
            Codes customers type at checkout. Set rate, optional usage cap and expiration.
          </p>
        </div>
        <span className="text-gray-300">{open ? '▲' : '▼'}</span>
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
        <div className="mt-4 space-y-4 border-t border-white/10 pt-4">
          {/* Create form */}
          <div className="rounded-lg border border-white/10 bg-gray-900/40 p-3 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
              Create new code
            </h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-gray-300">
                  Code
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="SPRING25"
                  className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-1.5 text-sm font-mono text-white focus:border-red-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-gray-300">
                  Discount %
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-1.5 text-sm text-white focus:border-red-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-gray-300">
                  Max uses (optional)
                </label>
                <input
                  type="number"
                  min={1}
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  placeholder="∞"
                  className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-1.5 text-sm text-white focus:border-red-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-gray-300">
                  Expires (optional)
                </label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-1.5 text-sm text-white focus:border-red-500 focus:outline-none"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating}
              className="press w-full rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {creating ? 'Creating…' : 'Create code'}
            </button>
          </div>

          {/* Existing codes */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
              Existing codes
            </h3>
            {loading && promos.length === 0 ? (
              <div className="mt-2 h-12 animate-pulse rounded bg-gray-800/60" />
            ) : promos.length === 0 ? (
              <p className="mt-2 text-xs text-gray-300">No codes yet.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {promos.map((p) => {
                  const expired = isExpired(p);
                  const usedUp = isUsedUp(p);
                  const inactive = !p.active || expired || usedUp;
                  return (
                    <li
                      key={p.id}
                      className={`rounded-lg border p-3 text-sm ${
                        inactive
                          ? 'border-gray-700 bg-gray-900/30 text-gray-300'
                          : 'border-white/10 bg-gray-900/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-mono font-semibold text-white">
                              {p.code}
                            </p>
                            <span className="rounded-full border border-green-800 bg-green-900/30 px-2 py-0.5 text-[10px] font-medium text-green-300">
                              {p.discount_rate}% off
                            </span>
                            {expired && (
                              <span className="rounded-full border border-red-800 bg-red-900/30 px-2 py-0.5 text-[10px] font-medium text-red-300">
                                Expired
                              </span>
                            )}
                            {usedUp && (
                              <span className="rounded-full border border-red-800 bg-red-900/30 px-2 py-0.5 text-[10px] font-medium text-red-300">
                                Used up
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-gray-300">
                            Used {p.uses_count}{p.max_uses != null ? `/${p.max_uses}` : ' (no cap)'}
                            {p.expires_at && ` · expires ${new Date(p.expires_at).toLocaleDateString()}`}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={busyId === p.id}
                          onClick={() => handleDelete(p)}
                          className="press shrink-0 rounded-lg border border-red-600 px-2 py-1 text-[10px] font-medium text-red-300 hover:bg-red-900/20 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <p className="text-xs text-gray-300">
            ⚠️ Requires a one-time SQL migration (see setup notes). Customers
            type the code on the booking form.
          </p>
        </div>
      )}
    </div>
  );
}
