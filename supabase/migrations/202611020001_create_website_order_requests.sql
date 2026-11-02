-- Website order requests are kept separate from ERP sales.
-- Applying this migration is a separate, explicitly approved deployment step.
create table if not exists public.website_order_requests (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default (
    'WEB-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))
  ),
  customer_name text not null check (char_length(trim(customer_name)) between 2 and 100),
  customer_phone text not null check (char_length(trim(customer_phone)) between 7 and 30),
  product_id uuid null references public.products(id) on delete set null,
  product_name text not null check (char_length(trim(product_name)) between 1 and 150),
  product_size text null check (product_size is null or char_length(product_size) <= 80),
  quantity integer not null check (quantity > 0 and quantity <= 1000000),
  fulfilment_type text not null check (fulfilment_type in ('Delivery', 'Factory pickup')),
  fulfilment_location text null check (fulfilment_location is null or char_length(fulfilment_location) <= 180),
  requested_date date null,
  customer_notes text null check (customer_notes is null or char_length(customer_notes) <= 1000),

  status text not null default 'pending_review'
    check (status in ('pending_review', 'awaiting_deposit', 'deposit_received', 'confirmed', 'declined', 'cancelled', 'converted')),

  quoted_subtotal numeric(14,2) null check (quoted_subtotal is null or quoted_subtotal >= 0),
  delivery_charge numeric(14,2) null check (delivery_charge is null or delivery_charge >= 0),
  additional_charges numeric(14,2) not null default 0 check (additional_charges >= 0),
  quoted_total numeric(14,2) null check (quoted_total is null or quoted_total >= 0),
  deposit_percent numeric(5,2) not null default 50 check (deposit_percent > 0 and deposit_percent <= 100),
  deposit_required numeric(14,2) null check (deposit_required is null or deposit_required >= 0),
  amount_paid numeric(14,2) not null default 0 check (amount_paid >= 0),
  balance_due numeric(14,2) null check (balance_due is null or balance_due >= 0),

  staff_notes text null check (staff_notes is null or char_length(staff_notes) <= 2000),
  deposit_verified_at timestamptz null,
  accepted_at timestamptz null,
  accepted_by uuid null references auth.users(id) on delete set null,
  sale_id uuid null references public.sales(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint website_order_quote_consistency check (
    (quoted_total is null and deposit_required is null and balance_due is null)
    or
    (quoted_total is not null and deposit_required is not null and balance_due is not null)
  ),
  constraint website_order_deposit_not_overpaid check (
    quoted_total is null or amount_paid <= quoted_total
  ),
  constraint website_order_confirm_requires_deposit check (
    status not in ('confirmed', 'converted')
    or (deposit_required is not null and amount_paid >= deposit_required and deposit_verified_at is not null and accepted_at is not null and accepted_by is not null)
  )
);

create index if not exists website_order_requests_created_at_idx
  on public.website_order_requests (created_at desc);
create index if not exists website_order_requests_status_idx
  on public.website_order_requests (status, created_at desc);

create table if not exists public.website_order_payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.website_order_requests(id) on delete restrict,
  amount numeric(14,2) not null check (amount > 0),
  payment_method text not null check (char_length(trim(payment_method)) between 2 and 50),
  reference text null check (reference is null or char_length(reference) <= 120),
  notes text null check (notes is null or char_length(notes) <= 500),
  verified_by uuid not null references auth.users(id) on delete restrict,
  verified_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists website_order_payments_order_id_idx
  on public.website_order_payments (order_id, created_at);

create or replace function public.set_website_order_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists website_order_requests_set_updated_at
  on public.website_order_requests;
create trigger website_order_requests_set_updated_at
before update on public.website_order_requests
for each row execute function public.set_website_order_updated_at();

alter table public.website_order_requests enable row level security;
alter table public.website_order_payments enable row level security;

-- Public visitors can submit only unquoted requests. Column-level grants prevent
-- them from setting workflow, quote, payment, staff, or sale fields.
revoke all on public.website_order_requests from anon, authenticated;
grant insert (
  customer_name,
  customer_phone,
  product_id,
  product_name,
  product_size,
  quantity,
  fulfilment_type,
  fulfilment_location,
  requested_date,
  customer_notes
) on public.website_order_requests to anon;

drop policy if exists website_order_requests_public_insert
  on public.website_order_requests;
create policy website_order_requests_public_insert
on public.website_order_requests
for insert to anon
with check (
  status = 'pending_review'
  and quoted_subtotal is null
  and delivery_charge is null
  and additional_charges = 0
  and quoted_total is null
  and deposit_percent = 50
  and deposit_required is null
  and amount_paid = 0
  and balance_due is null
  and staff_notes is null
  and deposit_verified_at is null
  and sale_id is null
);

-- Order/customer data is visible only to authenticated operational and finance staff.
grant select on public.website_order_requests to authenticated;
grant select on public.website_order_payments to authenticated;

drop policy if exists website_order_requests_staff_read
  on public.website_order_requests;
create policy website_order_requests_staff_read
on public.website_order_requests
for select to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'manager', 'operator', 'accountant')
  )
);

