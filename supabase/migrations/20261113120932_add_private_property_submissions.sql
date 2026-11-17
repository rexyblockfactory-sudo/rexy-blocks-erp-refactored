-- Public form writes are mediated by the server. Contact data and originals never enter the public catalogue.
create table public.property_submissions (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default ('RXP-' || upper(replace(gen_random_uuid()::text, '-', ''))),
  contact_name text not null check (length(contact_name) between 2 and 100),
  contact_phone text not null check (length(contact_phone) between 7 and 30),
  property_data jsonb not null check (jsonb_typeof(property_data) = 'object'),
  photo_paths text[] not null default '{}' check (cardinality(photo_paths) <= 3),
  status text not null default 'pending' check (status in ('pending','changes_requested','rejected','draft_created')),
  review_notes text check (length(review_notes) <= 1500),
  reviewed_by uuid references auth.users(id) on delete set null,
  listing_id uuid unique references public.property_listings(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'draft_created') = (listing_id is not null))
);
create index property_submissions_queue_idx on public.property_submissions(status, created_at desc, id desc);
alter table public.property_submissions enable row level security;
revoke all on public.property_submissions from public, anon, authenticated;
grant select, insert, update on public.property_submissions to service_role;

-- Atomic fixed-window limits, keyed by a server-side digest rather than storing IP addresses.
create table public.property_submission_limits (
  client_key text primary key,
  window_started_at timestamptz not null,
  attempt_count integer not null check (attempt_count > 0)
);
create index property_submission_limits_window_idx on public.property_submission_limits(window_started_at);
alter table public.property_submission_limits enable row level security;
revoke all on public.property_submission_limits from public, anon, authenticated;
grant select, insert, update, delete on public.property_submission_limits to service_role;

create function public.consume_property_submission_limit(p_key text)
returns boolean language plpgsql security invoker set search_path = ''
as $$
declare v_count integer;
begin
  if p_key is null or p_key !~ '^[a-f0-9]{64}$' then return false; end if;
  delete from public.property_submission_limits where window_started_at < now() - interval '2 days';
  insert into public.property_submission_limits(client_key, window_started_at, attempt_count)
  values (p_key, now(), 1)
  on conflict (client_key) do update
    set window_started_at = case when public.property_submission_limits.window_started_at < now() - interval '1 hour'
      then now() else public.property_submission_limits.window_started_at end,
    attempt_count = case when public.property_submission_limits.window_started_at < now() - interval '1 hour'
      then 1 else public.property_submission_limits.attempt_count + 1 end
  where public.property_submission_limits.window_started_at < now() - interval '1 hour'
     or public.property_submission_limits.attempt_count < 8
  returning attempt_count into v_count;
  return v_count is not null;
end;
$$;
revoke execute on function public.consume_property_submission_limit(text) from public, anon, authenticated;
grant execute on function public.consume_property_submission_limit(text) to service_role;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('property-submission-photos','property-submission-photos',false,3145728,array['image/webp']);

-- Atomically turn one reviewed submission into one draft, without publishing
-- or copying contact details, raw storage paths or review notes into the listing.
create function public.create_listing_from_property_submission(p_submission_id uuid, p_reviewer_id uuid)
returns uuid language plpgsql security invoker set search_path = ''
as $$
declare
  v_source public.property_submissions%rowtype;
  v_listing uuid := gen_random_uuid();
  v_data jsonb;
  v_slug text;
  v_photos text[];
begin
  if not exists(select 1 from public.profiles where id=p_reviewer_id and role in ('admin','manager')) then
    raise exception using errcode='42501', message='Property staff access required.';
  end if;
  select * into v_source from public.property_submissions where id=p_submission_id for update;
  if not found then raise exception using errcode='P0002', message='Submission not found.'; end if;
  if v_source.listing_id is not null then return v_source.listing_id; end if;
  if v_source.status not in ('pending','changes_requested') then
    raise exception using errcode='22023', message='Submission is no longer available for a draft.';
  end if;
  v_data := v_source.property_data;
  v_slug := trim(both '-' from left(regexp_replace(lower(v_data->>'title'), '[^a-z0-9]+', '-', 'g'), 80));
  v_slug := coalesce(nullif(v_slug,''),'property') || '-' || left(v_source.id::text,8);
  select coalesce(array_agg('/api/property-listing-media/' || v_listing::text || '/' || n order by n), '{}')
    into v_photos from generate_series(0, cardinality(v_source.photo_paths)-1) as n;
  insert into public.property_listings
    (id,slug,market,status,title,description,city,region,neighborhood,construction_status,price_ghs,bedrooms,bathrooms,max_guests,photo_urls)
  values
    (v_listing,v_slug,v_data->>'market','draft',v_data->>'title',v_data->>'description',
     v_data->>'city',v_data->>'region',nullif(v_data->>'neighborhood',''),v_data->>'construction_status',
     (v_data->>'price_ghs')::numeric,(v_data->>'bedrooms')::integer,(v_data->>'bathrooms')::integer,
     (v_data->>'max_guests')::integer,v_photos);
  update public.property_submissions set listing_id=v_listing,status='draft_created',reviewed_by=p_reviewer_id,updated_at=now()
  where id=p_submission_id;
  return v_listing;
end;
$$;
revoke execute on function public.create_listing_from_property_submission(uuid,uuid) from public,anon,authenticated;
grant execute on function public.create_listing_from_property_submission(uuid,uuid) to service_role;
