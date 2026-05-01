-- Migration: add service_type column to bookings table
--
-- Adds support for three service types: exterior-only, interior-only,
-- and full detail. Existing bookings retroactively classify as
-- full_detail (which is what they actually were when booked, since
-- that was the only option).
--
-- The CHECK constraint enforces valid values at the database layer.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS service_type text NOT NULL DEFAULT 'full_detail';

ALTER TABLE bookings
  ADD CONSTRAINT bookings_service_type_check
  CHECK (service_type IN ('exterior', 'interior', 'full_detail'));
