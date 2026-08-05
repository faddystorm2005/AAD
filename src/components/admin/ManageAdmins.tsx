'use client';

import { useEffect, useMemo, useState } from 'react';
import { useDialog } from '@/contexts/DialogContext';

interface UserRow {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  is_admin: boolean;
  custom_discount_rate: number;
  discount_single_use: boolean;
  created_at: string;
  booking_count: number;
  total_spent: number;
  last_booking_at: string | null;
}

interface UserBooking {
  id: string;
  service: string;
  scheduled_at: string;
  status: string;
  total: number;
  deposit_paid: boolean;
  decline_reason: string | null;
  created_at: string;
  addons: string[] | null;
}

interface Props {
  /** Current admin's user_id - used to flag self-demote in the UI. */
  currentAdminId: string;
  /** Supabase access token for the API calls. */
  accessToken: string | null;
}

export default function ManageAdmins({ currentAdminId, accessToken }: Props) {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const showDialog = useDialog();
  const [historyById, setHistoryById] = useState<Record<string, UserBooking[] | 'loading' | 'error'>>({});
  const [discountDraft, setDiscountDraft] = useState<Record<string, string>>({});
  const [singleUseDraft, setSingleUseDraft] = useState<Record<string, boolean>>({});
  const [savingDiscount, setSavingDiscount] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const adminCount = useMemo(() => users.filter((u) => u.is_admin).length, [users]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 3000);
    return () => clearTimeout(t);
  }, [flash]);

  const load = async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to load users');
      setUsers(data.users ?? []);
    } catch (err: any) {
      setFlash({ type: 'error', text: err?.message || 'Load failed' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && users.length === 0) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      return (
        (u.email ?? '').toLowerCase().includes(q) ||
        (u.full_name ?? '').toLowerCase().includes(q) ||
        (u.phone ?? '').toLowerCase().includes(q)
      );
    });
  }, [users, query]);

  const loadHistory = async (userId: string) => {
    if (!accessToken) return;
    if (historyById[userId] && historyById[userId] !== 'error') return;
    setHistoryById((h) => ({ ...h, [userId]: 'loading' }));
    try {
      const res = await fetch(`/api/admin/users/bookings?userId=${userId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed');
      setHistoryById((h) => ({ ...h, [userId]: data.bookings ?? [] }));
    } catch {
      setHistoryById((h) => ({ ...h, [userId]: 'error' }));
    }
  };

  const handleExpand = (user: UserRow) => {
    const next = expandedId === user.id ? null : user.id;
    setExpandedId(next);
    if (next) {
      setDiscountDraft((d) => ({ ...d, [user.id]: String(user.custom_discount_rate) }));
      setSingleUseDraft((s) => ({ ...s, [user.id]: user.discount_single_use }));
      loadHistory(user.id);
    }
  };

  const toggleAdmin = async (user: UserRow) => {
    if (!accessToken) return;
    const becomeAdmin = !user.is_admin;
    const isSelf = user.id === currentAdminId;

    if (!becomeAdmin && isSelf) {
      const ok = await showDialog({
        title: 'Demote yourself?',
        body: "You'll lose access to the admin tools immediately.",
        confirmLabel: 'Demote',
        danger: true,
      });
      if (!ok) return;
    } else if (!becomeAdmin) {
      const ok = await showDialog({
        title: `Remove admin access from ${user.full_name || user.email || 'this user'}?`,
        confirmLabel: 'Remove access',
        danger: true,
      });
      if (!ok) return;
    }

    setUpdatingId(user.id);
    const prev = users;
    setUsers((list) =>
      list.map((u) => (u.id === user.id ? { ...u, is_admin: becomeAdmin } : u))
    );

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ userId: user.id, isAdmin: becomeAdmin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Update failed');
      setFlash({
        type: 'success',
        text: becomeAdmin
          ? `${user.full_name || user.email} is now an admin.`
          : `${user.full_name || user.email} is no longer an admin.`,
      });
    } catch (err: any) {
      setUsers(prev);
      setFlash({ type: 'error', text: err?.message || 'Update failed' });
    } finally {
      setUpdatingId(null);
    }
  };

  const saveDiscount = async (user: UserRow) => {
    if (!accessToken) return;
    const draft = discountDraft[user.id] ?? '';
    const rate = Math.max(0, Math.min(50, Math.round(Number(draft) || 0)));
    const singleUse = Boolean(singleUseDraft[user.id]) && rate > 0;

    setSavingDiscount(user.id);
    const prev = users;
    setUsers((list) =>
      list.map((u) =>
        u.id === user.id
          ? { ...u, custom_discount_rate: rate, discount_single_use: singleUse }
          : u
      )
    );
    try {
      const res = await fetch('/api/admin/users/discount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ userId: user.id, rate, singleUse }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Save failed');
      setDiscountDraft((d) => ({ ...d, [user.id]: String(rate) }));
      setSingleUseDraft((s) => ({ ...s, [user.id]: singleUse }));
      setFlash({
        type: 'success',
        text:
          rate > 0
            ? `${rate}% discount saved${singleUse ? ' (single use)' : ''}.`
            : 'Discount removed.',
      });
    } catch (err: any) {
      setUsers(prev);
      setFlash({ type: 'error', text: err?.message || 'Save failed' });
    } finally {
      setSavingDiscount(null);
    }
  };

  const deleteUser = async (user: UserRow, force = false) => {
    if (!accessToken) return;
    if (user.id === currentAdminId) {
      await showDialog({
        title: "Can't delete your own account",
        body: "You can't delete your own account from here.",
        alertOnly: true,
      });
      return;
    }
    const ok = force
      ? await showDialog({
          title: `FORCE DELETE ${user.full_name || user.email}?`,
          body: 'They have active bookings that will be orphaned. This is permanent.',
          confirmLabel: 'Force delete',
          danger: true,
        })
      : await showDialog({
          title: `Permanently delete ${user.full_name || user.email}?`,
          body: 'This removes their account, vehicles, and booking history. Cannot be undone.',
          confirmLabel: 'Delete',
          danger: true,
        });
    if (!ok) return;

    setDeletingUserId(user.id);
    try {
      const res = await fetch('/api/admin/users/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ userId: user.id, force }),
      });
      const data = await res.json();
      if (!res.ok) {
        // The API returns requiresForce=true when there are active bookings.
        if (data?.requiresForce && !force) {
          const forceOk = await showDialog({
            title: data.error || 'User has active bookings',
            body: 'Force delete anyway? Their active bookings will be orphaned.',
            confirmLabel: 'Force delete',
            danger: true,
          });
          if (forceOk) {
            // Recurse with force=true.
            await deleteUser(user, true);
          }
          return;
        }
        throw new Error(data?.error || 'Delete failed');
      }
      setUsers((list) => list.filter((u) => u.id !== user.id));
      setExpandedId(null);
      setFlash({
        type: 'success',
        text: `${user.full_name || user.email} deleted.`,
      });
    } catch (err: any) {
      setFlash({ type: 'error', text: err?.message || 'Delete failed' });
    } finally {
      setDeletingUserId(null);
    }
  };

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
              👥 Manage Users
            </h2>
            <span className="rounded-full border border-gray-700 bg-gray-800 px-2 py-0.5 text-[10px] font-medium text-gray-300">
              {users.length || '–'} total
            </span>
            {adminCount > 0 && (
              <span className="rounded-full border border-gold-800 bg-gold-900/40 px-2 py-0.5 text-[10px] font-medium text-gold-300">
                {adminCount} {adminCount === 1 ? 'admin' : 'admins'}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-gray-300">
            See contact info, booking history, set per-customer discounts, promote admins.
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
        <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, email, or phone…"
              className="flex-1 rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-gold-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="press shrink-0 rounded-lg border border-gray-600 px-3 py-2 text-xs font-medium text-gray-300 hover:bg-gray-800 disabled:opacity-50"
            >
              {loading ? '…' : 'Refresh'}
            </button>
          </div>

          {loading && users.length === 0 ? (
            <div className="h-20 animate-pulse rounded-lg bg-gray-800/60" />
          ) : filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-300">
              {query ? 'No matches.' : 'No users yet.'}
            </p>
          ) : (
            <ul className="space-y-2">
              {filtered.map((u) => {
                const isSelf = u.id === currentAdminId;
                const isUpdating = updatingId === u.id;
                const isExpanded = expandedId === u.id;
                const history = historyById[u.id];
                return (
                  <li
                    key={u.id}
                    className="rounded-lg border border-white/10 bg-gray-900/40 text-sm"
                  >
                    {/* Compact row */}
                    <button
                      type="button"
                      onClick={() => handleExpand(u)}
                      className="flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-white/5"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-medium text-white">
                            {u.full_name || <span className="text-gray-300">(no name)</span>}
                          </p>
                          {isSelf && (
                            <span className="shrink-0 rounded-full border border-blue-700 bg-blue-900/30 px-2 py-0.5 text-[10px] font-medium text-blue-200">
                              You
                            </span>
                          )}
                          {u.is_admin && (
                            <span className="shrink-0 rounded-full border border-gold-800 bg-gold-900/40 px-2 py-0.5 text-[10px] font-medium text-gold-300">
                              Admin
                            </span>
                          )}
                          {u.custom_discount_rate > 0 && (
                            <span className="shrink-0 rounded-full border border-green-800 bg-green-900/30 px-2 py-0.5 text-[10px] font-medium text-green-300">
                              {u.custom_discount_rate}% off{u.discount_single_use ? ' · 1×' : ''}
                            </span>
                          )}
                        </div>
                        <p className="truncate text-xs text-gray-300">{u.email}</p>
                        {u.phone && <p className="truncate text-xs text-gray-300">{u.phone}</p>}
                        <div className="mt-1 flex flex-wrap gap-3 text-[10px] uppercase tracking-wider text-gray-300">
                          <span>{u.booking_count} bookings</span>
                          <span>${u.total_spent.toFixed(2)} spent</span>
                          {u.last_booking_at && (
                            <span>last: {new Date(u.last_booking_at).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-gray-300">{isExpanded ? '▲' : '▼'}</span>
                    </button>

                    {/* Expanded panel */}
                    {isExpanded && (
                      <div className="border-t border-white/10 p-3 space-y-4">
                        {/* Discount editor */}
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300">
                            Customer discount
                          </label>
                          <p className="mt-0.5 text-xs text-gray-300">
                            Applies to every future booking. 0–50%. Stacks with the
                            10% returning-customer discount (system uses whichever is higher).
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <input
                              type="number"
                              min={0}
                              max={50}
                              step={1}
                              value={discountDraft[u.id] ?? ''}
                              onChange={(e) =>
                                setDiscountDraft((d) => ({ ...d, [u.id]: e.target.value }))
                              }
                              className="w-20 rounded-lg border border-gray-600 bg-gray-800 px-2 py-1.5 text-sm text-white focus:border-gold-500 focus:outline-none"
                            />
                            <span className="text-sm text-gray-300">%</span>
                            <button
                              type="button"
                              onClick={() => saveDiscount(u)}
                              disabled={savingDiscount === u.id}
                              className="press rounded-lg bg-gold-600 px-3 py-1.5 text-xs font-medium text-black hover:bg-gold-700 disabled:opacity-50"
                            >
                              {savingDiscount === u.id ? 'Saving…' : 'Save'}
                            </button>
                          </div>
                          <label className="mt-2 flex items-center gap-2 text-xs text-gray-300">
                            <input
                              type="checkbox"
                              checked={Boolean(singleUseDraft[u.id])}
                              onChange={(e) =>
                                setSingleUseDraft((s) => ({ ...s, [u.id]: e.target.checked }))
                              }
                              className="h-3.5 w-3.5"
                            />
                            <span>
                              Single use only - auto-clears to 0% after their next booking
                            </span>
                          </label>
                        </div>

                        {/* Booking history */}
                        <div>
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-300">
                            Booking history
                          </h4>
                          {history === 'loading' ? (
                            <div className="mt-2 h-12 animate-pulse rounded bg-gray-800/60" />
                          ) : history === 'error' ? (
                            <p className="mt-2 text-xs text-red-300">Failed to load.</p>
                          ) : !history || history.length === 0 ? (
                            <p className="mt-2 text-xs text-gray-300">No bookings yet.</p>
                          ) : (
                            <ul className="mt-2 max-h-72 space-y-1 overflow-y-auto pr-1">
                              {history.map((b) => (
                                <li
                                  key={b.id}
                                  className="rounded border border-gray-700 bg-gray-800/40 p-2 text-xs"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate font-medium text-white">{b.service}</p>
                                      <p className="text-gray-300">
                                        {new Date(b.scheduled_at).toLocaleString()}
                                      </p>
                                      {b.status === 'declined' && b.decline_reason && (
                                        <p className="text-red-300">Reason: {b.decline_reason}</p>
                                      )}
                                    </div>
                                    <div className="text-right">
                                      <span
                                        className={`rounded-full border px-2 py-0.5 text-[10px] ${
                                          b.status === 'completed'
                                            ? 'border-green-700 bg-green-900/30 text-green-200'
                                            : b.status === 'declined'
                                            ? 'border-red-700 bg-red-900/30 text-red-200'
                                            : b.status === 'in_progress'
                                            ? 'border-yellow-700 bg-yellow-900/30 text-yellow-200'
                                            : 'border-blue-700 bg-blue-900/30 text-blue-200'
                                        }`}
                                      >
                                        {b.status}
                                      </span>
                                      <p className="mt-1 text-gray-300">${Number(b.total).toFixed(2)}</p>
                                    </div>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        {/* Admin toggle */}
                        <div className="flex items-center justify-between border-t border-white/10 pt-3">
                          <p className="text-xs text-gray-300">
                            {u.is_admin
                              ? 'Has admin access to this dashboard.'
                              : 'Standard customer - no admin access.'}
                          </p>
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => toggleAdmin(u)}
                            className={`press shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
                              u.is_admin
                                ? 'border border-gold-600 text-gold-300 hover:bg-gold-900/20'
                                : 'bg-gold-600 text-black hover:bg-gold-700'
                            }`}
                          >
                            {isUpdating ? '…' : u.is_admin ? 'Remove admin' : 'Make admin'}
                          </button>
                        </div>

                        {/* Danger zone - delete user permanently */}
                        {!isSelf && (
                          <div className="border-t border-red-900/40 pt-3">
                            <p className="text-xs font-semibold uppercase tracking-wider text-red-500">
                              Danger Zone
                            </p>
                            <p className="mt-1 text-xs text-gray-300">
                              Permanently deletes this user&apos;s account and access. Booking
                              history is orphaned. Use only for spam, duplicates, or true
                              account-removal requests.
                            </p>
                            <button
                              type="button"
                              disabled={deletingUserId === u.id}
                              onClick={() => deleteUser(u)}
                              className="mt-2 rounded-lg border border-red-600 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-900/20 disabled:opacity-50"
                            >
                              {deletingUserId === u.id ? 'Deleting…' : 'Delete user permanently'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <p className="pt-1 text-xs text-gray-300">
            ⚠️ Per-customer discounts require a one-time SQL migration. If saving fails with a missing-column error, you&apos;ll see the exact SQL to run.
          </p>
        </div>
      )}
    </div>
  );
}
