import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Photo retention cron job. Runs nightly via Vercel cron.
 *
 * Retention rules:
 * - Declined bookings: photos deleted 7 days after declined_at
 * - All other bookings: photos deleted 30 days after bookings.created_at
 *
 * Auth: requires Bearer token matching CRON_SECRET env var.
 * Vercel cron sends this automatically when configured.
 */
export async function GET(req: NextRequest) {
  // Auth: shared-secret check
  const authHeader = req.headers.get('authorization');
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let totalDeleted = 0;
  const errors: string[] = [];

  // Helper: delete a single photo (storage + DB row), logs errors
  const deletePhoto = async (photoId: string, storagePath: string) => {
    try {
      // Delete from storage first
      const { error: storageError } = await supabaseAdmin.storage
        .from('booking-photos')
        .remove([storagePath]);
      if (storageError) {
        // Continue even if storage delete fails - we still want the DB row gone
        errors.push(`Storage delete failed for ${storagePath}: ${storageError.message}`);
      }

      // Delete the DB row
      const { error: dbError } = await supabaseAdmin
        .from('booking_photos')
        .delete()
        .eq('id', photoId);
      if (dbError) {
        errors.push(`DB delete failed for ${photoId}: ${dbError.message}`);
        return false;
      }
      return true;
    } catch (err: any) {
      errors.push(`Unexpected error for ${photoId}: ${err.message}`);
      return false;
    }
  };

  // QUERY 1: Declined bookings, 7-day retention
  // Photos for declined bookings where declined_at < 7 days ago
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: declinedPhotos, error: declinedError } = await supabaseAdmin
    .from('booking_photos')
    .select('id, storage_path, bookings!inner(status, declined_at)')
    .eq('bookings.status', 'declined')
    .lt('bookings.declined_at', sevenDaysAgo);

  if (declinedError) {
    return NextResponse.json(
      { error: `Declined query failed: ${declinedError.message}` },
      { status: 500 }
    );
  }

  if (declinedPhotos && declinedPhotos.length > 0) {
    for (const photo of declinedPhotos) {
      const success = await deletePhoto(photo.id, photo.storage_path);
      if (success) totalDeleted++;
    }
  }

  // QUERY 2: All non-declined bookings, 30-day retention
  // Photos for non-declined bookings where bookings.created_at < 30 days ago
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: oldPhotos, error: oldError } = await supabaseAdmin
    .from('booking_photos')
    .select('id, storage_path, bookings!inner(status, created_at)')
    .neq('bookings.status', 'declined')
    .lt('bookings.created_at', thirtyDaysAgo);

  if (oldError) {
    return NextResponse.json(
      { error: `Old photos query failed: ${oldError.message}` },
      { status: 500 }
    );
  }

  if (oldPhotos && oldPhotos.length > 0) {
    for (const photo of oldPhotos) {
      const success = await deletePhoto(photo.id, photo.storage_path);
      if (success) totalDeleted++;
    }
  }

  return NextResponse.json({
    success: true,
    totalDeleted,
    errors: errors.length > 0 ? errors : undefined,
    timestamp: new Date().toISOString(),
  });
}
