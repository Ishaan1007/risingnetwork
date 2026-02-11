-- Fix all team-related database issues
-- Run this in Supabase SQL Editor

-- 1. Add missing description column
ALTER TABLE teams ADD COLUMN IF NOT EXISTS description text;

-- 2. Drop problematic RLS policies
DROP POLICY IF EXISTS "Teams read" ON teams;
DROP POLICY IF EXISTS "Teams insert" ON teams;
DROP POLICY IF EXISTS "Teams update" ON teams;
DROP POLICY IF EXISTS "Team members read" ON team_members;
DROP POLICY IF EXISTS "Team members insert" ON team_members;
DROP POLICY IF EXISTS "Team members update" ON team_members;

-- 3. Create simple working policies
CREATE POLICY "Teams read" ON teams FOR SELECT USING (
  auth.uid() IS NOT NULL
);

CREATE POLICY "Teams insert" ON teams FOR INSERT WITH CHECK (
  true
);

CREATE POLICY "Teams update" ON teams FOR UPDATE USING (
  auth.uid() = created_by
);

CREATE POLICY "Team members read" ON team_members FOR SELECT USING (
  user_id = auth.uid()
);

CREATE POLICY "Team members insert" ON team_members FOR INSERT WITH CHECK (
  user_id = auth.uid()
);

CREATE POLICY "Team members update" ON team_members FOR UPDATE USING (
  user_id = auth.uid()
);

-- 4. Check if tables exist and have correct structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name IN ('teams', 'team_members') 
ORDER BY table_name, ordinal_position;
