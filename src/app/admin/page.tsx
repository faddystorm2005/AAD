'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useDialog } from '@/contexts/DialogContext';
import { supabase } from '@/lib/supabaseClient';
import { ADD_ONS, SERVICE_TYPE_NAMES, ServiceType } from '@/lib/bookingPricing';
import {
  Stage,
  STAGE_LABELS,
  getStagesForBooking,
  normalizeStage,
} from '@/lib/bookingStages';
import DailyCapacityPanel from '@/components/admin/DailyCapacityPanel';
import GoogleCalendarSubscribe from '@/components/admin/GoogleCalendarSubscribe';
import ManageAdmins from '@/components/admin/ManageAdmins';
import ManagePromoCodes from '@/components/admin/ManagePromoCodes';

type Status =
  | 'pending'
  | 'approved'
  | 'declined'
  | 'cancelled'
  | 'confirmed'
  | 'in_progress'
  | 'completed';

const STATUS_BADGES: Record<Status, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-yellow-900/40 text-yellow-300 border-yellow-800' },
  approved: { label: 'Approved · awaiting deposit', className: 'bg-blue-900/40 text-blue-300 border-blue-800' },
  declined: { label: 'Declined', className: 'bg-red-900/40 text-red-300 border-red-800' },
  cancelled: { label: 'Cancelled', className: 'bg-gray-800 text-gray-300 border-gray-700' },
  confirmed: { label: 'Confirmed', className: 'bg-green-900/40 text-green-300 border-green-800' },
  in_progress: { label: 'In progress', className: 'bg-green-900/40 text-green-300 border-green-800' },
  completed: { label: 'Completed', className: 'bg-gray-800 text-gray-300 border-gray-700' },
};

const SIZE_LABELS: Record<string, string> = {
  small: 'Small Sedan / Coupe',
  suv: 'SUV',
  truck: 'Truck / 3-Row',
};

interface Vehicle {
  year: number;
  make: string;
  model: string;
  color: string | null;
  nickname: string | null;
  size: string;
}

interface Customer {
  full_name: string | null;
  phone: string | null;
  email: string | null;
}

interface AdminBooking {
  id: string;
  user_id: string;
  vehicle_id: string;
  service: string;
  service_type?: ServiceType | null;
  size: string;
  addons: string[] | null;
  scheduled_at: string;
  address: string;
  unit: string | null;
  city: string;
  state: string;
  zip: string;
  notes: string | null;
  deposit_amount: number;
  deposit_paid: boolean;
  subtotal: number;
  total: number;
  discount_amount: number;
  discount_applied: boolean;
  booking_stage: Stage;
  status: Status;
  decline_reason: string | null;
  payment_url: string | null;
  approved_at: string | null;
  declined_at: string | null;
  is_ceramic: boolean;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  cancel_requested_at: string | null;
  cancel_request_reason: string | null;
  promo_code_used?: string | null;
  customer: Customer | null;
  vehicle: Vehicle | null;
}

function formatAddons(ids: string[] | null | undefined): string[] {
  if (!ids || ids.length === 0) return [];
  return ids.map((id) => ADD_ONS.find((a) => a.id === id)?.name ?? id);
}

