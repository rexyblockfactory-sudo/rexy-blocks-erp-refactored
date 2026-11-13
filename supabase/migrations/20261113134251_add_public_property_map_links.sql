alter table public.property_listings
  add column if not exists map_url text check (map_url is null or length(map_url) <= 2048);

grant select (map_url) on public.property_listings to anon, authenticated;

-- Owner supplied a map viewport, not an exact property pin.
update public.property_listings
set map_url = 'https://www.google.com/maps/@?api=1&map_action=map&center=6.7301034%2C-1.7082904&zoom=17',
    updated_at = now()
where id = '36b7153e-cd8f-4802-b9f9-76ac44fe89d5'
  and slug = 'uncompleted-modern-residence-kumasi'
  and market = 'sale' and status = 'published' and verified_at is not null
  and map_url is null;
