'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

type StalledBooking = {
  id: string;
  first_name: string;
  completed_at: string;
  hours_stalled: number;
  photo_permission: boolean;
  email_present: boolean;
};

type HealthResponse = {
  count: number;
  stalled: StalledBooking[];
};

/**
 * Small at-a-glance card on the admin page that surfaces bookings whose
 * review-request email never went out (more than 48h after they were
 * marked completed). v1 is read-only: no retry button. The presence of
 * the email on file is reported as a boolean, not the address itself,
 * because triage doesn't need PII.
 */
export function ReviewRequestHealth() {
  const { session } = useAuth();
  const [data, setData] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!session?.access_token) return;
    let cancelled = false;
    fetch('/api/admin/system-health/review-requests', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [session?.access_token]);

  if (error) {
    return (
      <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-base text-amber-100">
        Health check failed to load: {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-900 p-4 text-base text-gray-200">
        Checking review request health...
      </div>
    );
  }

  if (data.count === 0) {
    return (
      <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 text-base text-emerald-100">
        All review requests are caught up.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4">
      <button
        type="button"
        className="flex w-full items-center justify-between py-3 text-left text-base font-semibold text-red-100"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span>
          {data.count} stalled review request{data.count === 1 ? '' : 's'}
        </span>
        <span className="text-red-300">{expanded ? 'Hide' : 'Show'}</span>
      </button>

      {expanded && (
        <ul className="mt-3 space-y-2">
          {data.stalled.map((b) => (
            <li
              key={b.id}
              className="flex flex-col gap-1 rounded-md bg-black/30 px-3 py-3 text-base text-gray-200"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 break-words font-medium">{b.first_name}</span>
                <span className="shrink-0 text-gray-300">
                  {b.hours_stalled}h stalled
                </span>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-base text-gray-300">
                <span>
                  Completed:{' '}
                  {new Date(b.completed_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    timeZone: 'America/Phoenix',
                  })}
                </span>
                <span>
                  Email on file: {b.email_present ? 'yes' : 'no'}
                </span>
                <span className="font-mono text-base text-gray-300">
                  {b.id.slice(0, 8)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
