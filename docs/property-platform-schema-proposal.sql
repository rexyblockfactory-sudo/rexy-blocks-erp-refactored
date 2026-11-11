-- REXY REAL ESTATE / REXY STAYS: PROPERTY SCHEMA RECORD
-- A corresponding additive migration was applied on November 11, 2026 to
-- existing Rexy Supabase project qgyenqihqlcvikcyglxb:
-- create_rexy_property_listings_and_marketing_photos
-- A second additive migration on Nov 11, 2026 relaxed the rule that
-- published sale/rental listings must contain confirmed bedroom/bathroom
-- counts: allow_unconfirmed_room_counts_on_verified_property_listings.
-- Price, authorized photographs, signed-off owner/authority/photo rights,
-- verification note and verified_by remain mandatory for publication.
-- DO NOT REAPPLY THIS DOCUMENT without confirming current migrations/schema.
-- The production SITE (Next.js application) has NOT been updated yet.
-- Review future changes against existing inventory/sales workflows.
--
-- Purpose: keep property listings strictly separate from concrete block
-- inventory, products, website order requests, sales, invoices and payments.
-- Only verified, published listings are visible to the public.
-- Staff-authenticated Next.js API endpoints use service-role credentials
-- server-side AFTER checking user roles (admin/manager) and request origin.
--
-- Long-term rental prices are GH₵ per month; stay prices are GH₵ per night;
-- sale prices are GH₵ asking prices.
--
-- Future phases require separate booking-request & calendar tables, signed
-- tenancy agreements, independent checks and paid transactions approval.

create table if not exists public.property_listings (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 120),
  market text not null check (market in ('sale', 'rent', 'stay')),
  status text not null default 'draft'
    check (status in ('draft','published','archived')),
  title text not null check (length(trim(title)) between 4 and 160),
  description text not null default ''
    check (length(description) <= 6000),
  city text not null check (length(trim(city)) between 2 and 80),
  region text not null check (length(trim(region)) between 2 and 80),
  neighborhood text check (neighborhood is null or length(neighborhood) <= 160),
  construction_status text not null default 'unknown'
    check (construction_status in ('completed','under_construction','unknown')),
  -- Private drafts may lack prices, confirmed bedrooms or confirmed bathrooms.
  price_ghs numeric(14,2) check (price_ghs > 0),
  bedrooms integer check (bedrooms between 0 and 30),
  bathrooms integer check (bathrooms between 0 and 30),
  max_guests integer check (max_guests between 1 and 100),
  amenities text[] not null default array[]::text[]
    check (cardinality(amenities) <= 30),
  photo_urls text[] not null default array[]::text[]
    check (cardinality(photo_urls) <= 16),
  -- No private identity, title deed or document numbers in these fields.
  verification_notes text check (verification_notes is null or length(verification_notes) <= 3000),
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint property_publish_requirements check (
    status <> 'published' or (
      verified_at is not null and verified_by is not null
      and verification_notes is not null
      and length(trim(verification_notes)) >= 30
      and published_at is not null
      and price_ghs is not null and price_ghs > 0
      and length(trim(description)) > 0
      and cardinality(photo_urls) >= 1
      and (market <> 'stay' or max_guests is not null)
    )
  )
);

create index if not exists property_listings_public_idx
  on public.property_listings (market, city, price_ghs, published_at desc)
  where status = 'published' and verified_at is not null;

alter table public.property_listings enable row level security;

-- Explicit column-level SELECT prevents disclosure of confidential
-- verification notes & verifier identity through direct Supabase clients.
revoke all on table public.property_listings from public, anon, authenticated;

grant select (
  id, slug, market, status, title, description, city, region,
  neighborhood, construction_status, price_ghs, bedrooms, bathrooms,
  max_guests, amenities, photo_urls, verified_at, published_at
) on public.property_listings to anon, authenticated;

drop policy if exists property_listings_public_verified_read on public.property_listings;
create policy property_listings_public_verified_read
  on public.property_listings
  for select to anon, authenticated
  using (
    status = 'published' and verified_at is not null
    and verified_by is not null and published_at is not null
  );

-- No public insert/update/delete policies are created, for ANY listing.
-- The server only permits the authenticated admin/manager workflow.
-- Staff photos uploaded for marketing are not ownership or ID documents.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'property-photos', 'property-photos', true, 10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- IMPORTANT: do not grant direct browser write access on storage.objects.
-- The protected /api/property-photos route uses service-role storage
-- uploads only after verifying staff role, photo rights, MIME signature
-- and a 10MB maximum.
--
-- Independently review the actual storage configuration after applying:
-- 1. SELECT pg_policies against property_listings and storage.objects.
-- 2. Anonymous SELECT can see published verified listings only; drafts absent.
-- 3. Authenticated client cannot mutate property_listings.
-- 4. Unauthenticated client cannot upload property photos.
-- 5. Only public-marketing photos belong in this public storage bucket.
-- 6. Archived/unverified listings are absent from public queries.
--
-- The user's uncompleted Kumasi property now exists as an unpublished draft:
-- id 36b7153e-cd8f-4802-b9f9-76ac44fe89d5
-- price GH₵1,500,000; bedroom/bathroom counts unknown; photo upload pending.
-- The seller reports ownership verified, but a signed-in admin must confirm
-- documentation/marketing authority/photo rights via the approval workflow.
-- The property is NOT published and may not be labelled staff-verified yet.
