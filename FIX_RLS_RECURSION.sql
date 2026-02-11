-- Fix infinite recursion in team_members RLS policy
-- Run this in Supabase SQL Editor

-- Drop the problematic policy
drop policy if exists "Team members read" on team_members;

-- Create a new policy without recursion
create policy "Team members read"
  on team_members for select
  using (
    user_id = auth.uid()
    or (
      exists (
        select 1
        from teams t
        where t.id = team_members.team_id
          and t.created_by = auth.uid()
      )
    )
  );
