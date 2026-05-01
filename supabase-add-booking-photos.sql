-- Migration: booking_photos table + storage RLS for booking-photos bucket
--
-- Adds support for customers attaching photos to their bookings.
-- Two layers:
--   1. booking_photos table tracks which photos belong to which booking
--   2. storage.objects RLS controls access to the actual files in the
--      booking-photos bucket
--
-- PRECONDITION: The storage bucket "booking-photos" must already exist
-- in Supabase Dashboard > Storage before running this migration.
-- See accompanying instructions for bucket creation steps.
--
-- Path convention for uploaded files: {user_id}/{booking_id}/{filename}
-- This lets storage RLS check "is the first folder == auth.uid()" to
-- enforce per-user access without joining other tables.

-- ============================================================
-- 1. booking_photos table
-- ============================================================

CREATE TABLE IF NOT EXISTS booking_photos (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id) on delete cascade not null,
  storage_path text not null,
  created_at timestamp with time zone default now()
);

CREATE INDEX IF NOT EXISTS booking_photos_booking_id_idx
  ON booking_photos(booking_id);

ALTER TABLE booking_photos ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. booking_photos RLS policies
-- ============================================================

-- Customers can read photo records from their own bookings.
CREATE POLICY "Users can read own booking photos"
  ON booking_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_photos.booking_id
      AND bookings.user_id = auth.uid()
    )
  );

-- Customers can insert photo records for their own bookings.
CREATE POLICY "Users can insert own booking photos"
  ON booking_photos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_photos.booking_id
      AND bookings.user_id = auth.uid()
    )
  );

-- Customers can delete photo records from their own bookings.
CREATE POLICY "Users can delete own booking photos"
  ON booking_photos FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_photos.booking_id
      AND bookings.user_id = auth.uid()
    )
  );

-- Admin access uses SUPABASE_SERVICE_ROLE_KEY which bypasses RLS,
-- so no explicit admin policy is needed at the table level.

-- ============================================================
-- 3. Storage RLS policies for the booking-photos bucket
-- ============================================================
-- These policies operate on storage.objects, which is the
-- Supabase-managed table backing all buckets. The bucket itself
-- must be created via Dashboard > Storage before these policies
-- have any effect.
--
-- storage.foldername(name) returns the array of folder names from
-- the object path. For path "{user_id}/{booking_id}/{filename}",
-- foldername(name)[1] is the user_id.

-- Customers can upload files into their own user_id folder.
CREATE POLICY "Users can upload own photos to booking-photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'booking-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Customers can read files from their own user_id folder.
CREATE POLICY "Users can read own photos in booking-photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'booking-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Customers can delete files from their own user_id folder.
CREATE POLICY "Users can delete own photos in booking-photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'booking-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Admin reads use service role, which bypasses storage RLS.
-- Display in admin will use signed URLs generated server-side.
