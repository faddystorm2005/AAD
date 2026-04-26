import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { deleteBookingFromGoogle, findAdminUserId } from '@/lib/googleCalendar';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface DeleteBody {
  bookingId: string;
}

// Customers may only delete bookings in these statuses. Active money/work
// statuses (approved, confirmed, in_progress) are admin-only to delete.
const CUSTOMER_DELETABLE = new Set(['pending', 'declined', 'completed']);

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const accessToken = authHeader?.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : null;

  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
  );

  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = userData.user.id;

  const body = (await req.json().catch(() => null)) as DeleteBody | null;
  if (!body?.bookingId) {
    return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 });
  }

  // Look up the booking + caller's admin flag in parallel.
  const [{ data: booking, error: getErr }, { data: profile }] = await Promise.all([
    supabaseAdmin
      .from('bookings')
      .select('id, user_id, status')
      .eq('id', body.bookingId)
      .single(),
    supabaseAdmin.from('profiles').select('is_admin').eq('id', userId).single(),
  ]);

  if (getErr || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  const isAdmin = Boolean(profile?.is_admin);
  const isOwner = booking.user_id === userId;

  if (!isAdmin) {
    if (!isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!CUSTOMER_DELETABLE.has(booking.status)) {
      return NextResponse.json(
        {
          error: `Bookings in status "${booking.status}" can only be removed by an admin. Contact us if you need to cancel.`,
        },
        { status: 403 }
      );
    }
  }

  // Remove from Google Calendar BEFORE deleting the row (we need the
  // google_event_id which lives on the booking).
  const adminId = await findAdminUserId();
  if (adminId) {
    await deleteBookingFromGoogle(adminId, body.bookingId);
  }

  const { error: deleteErr } = await supabaseAdmin
    .from('bookings')
    .delete()
    .eq('id', body.bookingId);

  if (deleteErr) {
    return NextResponse.json({ error: deleteErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
