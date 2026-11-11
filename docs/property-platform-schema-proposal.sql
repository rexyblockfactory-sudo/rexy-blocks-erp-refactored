-- REXY REAL ESTATE / REXY STAYS — REVIEW-ONLY SQL PROPOSAL.
-- NOT APPLIED. DO NOT EXECUTE ON PRODUCTION UNTIL REVIEWED BY AN AUTHORIZED ADMIN.
-- In an authenticated Supabase environment, generate a migration with
--   supabase migration new create_property_listings
-- and commit a reviewed migration after security checks.
--
-- This table is strictly separate from inventory, sales, products, website_orders,
-- invoices, payroll and other concrete block ERP data.
--
-- Security model:
--   1. Website visitors may read PUBLISHED AND VERIFIED listings only.
--   2. The public has NO database privileges to create, edit, delete or verify listings.
--   3. Future staff APIs must check signed-in user and profile role on SERVER before
--      using service-role credentials. Never expose service-role secrets to browsers.
--   4. Publish only following ownership/permission verification and approved
--      photos and descriptions. Only approved properties may populate this table.
--   5. No booking confirmations, inventory reservations, deposit/payment writes,
--      or calendar availability are implemented in phase 1.
--
-- Expected Postgres / Supabase SQL (pending verification of existing schema):

create table if not exists public.property_listings (
    id uuid primary key default gen_random_uuid(),
    slug text not null unique
      check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 120),
    market text not null check (market in ('sale', 'stay')),
    status text not null default 'draft' check (status in ('draft','published','archived')),
    title text not null check (length(trim(title)) between 4 and 160),
    description text not null default '',
    city text not null check (length(trim(city)) between 2 and 80),
    region text not null check (length(trim(region)) between 2 and 80),
    neighborhood text,
    price_ghs numeric(14,2) not null check (price_ghs > 0),
    bedrooms integer not null default 0 check (bedrooms between 0 and 20),
    bathrooms integer not null default 0 check (bathrooms between 0 and 20),
    max_guests integer check (max_guests between 1 and 100),
    amenities text[] not null default array[]::text[],
    photo_urls text[] not null default array[]::text[],
    verified_by uuid references auth.users(id),
    verified_at timestamptz,
    published_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint stay_capacity check (market <> 'stay' or max_guests is not null),
    constraint verified_before_publish check (
      status <> 'published' or
      (verified_at is not null and verified_by is not null and published_at is not null)
    )
);

create index if not exists property_listings_public_search_idx
on public.property_listings (market, status, city, price_ghs)
where status = 'published' and verified_at is not null;

create index if not exists property_listings_published_idx
on public.property_listings (published_at desc)
where status = 'published' and verified_at is not null;

alter table public.property_listings enable row level security;

-- Never add an anonymous write policy. Admin CRUD must happen behind separately
-- authenticated, role-checked API endpoints or reviewed, narrowly scoped policies.
revoke all on table public.property_listings from anon, authenticated;
grant select on table public.property_listings to anon, authenticated;

drop policy if exists property_listings_public_verified_read on public.property_listings;
create policy property_listings_public_verified_read
on public.property_listings
for select
to anon, authenticated
using (
  status = 'published'
  and verified_at is not null
  and verified_by is not null
  and published_at is not null
);

-- Staff-only drafts and verification should be handled separately; the public
-- select policy above deliberately does not expose drafts, ownership evidence,
-- private addresses, host IDs, private contact information, or booking records.
--
-- Before adding reservations in a later phase:
--   - create separate private property_booking_requests table with RLS
--   - validate check-out > check-in, guest counts and contact details server-side
--   - add transactional overlap checks, blackout dates and availability calendars
--   - implement explicit review and acceptance by verified staff/hosts
--   - only then consider payments, refunds, identity checks and receipts
--   - never treat a WhatsApp enquiry as a confirmed reservation.
