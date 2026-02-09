-- Chat schema with realtime-ready tables and RLS
-- Run in Supabase SQL editor
-- Note: teams.id is int8 (bigint), so team_id must match.
--
-- If you already ran an older version with team_id as uuid, drop and recreate
-- the conversations table, or run: ALTER TABLE conversations ALTER COLUMN team_id TYPE int8;

create extension if not exists "pgcrypto";

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('direct', 'team')),
  direct_user_a uuid,
  direct_user_b uuid,
  team_id int8 references teams(id) on delete cascade,
  created_by uuid not null references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint conversations_direct_or_team check (
    (type = 'direct' and direct_user_a is not null and direct_user_b is not null and team_id is null)
    or (type = 'team' and team_id is not null and direct_user_a is null and direct_user_b is null)
  )
);

create unique index if not exists conversations_direct_unique
  on conversations (direct_user_a, direct_user_b)
  where type = 'direct';

create unique index if not exists conversations_team_unique
  on conversations (team_id)
  where type = 'team';

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid references profiles(id) on delete set null,
  content text,
  type text not null default 'text' check (type in ('text', 'poll')),
  poll_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists polls (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  question text not null,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  is_closed boolean not null default false
);

create table if not exists poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references polls(id) on delete cascade,
  option_text text not null
);

create table if not exists poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references polls(id) on delete cascade,
  option_id uuid not null references poll_options(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (poll_id, user_id)
);

alter table conversations enable row level security;
alter table messages enable row level security;
alter table polls enable row level security;
alter table poll_options enable row level security;
alter table poll_votes enable row level security;

create or replace function is_connected(user_a uuid, user_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from connections
    where status = 'accepted'
      and (
        (requester_id = user_a and recipient_id = user_b)
        or (requester_id = user_b and recipient_id = user_a)
      )
  );
$$;

create or replace function is_team_member(p_team_id int8, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from team_members
    where team_id = p_team_id
      and user_id = p_user_id
      and status = 'accepted'
  );
$$;

create or replace function can_access_conversation(p_conversation_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from conversations c
    where c.id = p_conversation_id
      and (
        (c.type = 'direct'
          and p_user_id in (c.direct_user_a, c.direct_user_b)
          and is_connected(c.direct_user_a, c.direct_user_b)
        )
        or (c.type = 'team' and is_team_member(c.team_id, p_user_id))
      )
  );
$$;

create policy "Conversations read"
  on conversations for select
  using (can_access_conversation(id, auth.uid()));

create policy "Conversations insert"
  on conversations for insert
  with check (
    auth.uid() is not null and (
      (type = 'direct'
        and auth.uid() in (direct_user_a, direct_user_b)
        and is_connected(direct_user_a, direct_user_b)
      )
      or (type = 'team'
        and auth.uid() = created_by
        and is_team_member(team_id, auth.uid())
      )
    )
  );

create policy "Messages read"
  on messages for select
  using (can_access_conversation(conversation_id, auth.uid()));

create policy "Messages insert"
  on messages for insert
  with check (
    auth.uid() = sender_id
    and can_access_conversation(conversation_id, auth.uid())
  );

create policy "Polls read"
  on polls for select
  using (can_access_conversation(conversation_id, auth.uid()));

create policy "Polls insert"
  on polls for insert
  with check (
    auth.uid() = created_by
    and can_access_conversation(conversation_id, auth.uid())
  );

create policy "Poll options read"
  on poll_options for select
  using (
    exists (
      select 1
      from polls p
      where p.id = poll_id
        and can_access_conversation(p.conversation_id, auth.uid())
    )
  );

create policy "Poll options insert"
  on poll_options for insert
  with check (
    exists (
      select 1
      from polls p
      where p.id = poll_id
        and p.created_by = auth.uid()
        and can_access_conversation(p.conversation_id, auth.uid())
    )
  );

create policy "Poll votes read"
  on poll_votes for select
  using (
    exists (
      select 1
      from polls p
      where p.id = poll_id
        and can_access_conversation(p.conversation_id, auth.uid())
    )
  );

create policy "Poll votes insert"
  on poll_votes for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from polls p
      where p.id = poll_id
        and can_access_conversation(p.conversation_id, auth.uid())
    )
  );

create policy "Poll votes update"
  on poll_votes for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
