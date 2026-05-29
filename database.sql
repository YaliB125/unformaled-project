-- Enable pgcrypto for UUID generation (Supabase supports this)
create extension if not exists "pgcrypto";

-- 1) User profiles linked to Supabase auth.users
create table if not exists profiles (
  id uuid primary key references auth.users(id),
  full_name text,
  email text,
  role text,           -- owner | admin | member
  avatar_url text,
  locale text,
  created_at timestamptz default now()
);

-- 2) Teams / workspaces
create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  description text,
  slug text unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_teams_owner_id on teams(owner_id);

-- 3) Team members and invitations
create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null default 'member',    -- owner | admin | member
  status text not null default 'accepted', -- accepted | invited | pending
  invited_by uuid references profiles(id),
  accepted_at timestamptz,
  created_at timestamptz default now(),
  unique(team_id, user_id)
);

create index if not exists idx_team_members_team_id on team_members(team_id);
create index if not exists idx_team_members_user_id on team_members(user_id);

-- 4) Team folders
create table if not exists team_folders (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  name text not null,
  description text,
  parent_folder_id uuid references team_folders(id) on delete set null,
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_team_folders_team_id on team_folders(team_id);

-- 5) Team saved activities / workspace activity copies
create table if not exists team_saved_activities (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  folder_id uuid references team_folders(id) on delete set null,
  activity_id uuid not null, -- marketplace activity id
  saved_by uuid references profiles(id),
  is_favorite boolean default false,
  snapshot jsonb default '{}'::jsonb,
  title text,
  content text,
  metadata jsonb default '{}'::jsonb,
  latest_editor uuid references profiles(id),
  last_edited_at timestamptz default now(),
  created_at timestamptz default now()
);

create index if not exists idx_team_saved_activities_team_id on team_saved_activities(team_id);
create index if not exists idx_team_saved_activities_folder_id on team_saved_activities(folder_id);

-- 6) Revision history for collaborative edits
create table if not exists team_activity_revisions (
  id uuid primary key default gen_random_uuid(),
  saved_activity_id uuid not null references team_saved_activities(id) on delete cascade,
  editor_id uuid not null references profiles(id),
  title text,
  content text,
  change_note text,
  created_at timestamptz default now()
);

create index if not exists idx_team_activity_revisions_saved_activity_id on team_activity_revisions(saved_activity_id);