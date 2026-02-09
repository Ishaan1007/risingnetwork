-- Meetings schema for Google Meet integration
-- Run in Supabase SQL editor

-- Drop existing policies first
drop policy if exists "Meetings read" on meetings;
drop policy if exists "Meetings insert" on meetings;
drop policy if exists "Meetings update" on meetings;
drop policy if exists "Meeting participants read" on meeting_participants;
drop policy if exists "Meeting participants insert" on meeting_participants;
drop policy if exists "Meeting participants update" on meeting_participants;

-- Drop existing tables
drop table if exists meeting_participants cascade;
drop table if exists meetings cascade;

-- Meetings table
create table meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  created_by uuid references profiles(id) on delete cascade,
  scheduled_for timestamptz not null default now(),
  duration_minutes int not null default 30,
  meet_link text,
  meeting_type text not null default 'google_meet' check (meeting_type in ('google_meet', 'zoom', 'teams')),
  status text not null default 'scheduled' check (status in ('scheduled', 'ongoing', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Meeting participants table
create table meeting_participants (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid references meetings(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  status text not null default 'invited' check (status in ('invited', 'accepted', 'declined', 'joined')),
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  unique (meeting_id, user_id)
);

-- Enable RLS
alter table meetings enable row level security;
alter table meeting_participants enable row level security;

-- Meetings policies
create policy "Meetings read"
  on meetings for select
  using (
    created_by = auth.uid()
    or exists (
      select 1
      from meeting_participants mp
      where mp.meeting_id = meetings.id
        and mp.user_id = auth.uid()
        and mp.status = 'accepted'
    )
  );

create policy "Meetings insert"
  on meetings for insert
  with check (
    auth.uid() = created_by
  );

create policy "Meetings update"
  on meetings for update
  using (
    auth.uid() = created_by
  );

-- Meeting participants policies
create policy "Meeting participants read"
  on meeting_participants for select
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from meetings m
      where m.id = meeting_participants.meeting_id
        and m.created_by = auth.uid()
    )
  );

create policy "Meeting participants insert"
  on meeting_participants for insert
  with check (
    -- Creator can add participants
    exists (
      select 1
      from meetings m
      where m.id = meeting_participants.meeting_id
        and m.created_by = auth.uid()
    )
    -- Users can accept invitations
    or user_id = auth.uid()
  );

create policy "Meeting participants update"
  on meeting_participants for update
  using (
    user_id = auth.uid()
  )
  with check (
    user_id = auth.uid()
  );

-- Indexes for better performance
create index idx_meetings_created_by on meetings(created_by);
create index idx_meetings_scheduled_for on meetings(scheduled_for);
create index idx_meeting_participants_meeting_id on meeting_participants(meeting_id);
create index idx_meeting_participants_user_id on meeting_participants(user_id);

-- Trigger to update updated_at timestamp
create trigger update_meetings_updated_at
  before update on meetings
  for each row
  execute function update_updated_at_column();

create trigger update_meeting_participants_updated_at
  before update on meeting_participants
  for each row
  execute function update_updated_at_column();
