import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { buildIcs, CalendarEvent } from '@/lib/icsCalendar';
import { ADD_ONS, isCeramicSelected } from '@/lib/bookingPricing';
import { oneOf, type JoinedCustomer, type JoinedVehicle } from '@/lib/bookingJoins';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/calendar?u=<adminUserId>
 *
 * Returns an iCalendar (ICS) feed of upcoming bookings for the admin to
 * subscribe to from Google Calendar.
 *
 * Auth: the user_id passed in `?u=` must belong to a profile with
 * is_admin=true. Supabase auth user IDs are 128-bit UUIDs, so the URL
 * is effectively unguessable. The admin pastes their unique URL into
 * Google Calendar once and Google polls it on its own schedule.
 */
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('u');
  if (!userId) {
    return new NextResponse('Missing ?u parameter', { status: 400 });
  }

  const { data: profile, error: profileErr } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .maybeSingle();

  if (profileErr || !profile?.is_admin) {
    return new NextResponse('Not authorized', { status: 403 });
  }

  // Pull upcoming + recent past bookings (so admin sees today's history too).
  const sinceIso = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString();
  const { data: bookings, error: bookingsErr } = await supabaseAdmin
    .from('bookings')
    .select(
      `id, service, scheduled_at, address, city, state, zip, status, addons,
       customer:profiles!user_id(full_name, phone),
       vehicle:vehicles!vehicle_id(year, make, model, color, nickname)`
    )
    .gte('scheduled_at', sinceIso)
    .neq('status', 'declined')
    .order('scheduled_at', { ascending: true });

  if (bookingsErr) {
    return new NextResponse(`DB error: ${bookingsErr.message}`, { status: 500 });
  }

  const events: CalendarEvent[] = (bookings ?? []).map((b) => {
    const ceramic = isCeramicSelected(b.addons);
    // Ceramic = full day (8h). Everything else ~3h block.
    const duration = ceramic ? 8 : 3;

    const c = oneOf<JoinedCustomer>(b.customer);
    const customer = c?.full_name || 'Customer';
    const v = oneOf<JoinedVehicle>(b.vehicle);
    const vehicleStr = v ? `${v.year} ${v.make} ${v.model}${v.nickname ? ` "${v.nickname}"` : ''}` : 'Vehicle';

    const addonNames =
      (b.addons ?? [])
        .map((id: string) => ADD_ONS.find((a) => a.id === id)?.name ?? id)
        .join(', ') || 'None';

    const phone = c?.phone ? `\nPhone: ${c.phone}` : '';
    const description =
      `${b.service} – ${customer}${phone}\n` +
      `Vehicle: ${vehicleStr}\n` +
      `Add-ons: ${addonNames}\n` +
      `Status: ${b.status}`;

    const status =
      b.status === 'completed'
        ? 'CONFIRMED'
        : b.status === 'pending' || b.status === 'approved'
        ? 'TENTATIVE'
        : 'CONFIRMED';

    return {
      id: b.id,
      scheduledAt: b.scheduled_at,
      durationHours: duration,
      title: `${b.service} – ${customer}`,
      location: `${b.address}, ${b.city}, ${b.state} ${b.zip}`,
      description,
      status,
    };
  });

  const ics = buildIcs(events);

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      // Google polls every few hours; tell it to revalidate within 1h.
      'Cache-Control': 'public, max-age=300, s-maxage=300',
      'Content-Disposition': 'inline; filename="phoenix-auto-detail.ics"',
    },
  });
}
