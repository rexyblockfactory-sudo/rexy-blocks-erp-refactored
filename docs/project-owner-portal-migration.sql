-- REXY PROJECT OWNER PORTAL — add-only schema for project visibility.
-- Separate from blocks, sales, property listings, invoices and inventory.
-- All user-facing access is through server routes using service-role client
-- *after* verifying signed-in identity + membership or staff role.
-- No direct client roles get table data or file listing privileges.

create table public.client_projects (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 4 and 160),
  location text not null check (length(trim(location)) between 2 and 160),
  description text not null default '' check (length(description) <= 5000),
  status text not null default 'planning'
    check (status in ('planning','in_progress','on_hold','completed')),
  progress_percent integer not null default 0 check (progress_percent between 0 and 100),
  start_date date,
  target_date date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.client_project_members (
  project_id uuid not null references public.client_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  added_at timestamptz not null default now(),
  added_by uuid references auth.users(id) on delete set null,
  primary key (project_id, user_id)
);
create index client_project_members_user_idx on public.client_project_members (user_id,project_id);

create table public.client_project_milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.client_projects(id) on delete cascade,
  title text not null check (length(trim(title)) between 3 and 160),
  status text not null default 'pending'
    check (status in ('pending','in_progress','completed')),
  due_date date,
  sort_order integer not null default 0 check (sort_order between 0 and 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index client_project_milestones_order_idx on public.client_project_milestones (project_id,sort_order,created_at);

create table public.client_project_updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.client_projects(id) on delete cascade,
  heading text not null check (length(trim(heading)) between 4 and 160),
  details text not null check (length(trim(details)) between 10 and 5000),
  progress_percent integer not null check (progress_percent between 0 and 100),
  is_visible boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index client_project_updates_feed_idx on public.client_project_updates (project_id,created_at desc);

create table public.client_project_photos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.client_projects(id) on delete cascade,
  storage_path text not null unique check (length(storage_path) <= 500),
  caption text not null default '' check (length(caption) <= 240),
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index client_project_photos_project_idx on public.client_project_photos (project_id,created_at desc);

alter table public.client_projects enable row level security;
alter table public.client_project_members enable row level security;
alter table public.client_project_milestones enable row level security;
alter table public.client_project_updates enable row level security;
alter table public.client_project_photos enable row level security;

-- Unlike public marketing photos, progress images are private.
-- No direct anon or authenticated SQL privileges to these tables.
revoke all on public.client_projects, public.client_project_members,
  public.client_project_milestones, public.client_project_updates,
  public.client_project_photos from public, anon, authenticated;

grant all on public.client_projects, public.client_project_members,
  public.client_project_milestones, public.client_project_updates,
  public.client_project_photos to service_role;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('client-project-media','client-project-media',false,8388608,
  array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- Deliberately do NOT add public storage.objects policies for this bucket.
-- Server grants short-lived signed URLs only after verifying project membership.
-- Owner accounts are created via approved invitation; no public signup
-- automatically enrolls a user into client_project_members.
-- Do not seed fake projects or memberships.
