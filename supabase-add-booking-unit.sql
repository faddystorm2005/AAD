-- Migration: add unit column to bookings table
-- Stores apartment/suite/unit number separately from street address
-- Existing rows keep unit info baked into the address column
-- New bookings split unit out into this column

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS unit text;
