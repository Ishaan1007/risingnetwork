-- Projects board schema with RLS
-- Run in Supabase SQL editor

create extension if not exists "pgcrypto";

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  skills text[] not null default '{}',
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists project_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  message text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);

create index if not exists projects_created_at_idx on projects (created_at desc);
create index if not exists project_requests_project_idx on project_requests (project_id);
create index if not exists project_requests_user_idx on project_requests (user_id);

alter table projects enable row level security;
alter table project_requests enable row level security;

-- Policies
create policy "Projects read"
  on projects for select
  using (true);

create policy "Projects insert admin only"
  on projects for insert
  with check (
    auth.uid() is not null
    and (auth.jwt() ->> 'email') in ('ishaanjain4u@gmail.com', 'iashjain1@gmail.com')
  );

create policy "Projects update admin only"
  on projects for update
  using ((auth.jwt() ->> 'email') in ('ishaanjain4u@gmail.com', 'iashjain1@gmail.com'))
  with check ((auth.jwt() ->> 'email') in ('ishaanjain4u@gmail.com', 'iashjain1@gmail.com'));

create policy "Projects delete admin only"
  on projects for delete
  using ((auth.jwt() ->> 'email') in ('ishaanjain4u@gmail.com', 'iashjain1@gmail.com'));

create policy "Project requests insert"
  on project_requests for insert
  with check (auth.uid() = user_id);

create policy "Project requests read own"
  on project_requests for select
  using (
    auth.uid() = user_id
    or (auth.jwt() ->> 'email') in ('ishaanjain4u@gmail.com', 'iashjain1@gmail.com')
  );

create policy "Project requests update admin only"
  on project_requests for update
  using ((auth.jwt() ->> 'email') in ('ishaanjain4u@gmail.com', 'iashjain1@gmail.com'))
  with check ((auth.jwt() ->> 'email') in ('ishaanjain4u@gmail.com', 'iashjain1@gmail.com'));
