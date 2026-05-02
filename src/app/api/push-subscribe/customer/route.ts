import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function getAuthUser(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;

  const userClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data } = await userClient.auth.getUser();
  return data?.user ?? null;
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const bookingId = body?.bookingId as string | undefined;
  const sub = body?.subscription as { endpoint: string; keys: { p256dh: string; auth: string } } | undefined;

  if (!bookingId || !sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  // Verify the booking belongs to this user
  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('id')
    .eq('id', bookingId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

  const { error } = await supabaseAdmin
    .from('customer_push_subscriptions')
    .upsert(
      {
        booking_id: bookingId,
        user_id: user.id,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
        user_agent: body?.userAgent ?? null,
      },
      { onConflict: 'booking_id,endpoint' }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const bookingId = body?.bookingId as string | undefined;
  const endpoint = body?.endpoint as string | undefined;
  if (!bookingId || !endpoint) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  await supabaseAdmin
    .from('customer_push_subscriptions')
    .delete()
    .eq('booking_id', bookingId)
    .eq('endpoint', endpoint)
    .eq('user_id', user.id);

  return NextResponse.json({ ok: true });
}
