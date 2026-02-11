-- Add missing description column to teams table
-- Run this in Supabase SQL Editor

ALTER TABLE teams ADD COLUMN IF NOT EXISTS description text;