drop policy if exists website_order_payments_staff_read
  on public.website_order_payments;
create policy website_order_payments_staff_read
on public.website_order_payments
for select to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'manager', 'operator', 'accountant')
  )
);

-- Staff writes go through authenticated server routes using the server-only
-- service-role client. No direct table UPDATE/INSERT grants are given to users.
revoke all on public.website_order_payments from anon, authenticated;
-- Keep the narrowly scoped anonymous INSERT grant established above.
-- Authenticated users receive SELECT only; staff writes use server routes.
grant select on public.website_order_requests to authenticated;
grant select on public.website_order_payments to authenticated;

create or replace function public.record_website_order_payment(
  p_order_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_reference text,
  p_notes text,
  p_verified_by uuid
)
returns public.website_order_requests
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.website_order_requests%rowtype;
  v_total_paid numeric(14,2);
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Payment amount must be greater than zero.';
  end if;
  if p_payment_method is null or char_length(trim(p_payment_method)) < 2 then
    raise exception 'Payment method is required.';
  end if;
  if not exists (
    select 1 from public.profiles p
    where p.id = p_verified_by
      and p.role in ('admin', 'manager', 'accountant')
  ) then
    raise exception 'The verifying user is not authorised.';
  end if;

  select * into v_order
  from public.website_order_requests
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Website order request not found.';
  end if;
  if v_order.status not in ('awaiting_deposit', 'deposit_received', 'confirmed') then
    raise exception 'This order is not accepting further payments.';
  end if;
  if v_order.deposit_required is null or v_order.quoted_total is null then
    raise exception 'A final quote is required before recording a deposit.';
  end if;

  select coalesce(sum(amount), 0) + p_amount
  into v_total_paid
  from public.website_order_payments
  where order_id = p_order_id;

  if v_total_paid > v_order.quoted_total then
    raise exception 'Recorded payments cannot exceed the agreed order total.';
  end if;

  insert into public.website_order_payments (
    order_id, amount, payment_method, reference, notes, verified_by
  ) values (
    p_order_id, p_amount, trim(p_payment_method), nullif(trim(p_reference), ''),
    nullif(trim(p_notes), ''), p_verified_by
  );

  update public.website_order_requests
  set
    amount_paid = v_total_paid,
    balance_due = greatest(quoted_total - v_total_paid, 0),
    deposit_verified_at = case
      when v_total_paid >= deposit_required then now()
      else deposit_verified_at
    end,
    status = case
      when v_total_paid >= deposit_required and v_order.accepted_at is not null then 'confirmed'
      when v_total_paid >= deposit_required then 'deposit_received'
      else 'awaiting_deposit'
    end
  where id = p_order_id
  returning * into v_order;

  return v_order;
end;
$$;

revoke all on function public.record_website_order_payment(uuid, numeric, text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.record_website_order_payment(uuid, numeric, text, text, text, uuid) to service_role;