export default function AdminPage() {
  const { user, session, loading: authLoading, signOut } = useAuth();
  const showDialog = useDialog();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'cancel_requests' | 'active' | 'all'>('pending');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cancelCreditDraft, setCancelCreditDraft] = useState<Record<string, string>>({});
  const [cancelDenyNoteDraft, setCancelDenyNoteDraft] = useState<Record<string, string>>({});
  const [pushState, setPushState] = useState<'checking' | 'unsupported' | 'needs-install' | 'denied' | 'disabled' | 'enabled'>('checking');
  const [pushWorking, setPushWorking] = useState(false);
  const pushSubRef = useRef<PushSubscription | null>(null);
  const [search, setSearch] = useState('');

  // Auto-clear success banner after 2.5s.
  useEffect(() => {
    if (!actionSuccess) return;
    const t = setTimeout(() => setActionSuccess(null), 2500);
    return () => clearTimeout(t);
  }, [actionSuccess]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [declineReasonDraft, setDeclineReasonDraft] = useState<Record<string, string>>({});
  const [photosByBooking, setPhotosByBooking] = useState<Record<string, { id: string; slotKey: string; signedUrl: string | null }[]>>({});
  const [photosLoadingId, setPhotosLoadingId] = useState<string | null>(null);
  const loadedPhotoIds = useRef(new Set<string>());

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/auth');
      return;
    }

    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .maybeSingle();
      setIsAdmin(Boolean(data?.is_admin));
    })();
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!isAdmin) return;

    let cancelled = false;
    const load = async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(
          `*,
           customer:profiles!user_id(full_name, phone, email),
           vehicle:vehicles!vehicle_id(year, make, model, color, nickname, size)`
        )
        .order('scheduled_at', { ascending: true });
      if (cancelled) return;
      if (error) {
        setLoadError(error.message);
        setBookings([]);
      } else {
        setLoadError(null);
        setBookings((data as AdminBooking[]) ?? []);
      }
      setLoading(false);
    };

    load();

    const channel = supabase
      .channel('admin-bookings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => load()
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  useEffect(() => {
    if (!expandedId || !session?.access_token) return;
    if (loadedPhotoIds.current.has(expandedId)) return;
    loadedPhotoIds.current.add(expandedId);

    let cancelled = false;
    setPhotosLoadingId(expandedId);

    fetch(`/api/admin/booking-photos?bookingId=${expandedId}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setPhotosByBooking((prev) => ({ ...prev, [expandedId]: data.photos ?? [] }));
      })
      .catch(() => {
        if (cancelled) return;
        setPhotosByBooking((prev) => ({ ...prev, [expandedId]: [] }));
      })
      .finally(() => {
        if (!cancelled) setPhotosLoadingId(null);
      });

    return () => { cancelled = true; };
  }, [expandedId, session?.access_token]);

  useEffect(() => {
    if (!isAdmin) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      // On iOS Safari, Push is only available when installed as a PWA.
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isStandalone = (navigator as { standalone?: boolean }).standalone === true;
      if (isIOS && !isStandalone) {
        setPushState('needs-install');
      } else {
        setPushState('unsupported');
      }
      return;
    }
    if (Notification.permission === 'denied') {
      setPushState('denied');
      return;
    }
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        if (sub) {
          pushSubRef.current = sub;
          setPushState('enabled');
        } else {
          setPushState('disabled');
        }
      });
    });
  }, [isAdmin]);

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
  };

  const handleEnablePush = async () => {
    if (!session?.access_token) return;
    setPushWorking(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setPushState(permission === 'denied' ? 'denied' : 'disabled');
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      pushSubRef.current = sub;
      await fetch('/api/push-subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ subscription: sub.toJSON(), userAgent: navigator.userAgent }),
      });
      setPushState('enabled');
    } catch (err: any) {
      setActionError('Could not enable push notifications: ' + err.message);
    } finally {
      setPushWorking(false);
    }
  };

  const handleDisablePush = async () => {
    if (!session?.access_token || !pushSubRef.current) return;
    setPushWorking(true);
    try {
      const endpoint = pushSubRef.current.endpoint;
      await pushSubRef.current.unsubscribe();
      pushSubRef.current = null;
      await fetch('/api/push-subscribe', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ endpoint }),
      });
      setPushState('disabled');
    } catch (err: any) {
      setActionError('Could not disable push notifications: ' + err.message);
    } finally {
      setPushWorking(false);
    }
  };

  const handleStageChange = async (bookingId: string, stage: Stage) => {
    if (!session?.access_token) return;
    setUpdatingId(bookingId);
    setActionError(null);

    // Optimistic update - mirror the server-side logic in
    // /api/admin/update-stage so the UI reflects the change instantly.
    const prev = bookings;
    const now = new Date().toISOString();
    setBookings((list) =>
      list.map((b) => {
        if (b.id !== bookingId) return b;
        const next: AdminBooking = { ...b, booking_stage: stage };
        if (stage !== 'requested' && !b.started_at) next.started_at = now;
        if (stage === 'done' && !b.completed_at) {
          next.completed_at = now;
          next.status = 'completed';
        }
        return next;
      })
    );

    try {
      const res = await fetch('/api/admin/update-stage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ bookingId, stage }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || 'Update failed');
      }
    } catch (err: any) {
      setBookings(prev);
      setActionError(err.message || 'Update failed');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleMarkDeposit = async (bookingId: string, paid: boolean) => {
    if (!session?.access_token) return;
    if (!paid) {
      const ok = await showDialog({
        title: 'Mark this deposit as unpaid?',
        body: 'The customer will see the booking as pending again.',
        confirmLabel: 'Mark unpaid',
        danger: true,
      });
      if (!ok) return;
    }
    setUpdatingId(bookingId);
    setActionError(null);

    // Optimistic update so the UI reflects the change instantly even if
    // Supabase Realtime isn't enabled on the bookings table.
    const prev = bookings;
    setBookings((list) =>
      list.map((b) =>
        b.id === bookingId
          ? {
              ...b,
              deposit_paid: paid,
              status: paid
                ? b.status === 'approved' || b.status === 'pending'
                  ? 'confirmed'
                  : b.status
                : b.status === 'confirmed'
                ? 'approved'
                : b.status,
            }
          : b
      )
    );

    try {
      const res = await fetch('/api/admin/mark-deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ bookingId, paid }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || 'Update failed');
      }
    } catch (err: any) {
      // Roll back on failure.
      setBookings(prev);
      setActionError(err.message || 'Update failed');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleApprove = async (bookingId: string) => {
    if (!session?.access_token) return;
    setUpdatingId(bookingId);
    setActionError(null);

    // Optimistic - flip to 'approved' immediately. The Square payment URL
    // comes back in the response; we patch it in once we have it.
    const prev = bookings;
    const now = new Date().toISOString();
    setBookings((list) =>
      list.map((b) =>
        b.id === bookingId ? { ...b, status: 'approved', approved_at: now } : b
      )
    );

    try {
      const res = await fetch('/api/admin/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ bookingId, origin: window.location.origin }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error || 'Approve failed');
      }
      const paymentUrl: string | undefined = body?.paymentUrl;
      if (paymentUrl) {
        setBookings((list) =>
          list.map((b) => (b.id === bookingId ? { ...b, payment_url: paymentUrl } : b))
        );
      }
      setActionSuccess('Booking approved - deposit link sent to customer.');
    } catch (err: any) {
      setBookings(prev);
      setActionError(err.message || 'Approve failed');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (bookingId: string) => {
    if (!session?.access_token) return;
    const ok = await showDialog({
      title: 'Permanently delete this booking?',
      body: 'This wipes the row from the database. There is no undo.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    setUpdatingId(bookingId);
    setActionError(null);
    try {
      const res = await fetch('/api/bookings/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ bookingId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || 'Delete failed');
      }
      // Realtime will refresh; clear optimistically too.
      setBookings((prev) => prev.filter((b) => b.id !== bookingId));
      if (expandedId === bookingId) setExpandedId(null);
    } catch (err: any) {
      setActionError(err.message || 'Delete failed');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCancelApprove = async (bookingId: string) => {
    if (!session?.access_token) return;
    const raw = (cancelCreditDraft[bookingId] ?? '').trim();
    const creditAmount = raw ? Number(raw) : 0;
    if (raw && (!Number.isFinite(creditAmount) || creditAmount < 0)) {
      setActionError('Credit amount must be a non-negative number.');
      return;
    }
    const ok = await showDialog({
      title:
        creditAmount > 0
          ? `Approve cancellation and add $${creditAmount.toFixed(2)} account credit?`
          : 'Approve cancellation with no credit issued?',
      confirmLabel: 'Approve',
    });
    if (!ok) return;
    setUpdatingId(bookingId);
    setActionError(null);

    const prev = bookings;
    const now = new Date().toISOString();
    // Optimistic: clear the request marker and flip to a cancelled-ish status.
    setBookings((list) =>
      list.map((b) =>
        b.id === bookingId
          ? {
              ...b,
              status: 'cancelled',
              cancel_requested_at: null,
              cancel_request_reason: null,
              decline_reason: `Cancellation approved${creditAmount > 0 ? ` ($${creditAmount.toFixed(2)} credit)` : ''}`,
              declined_at: now,
            }
          : b
      )
    );

    try {
      const res = await fetch('/api/admin/cancel-approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ bookingId, creditAmount }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || 'Approve failed');
      }
      setCancelCreditDraft((prev) => {
        const next = { ...prev };
        delete next[bookingId];
        return next;
      });
      setActionSuccess(
        creditAmount > 0
          ? `Cancellation approved. $${creditAmount.toFixed(2)} credit issued.`
          : 'Cancellation approved.'
      );
    } catch (err: any) {
      setBookings(prev);
      setActionError(err.message || 'Approve failed');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCancelDeny = async (bookingId: string) => {
    if (!session?.access_token) return;
    const note = (cancelDenyNoteDraft[bookingId] ?? '').trim();
    const ok = await showDialog({
      title: 'Deny this cancellation request?',
      body: 'The booking will continue as scheduled.',
      confirmLabel: 'Deny',
      danger: true,
    });
    if (!ok) return;
    setUpdatingId(bookingId);
    setActionError(null);

    const prev = bookings;
    setBookings((list) =>
      list.map((b) =>
        b.id === bookingId
          ? { ...b, cancel_requested_at: null, cancel_request_reason: null }
          : b
      )
    );

    try {
      const res = await fetch('/api/admin/cancel-deny', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ bookingId, note }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || 'Deny failed');
      }
      setCancelDenyNoteDraft((prev) => {
        const next = { ...prev };
        delete next[bookingId];
        return next;
      });
      setActionSuccess('Cancellation request denied. Customer notified.');
    } catch (err: any) {
      setBookings(prev);
      setActionError(err.message || 'Deny failed');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDecline = async (bookingId: string) => {
    if (!session?.access_token) return;
    const reason = (declineReasonDraft[bookingId] ?? '').trim();
    const ok = await showDialog({
      title: 'Decline this booking?',
      body: 'The customer will be notified and the slot will reopen.',
      confirmLabel: 'Decline',
      danger: true,
    });
    if (!ok) return;
    setUpdatingId(bookingId);
    setActionError(null);

    // Optimistic - mark declined and stash the reason so the slot frees up
    // and the row moves out of the active list immediately.
    const prevBookings = bookings;
    const now = new Date().toISOString();
    setBookings((list) =>
      list.map((b) =>
        b.id === bookingId
          ? {
              ...b,
              status: 'declined',
              decline_reason: reason || null,
              declined_at: now,
            }
          : b
      )
    );

    try {
      const res = await fetch('/api/admin/decline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ bookingId, reason }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || 'Decline failed');
      }
      setDeclineReasonDraft((prev) => {
        const next = { ...prev };
        delete next[bookingId];
        return next;
      });
      setActionSuccess('Booking declined - slot freed.');
    } catch (err: any) {
      setBookings(prevBookings);
      setActionError(err.message || 'Decline failed');
    } finally {
      setUpdatingId(null);
    }
  };

  if (authLoading || isAdmin === null) {
    return (
      <main className="min-h-screen bg-black px-6 py-16 text-white">
        <div className="flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-black px-6 py-16 text-white">
        <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
          <h1 className="mb-2 text-2xl font-bold">Not authorized</h1>
          <p className="mb-6 text-sm text-gray-300">
            You don&apos;t have admin access to this workspace.
          </p>
          <Link href="/dashboard" className="inline-block rounded-lg bg-red-600 px-6 py-3 text-base font-semibold hover:bg-red-700">
            Back to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  const pendingCount = bookings.filter((b) => b.status === 'pending').length;
  const cancelRequestCount = bookings.filter((b) => b.cancel_requested_at).length;

  const searchLower = search.trim().toLowerCase();
  const matchesSearch = (b: AdminBooking) => {
    if (!searchLower) return true;
    return (
      b.customer?.full_name?.toLowerCase().includes(searchLower) ||
      b.customer?.phone?.toLowerCase().includes(searchLower) ||
      b.customer?.email?.toLowerCase().includes(searchLower) ||
      b.address?.toLowerCase().includes(searchLower) ||
      b.city?.toLowerCase().includes(searchLower) ||
      false
    );
  };

  const visible = bookings
    .filter((b) => {
      const status: Status = b.status ?? 'pending';
      if (filter === 'pending') return status === 'pending';
      if (filter === 'cancel_requests') return Boolean(b.cancel_requested_at);
      if (filter === 'active') return status !== 'declined' && status !== 'completed';
      return true;
    })
    .filter(matchesSearch)
    // Pending bookings newest first so the latest request is always at the top.
    .sort((a, b) => {
      if (filter === 'pending') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return 0;
    });

  return (
    <main className="min-h-screen bg-black px-6 py-12 text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-[0.18em]">Admin</h1>
            <p className="break-all text-sm text-gray-300">{user?.email}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Link
              href="/"
              className="rounded-lg border border-gray-600 px-4 py-3 text-base text-gray-300 hover:bg-gray-800"
              title="View public homepage"
            >
              ← Home
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg border border-gray-600 px-4 py-3 text-base text-gray-300 hover:bg-gray-800"
            >
              Customer view
            </Link>
            <button
              onClick={async () => {
                await signOut();
                router.push('/auth');
              }}
              className="rounded-lg border border-gray-600 px-4 py-3 text-base text-gray-300 hover:bg-gray-800"
            >
              Sign Out
            </button>
          </div>
        </div>

        <DailyCapacityPanel session={session} />

        {user && (
          <GoogleCalendarSubscribe
            adminUserId={user.id}
            accessToken={session?.access_token ?? null}
          />
        )}

        {user && (
          <ManageAdmins
            currentAdminId={user.id}
            accessToken={session?.access_token ?? null}
          />
        )}

        <ManagePromoCodes accessToken={session?.access_token ?? null} />

        {/* Booking Alerts - web push for new bookings */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-gray-300">Booking Alerts</h2>
          <p className="mb-4 text-xs text-gray-300">
            Get a push notification on this device when a new booking comes in.
            {pushState === 'unsupported' || pushState === 'denied' ? '' : ' iOS users: install the app to Home Screen first.'}
          </p>
          {pushState === 'checking' && (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
          )}
          {pushState === 'needs-install' && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-yellow-400">Install the app first to enable alerts on iPhone.</p>
              <ol className="space-y-2 text-sm text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">1</span>
                  Tap the <strong>Share</strong> button at the bottom of Safari
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">2</span>
                  Tap <strong>Add to Home Screen</strong>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">3</span>
                  Open the app from your Home Screen, then come back here
                </li>
              </ol>
            </div>
          )}
          {pushState === 'unsupported' && (
            <p className="text-sm text-gray-300">Push notifications are not supported on this browser.</p>
          )}
          {pushState === 'denied' && (
            <p className="text-sm text-yellow-400">Notifications are blocked. Allow them in your browser settings, then reload.</p>
          )}
          {pushState === 'disabled' && (
            <button
              type="button"
              onClick={handleEnablePush}
              disabled={pushWorking}
              className="rounded-lg bg-red-600 px-4 py-3 text-base font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {pushWorking ? 'Enabling...' : 'Enable booking alerts on this device'}
            </button>
          )}
          {pushState === 'enabled' && (
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <span className="flex items-center gap-2 text-sm text-green-400">
                <span className="inline-block h-2 w-2 rounded-full bg-green-400" />
                Alerts enabled on this device
              </span>
              <button
                type="button"
                onClick={handleDisablePush}
                disabled={pushWorking}
                className="rounded-lg border border-gray-600 px-4 py-3 text-sm text-gray-300 hover:bg-gray-800 disabled:opacity-50"
              >
                {pushWorking ? 'Disabling...' : 'Disable'}
              </button>
            </div>
          )}
        </div>

        {/* Search - find a customer by name, phone, email, or address */}
        <div className="relative">
          <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="search"
            placeholder="Search by name, phone, email, or address"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-700 bg-gray-900 py-3 pl-10 pr-4 text-base text-white placeholder-gray-500 focus:border-red-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('pending')}
            className={`rounded-full px-4 py-3 text-sm ${
              filter === 'pending' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-300'
            }`}
          >
            Pending {pendingCount > 0 && `(${pendingCount})`}
          </button>
          <button
            onClick={() => setFilter('cancel_requests')}
            className={`rounded-full px-4 py-3 text-sm ${
              filter === 'cancel_requests'
                ? 'bg-amber-600 text-white'
                : cancelRequestCount > 0
                  ? 'bg-amber-900/40 text-amber-200 ring-1 ring-amber-500/50'
                  : 'bg-gray-800 text-gray-300'
            }`}
          >
            Cancel Requests {cancelRequestCount > 0 && `(${cancelRequestCount})`}
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`rounded-full px-4 py-3 text-sm ${
              filter === 'active' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-300'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`rounded-full px-4 py-3 text-sm ${
              filter === 'all' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-300'
            }`}
          >
            All
          </button>
        </div>

        {loadError && (
          <div className="rounded-lg border border-red-700 bg-red-900/40 p-3 text-sm text-red-200">
            <p className="font-semibold">Failed to load bookings</p>
            <p className="mt-1 text-xs text-red-300/80">{loadError}</p>
          </div>
        )}

        {actionError && (
          <div className="rounded-lg border border-red-700 bg-red-900/40 p-3 text-sm text-red-200">
            {actionError}
          </div>
        )}

        {actionSuccess && (
          <div
            role="status"
            className="animate-fade-up rounded-lg border border-green-700 bg-green-900/30 p-3 text-sm text-green-200"
          >
            {actionSuccess}
          </div>
        )}

        {loading ? (
          <div className="h-32 animate-pulse rounded-lg bg-gray-800" />
        ) : visible.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-700 p-8 text-center text-gray-300">
            {filter === 'active' ? 'No active bookings.' : 'No bookings yet.'}
          </div>
        ) : (
          <div className="space-y-3">
            {visible.map((b) => {
              const isExpanded = expandedId === b.id;
              const addonNames = formatAddons(b.addons);
              return (
                <div
                  key={b.id}
                  className="rounded-lg border border-gray-700 bg-gray-900"
                >
                  <div className="flex flex-col sm:flex-row sm:items-stretch">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : b.id)}
                      className="flex flex-1 flex-col gap-3 p-4 text-left hover:bg-gray-800/40 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:p-5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="break-words font-semibold text-white">
                          {SERVICE_TYPE_NAMES[b.service_type ?? 'full_detail']}
                          {b.customer?.full_name && (
                            <span className="ml-2 text-sm font-normal text-gray-300">
                              · {b.customer.full_name}
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-gray-300">{b.service}</p>
                        <p className="text-sm text-gray-300">
                          {new Date(b.scheduled_at).toLocaleString()}
                        </p>
                        <p className="break-words text-sm text-gray-300">
                          {b.address}{b.unit ? ` ${b.unit}` : ''}, {b.city}, {b.state} {b.zip}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end sm:gap-1 sm:text-right">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-sm font-medium ${
                            STATUS_BADGES[(b.status ?? 'pending') as Status].className
                          }`}
                        >
                          {STATUS_BADGES[(b.status ?? 'pending') as Status].label}
                          {b.is_ceramic && ' · ceramic'}
                        </span>
                        <span className="text-sm text-gray-300">
                          ${Number(b.deposit_amount).toFixed(2)} of ${Number(b.total).toFixed(2)}
                        </span>
                        {b.status !== 'pending' && b.status !== 'declined' && (
                          <span className="text-sm text-red-400">
                            Stage: {STAGE_LABELS[normalizeStage(b.booking_stage)]}
                          </span>
                        )}
                        <span className="text-sm text-gray-300">
                          {isExpanded ? '▲ Hide' : '▼ Details'}
                        </span>
                      </div>
                    </button>

                    {/* Quick-action panel: approve/decline without expanding.
                        Full-width row under the booking info on mobile, side
                        column on sm+. Buttons grow to py-3 min so tap targets
                        meet the 44px Apple HIG minimum. */}
                    {b.status === 'pending' && (
                      <div className="flex shrink-0 gap-2 border-t border-gray-700 px-4 pb-4 pt-3 sm:flex-col sm:justify-center sm:border-l sm:border-t-0 sm:px-3 sm:py-3">
                        <button
                          type="button"
                          disabled={updatingId === b.id}
                          onClick={(e) => { e.stopPropagation(); handleApprove(b.id); }}
                          className="flex-1 rounded-lg bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 sm:flex-none"
                        >
                          {updatingId === b.id ? '…' : '✓ Approve'}
                        </button>
                        <button
                          type="button"
                          disabled={updatingId === b.id}
                          onClick={(e) => { e.stopPropagation(); setExpandedId(b.id); }}
                          className="flex-1 rounded-lg border border-gray-600 px-4 py-3 text-sm text-gray-300 hover:bg-gray-800 disabled:opacity-50 sm:flex-none"
                        >
                          Decline…
                        </button>
                      </div>
                    )}
                  </div>

                  {isExpanded && (
                    <div className="border-t border-gray-700 px-5 py-5">
                      <div className="grid gap-5 md:grid-cols-2">
                        {b.notes && b.notes.trim() && (
                          <div className="md:col-span-2 rounded-lg border border-blue-500/50 bg-blue-900/30 p-4">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-200">
                              Special instructions from customer
                            </h3>
                            <p className="mt-2 text-sm text-blue-100 whitespace-pre-wrap">
                              {b.notes.trim()}
                            </p>
                          </div>
                        )}
                        {photosLoadingId === b.id ? (
                          <div className="md:col-span-2">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-300">
                              Customer Photos
                            </h3>
                            <div className="mt-2 h-4 w-28 animate-pulse rounded bg-gray-700" />
                          </div>
                        ) : (photosByBooking[b.id] ?? []).length > 0 ? (
                          <div className="md:col-span-2">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-300">
                              Customer Photos ({photosByBooking[b.id].length})
                            </h3>
                            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                              {photosByBooking[b.id].map((p) => (
                                <a
                                  key={p.id}
                                  href={p.signedUrl ?? '#'}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="group relative aspect-square overflow-hidden rounded-lg border border-gray-700 bg-gray-800"
                                >
                                  {p.signedUrl ? (
                                    <img
                                      src={p.signedUrl}
                                      alt={slotKeyToLabel(p.slotKey)}
                                      className="h-full w-full object-cover transition group-hover:scale-105"
                                    />
                                  ) : (
                                    <div className="flex h-full items-center justify-center text-sm text-gray-300">
                                      Failed
                                    </div>
                                  )}
                                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                                    <p className="text-xs font-medium leading-tight text-white">
                                      {slotKeyToLabel(p.slotKey)}
                                    </p>
                                  </div>
                                </a>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-300">
                            Customer
                          </h3>
                          <p className="mt-2 text-white">
                            {b.customer?.full_name || <span className="text-gray-300">Name not set</span>}
                          </p>
                          <p className="text-sm text-gray-300">
                            {b.customer?.email || 'Email unavailable'}
                          </p>
                          <p className="text-sm text-gray-300">
                            {b.customer?.phone || 'No phone on file'}
                          </p>
                        </div>

                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-300">
                            Vehicle
                          </h3>
                          {b.vehicle ? (
                            <>
                              <p className="mt-2 text-white">
                                {b.vehicle.year} {b.vehicle.make} {b.vehicle.model}
                                {b.vehicle.nickname && (
                                  <span className="ml-1 text-sm text-gray-300">
                                    · {b.vehicle.nickname}
                                  </span>
                                )}
                              </p>
                              <p className="text-sm text-gray-300">
                                {b.vehicle.color || 'Color not set'} · {SIZE_LABELS[b.vehicle.size] ?? b.vehicle.size}
                              </p>
                            </>
                          ) : (
                            <p className="mt-2 text-sm text-gray-300">Vehicle was deleted</p>
                          )}
                        </div>

                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-300">
                            Scheduled
                          </h3>
                          <p className="mt-2 text-white">
                            {new Date(b.scheduled_at).toLocaleString()}
                          </p>
                        </div>

                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-300">
                            Service address
                          </h3>
                          <p className="mt-2 text-white">{b.address}{b.unit ? ` ${b.unit}` : ''}</p>
                          <p className="text-sm text-gray-300">
                            {b.city}, {b.state} {b.zip}
                          </p>
                        </div>

                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-300">
                            Add-ons
                          </h3>
                          {addonNames.length === 0 ? (
                            <p className="mt-2 text-sm text-gray-300">None</p>
                          ) : (
                            <ul className="mt-2 list-inside list-disc text-sm text-gray-300">
                              {addonNames.map((name, i) => (
                                <li key={i}>{name}</li>
                              ))}
                            </ul>
                          )}
                        </div>

                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-300">
                            Payment
                          </h3>
                          <p
                            className={`mt-2 font-semibold ${
                              b.deposit_paid ? 'text-green-400' : 'text-yellow-300'
                            }`}
                          >
                            {b.deposit_paid ? 'Deposit paid' : 'Awaiting deposit'}
                          </p>
                          <div className="mt-1 space-y-0.5 text-sm text-gray-300">
                            <div className="flex justify-between">
                              <span>Subtotal</span>
                              <span>${Number(b.subtotal).toFixed(2)}</span>
                            </div>
                            {Number(b.discount_amount) > 0 && (
                              <div className="flex justify-between text-green-400">
                                <span>
                                  {b.promo_code_used
                                    ? `Promo "${b.promo_code_used}"`
                                    : 'Returning customer discount'}
                                </span>
                                <span>−${Number(b.discount_amount).toFixed(2)}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-white font-semibold">
                              <span>Total</span>
                              <span>${Number(b.total).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Deposit</span>
                              <span>${Number(b.deposit_amount).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Balance due on site</span>
                              <span>${(Number(b.total) - Number(b.deposit_amount)).toFixed(2)}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            disabled={updatingId === b.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkDeposit(b.id, !b.deposit_paid);
                            }}
                            className={`mt-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors disabled:opacity-50 ${
                              b.deposit_paid
                                ? 'border border-gray-600 text-gray-300 hover:bg-gray-800'
                                : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                          >
                            {updatingId === b.id
                              ? 'Saving…'
                              : b.deposit_paid
                              ? 'Mark deposit unpaid'
                              : 'Mark deposit paid'}
                          </button>
                        </div>

                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-300">
                            Timing
                          </h3>
                          <p className="mt-2 text-sm text-gray-300">
                            Started:{' '}
                            {b.started_at
                              ? new Date(b.started_at).toLocaleString()
                              : <span className="text-gray-300">Not started</span>}
                          </p>
                          <p className="text-sm text-gray-300">
                            Completed:{' '}
                            {b.completed_at
                              ? new Date(b.completed_at).toLocaleString()
                              : <span className="text-gray-300">Not completed</span>}
                          </p>
                        </div>

                        {b.cancel_requested_at && (
                          <div className="md:col-span-2 rounded-lg border border-amber-500/50 bg-amber-900/30 p-4">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-200">
                              Cancellation Requested
                            </h3>
                            <p className="mt-2 text-sm text-amber-100">
                              Customer requested cancellation on{' '}
                              {new Date(b.cancel_requested_at).toLocaleString()}.
                            </p>
                            {b.cancel_request_reason && (
                              <p className="mt-2 text-sm text-amber-100">
                                <span className="font-semibold">Reason:</span>{' '}
                                {b.cancel_request_reason}
                              </p>
                            )}

                            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                              <div className="flex-1">
                                <label
                                  htmlFor={`credit-${b.id}`}
                                  className="block text-xs font-medium text-amber-200"
                                >
                                  Account credit to issue (optional)
                                </label>
                                <div className="mt-1 flex items-center">
                                  <span className="rounded-l-lg border border-r-0 border-amber-500/40 bg-black/40 px-3 py-3 text-base text-amber-200">
                                    $
                                  </span>
                                  <input
                                    id={`credit-${b.id}`}
                                    type="number"
                                    inputMode="decimal"
                                    min="0"
                                    step="0.01"
                                    placeholder={`e.g. ${Number(b.deposit_amount).toFixed(2)}`}
                                    value={cancelCreditDraft[b.id] ?? ''}
                                    onChange={(e) =>
                                      setCancelCreditDraft((prev) => ({
                                        ...prev,
                                        [b.id]: e.target.value,
                                      }))
                                    }
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-full rounded-r-lg border border-amber-500/40 bg-black/40 px-3 py-3 text-base text-white placeholder-amber-200/40 focus:border-amber-400 focus:outline-none"
                                  />
                                </div>
                                <p className="mt-1 text-sm text-amber-200/60">
                                  Adds to the customer&apos;s account credit. Auto-applied to next booking.
                                </p>
                              </div>
                              <button
                                type="button"
                                disabled={updatingId === b.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCancelApprove(b.id);
                                }}
                                className="shrink-0 rounded-lg bg-amber-600 px-4 py-3 text-base font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                              >
                                {updatingId === b.id ? 'Working…' : 'Approve cancellation'}
                              </button>
                            </div>

                            <div className="mt-4 border-t border-amber-500/30 pt-3">
                              <label
                                htmlFor={`deny-${b.id}`}
                                className="block text-xs font-medium text-amber-200"
                              >
                                Or deny the request (optional note to customer)
                              </label>
                              <div className="mt-1 flex flex-col gap-2 sm:flex-row">
                                <input
                                  id={`deny-${b.id}`}
                                  type="text"
                                  placeholder="e.g. Slot can't be refilled this close to the date"
                                  value={cancelDenyNoteDraft[b.id] ?? ''}
                                  onChange={(e) =>
                                    setCancelDenyNoteDraft((prev) => ({
                                      ...prev,
                                      [b.id]: e.target.value,
                                    }))
                                  }
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex-1 rounded-lg border border-amber-500/40 bg-black/40 px-3 py-3 text-base text-white placeholder-amber-200/40 focus:border-amber-400 focus:outline-none"
                                />
                                <button
                                  type="button"
                                  disabled={updatingId === b.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCancelDeny(b.id);
                                  }}
                                  className="shrink-0 rounded-lg border border-amber-500/40 bg-black/30 px-4 py-3 text-base font-semibold text-amber-200 hover:bg-amber-900/40 disabled:opacity-50"
                                >
                                  Deny request
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {b.status === 'pending' && (
                          <div className="md:col-span-2">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-300">
                              Approval
                            </h3>
                            <p className="mt-2 text-sm text-gray-300">
                              Approving sends the customer a deposit payment link.
                              Declining frees the slot.
                            </p>
                            <textarea
                              value={declineReasonDraft[b.id] ?? ''}
                              onChange={(e) =>
                                setDeclineReasonDraft((prev) => ({
                                  ...prev,
                                  [b.id]: e.target.value,
                                }))
                              }
                              placeholder="Optional decline reason (only sent if you decline)"
                              rows={2}
                              className="mt-3 w-full rounded-lg border border-gray-600 bg-gray-800 px-4 py-3 text-base text-white placeholder-gray-500 focus:border-red-500 focus:outline-none sm:max-w-md"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={updatingId === b.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleApprove(b.id);
                                }}
                                className="flex-1 rounded-lg bg-green-600 px-4 py-3 text-base font-semibold text-white hover:bg-green-700 disabled:opacity-50 sm:flex-none"
                              >
                                {updatingId === b.id ? 'Approving…' : 'Approve'}
                              </button>
                              <button
                                type="button"
                                disabled={updatingId === b.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDecline(b.id);
                                }}
                                className="flex-1 rounded-lg border border-red-600 px-4 py-3 text-base font-semibold text-red-400 hover:bg-red-900/30 disabled:opacity-50 sm:flex-none"
                              >
                                {updatingId === b.id ? 'Declining…' : 'Decline'}
                              </button>
                            </div>
                          </div>
                        )}

                        {b.status === 'declined' && (
                          <div className="md:col-span-2 rounded-lg border border-red-700 bg-red-900/20 p-4">
                            <p className="text-sm font-semibold text-red-300">Declined</p>
                            {b.decline_reason && (
                              <p className="mt-1 text-sm text-red-200">
                                Reason: {b.decline_reason}
                              </p>
                            )}
                            {b.declined_at && (
                              <p className="mt-1 text-xs text-red-300/80">
                                {new Date(b.declined_at).toLocaleString()}
                              </p>
                            )}
                          </div>
                        )}

                        {b.status === 'approved' && b.payment_url && (
                          <div className="md:col-span-2 rounded-lg border border-blue-700 bg-blue-900/20 p-4">
                            <p className="text-sm font-semibold text-blue-300">
                              Awaiting customer deposit
                            </p>
                            <p className="mt-1 text-xs text-blue-200/80">
                              Customer can pay via the booking confirmation page or this link:
                            </p>
                            <a
                              href={b.payment_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="mt-2 block break-all text-xs text-blue-400 underline"
                            >
                              {b.payment_url}
                            </a>
                          </div>
                        )}

                        {b.status !== 'pending' && b.status !== 'declined' && (
                          <div className="md:col-span-2">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-300">
                              Stage
                            </h3>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {getStagesForBooking(b.addons).map((s) => {
                                const isCurrent = normalizeStage(b.booking_stage) === s;
                                const isUpdating = updatingId === b.id;
                                return (
                                  <button
                                    key={s}
                                    disabled={isUpdating || isCurrent}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStageChange(b.id, s);
                                    }}
                                    className={`rounded-full px-3 py-1 text-xs transition-colors ${
                                      isCurrent
                                        ? 'bg-red-600 text-white'
                                        : 'border border-gray-600 text-gray-300 hover:bg-gray-800'
                                    } disabled:opacity-50`}
                                  >
                                    {isUpdating && !isCurrent ? 'Saving…' : STAGE_LABELS[s]}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <div className="md:col-span-2 mt-2 border-t border-gray-800 pt-4">
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-red-500">
                            Danger zone
                          </h3>
                          <p className="mt-2 text-xs text-gray-300">
                            Permanently deletes the booking row. Use for test data or duplicates only.
                          </p>
                          <button
                            type="button"
                            disabled={updatingId === b.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(b.id);
                            }}
                            className="mt-3 rounded-lg border border-red-700 px-4 py-3 text-sm font-medium text-red-400 hover:bg-red-900/30 disabled:opacity-50"
                          >
                            {updatingId === b.id ? 'Deleting…' : 'Delete booking'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

function slotKeyToLabel(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
