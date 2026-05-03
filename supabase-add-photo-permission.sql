-- Add photo_permission column to bookings table.
-- Run in Supabase SQL Editor (Dashboard > SQL Editor) before deploying.
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS photo_permission boolean NOT NULL DEFAULT false;
