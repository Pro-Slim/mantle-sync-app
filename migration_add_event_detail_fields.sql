-- Migration: add Requirements/Winner Criteria detail fields, Winners Pine, and Remarks
-- Paste into Supabase SQL Editor and run once against your existing events table.

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS requirements_details TEXT,
  ADD COLUMN IF NOT EXISTS winner_criteria_details TEXT,
  ADD COLUMN IF NOT EXISTS winners_pine TEXT,
  ADD COLUMN IF NOT EXISTS remarks TEXT;
