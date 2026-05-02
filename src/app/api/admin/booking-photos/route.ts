import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
  );
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('id', userData.user.id)
    .single();
  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const bookingId = req.nextUrl.searchParams.get('bookingId');
  if (!bookingId) return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 });

  const { data: rows, error: rowsError } = await supabaseAdmin
    .from('booking_photos')
    .select('id, storage_path, created_at')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: true });

  if (rowsError) return NextResponse.json({ error: rowsError.message }, { status: 500 });
  if (!rows || rows.length === 0) return NextResponse.json({ photos: [] });

  const photos = await Promise.all(
    rows.map(async (row) => {
      const { data: signed } = await supabaseAdmin.storage
        .from('booking-photos')
        .createSignedUrl(row.storage_path, 3600);

      // Path: {userId}/{bookingId}/{slotKey}-{timestamp}.{ext}
      const filename = row.storage_path.split('/').pop() ?? '';
      const slotKey = filename.replace(/-\d+\.[^.]+$/, '');

      return {
        id: row.id,
        slotKey,
        signedUrl: signed?.signedUrl ?? null,
      };
    })
  );

  return NextResponse.json({ photos });
}
