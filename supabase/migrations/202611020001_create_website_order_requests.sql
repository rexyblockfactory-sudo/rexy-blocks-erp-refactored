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


-- Preserve negotiated order charges separately in the ERP sale and invoice.
alter table public.sales
  add column if not exists delivery_charge numeric(14,2) not null default 0,
  add column if not exists additional_charges numeric(14,2) not null default 0;

alter table public.invoices
  add column if not exists delivery_charge numeric(14,2) not null default 0,
  add column if not exists additional_charges numeric(14,2) not null default 0;

create index if not exists website_order_requests_sale_id_idx
  on public.website_order_requests (sale_id);

-- Convert an accepted, deposit-paid website request to a normal ERP sale.
-- The entire operation is atomic: stock deduction, sale, payment ledger,
-- invoice, invoice lines, and request status either all commit or all roll back.
create or replace function public.convert_website_order_to_sale(
  p_order_id uuid,
  p_converted_by uuid
)
returns public.sales
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.website_order_requests%rowtype;
  v_sale public.sales%rowtype;
  v_invoice_id uuid;
  v_invoice_number text;
  v_product_name text;
  v_available_quantity integer;
  v_cost_per_unit numeric;
  v_cogs numeric;
  v_revenue_for_margin numeric;
  v_balance_due numeric;
  v_payment_status text;
  v_payments_total numeric;
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = p_converted_by
      and p.role in ('admin', 'manager')
  ) then
    raise exception 'Only an administrator or manager can convert a website order.';
  end if;

  select * into v_order
  from public.website_order_requests
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Website order request not found.';
  end if;

  -- Make retries safe: never create a second sale or deduct stock twice.
  if v_order.status = 'converted' and v_order.sale_id is not null then
    select * into v_sale from public.sales where id = v_order.sale_id;
    if not found then
      raise exception 'This request is marked converted but its linked sale is missing. Contact an administrator.';
    end if;
    return v_sale;
  end if;

  if v_order.status <> 'confirmed'
     or v_order.accepted_at is null
     or v_order.accepted_by is null
     or v_order.deposit_verified_at is null
     or v_order.deposit_required is null
     or v_order.amount_paid < v_order.deposit_required then
    raise exception 'The website order must have a verified deposit and management acceptance before conversion.';
  end if;

  if v_order.product_id is null
     or v_order.quoted_subtotal is null
     or v_order.delivery_charge is null
     or v_order.quoted_total is null
     or v_order.quoted_total <= 0
     or round(v_order.quoted_subtotal + v_order.delivery_charge + v_order.additional_charges, 2) <> v_order.quoted_total then
    raise exception 'The website order quote is incomplete or inconsistent.';
  end if;

  select coalesce(sum(amount), 0)
  into v_payments_total
  from public.website_order_payments
  where order_id = p_order_id;

  if round(v_payments_total, 2) <> round(v_order.amount_paid, 2)
     or v_payments_total < v_order.deposit_required then
    raise exception 'The verified payment ledger does not match the order balance. Contact an administrator.';
  end if;

  select name into v_product_name
  from public.products
  where id = v_order.product_id;

  if not found then
    raise exception 'The selected product no longer exists in the product catalogue.';
  end if;

  -- Lock and validate the finished-goods stock row before deducting.
  select quantity, unit_cost
  into v_available_quantity, v_cost_per_unit
  from public.finished_goods_inventory
  where product_name = v_product_name
  for update;

  if not found then
    raise exception 'No finished-goods inventory record exists for product "%".', v_product_name;
  end if;

  if coalesce(v_available_quantity, 0) < v_order.quantity then
    raise exception 'Insufficient finished-goods stock for "%". Available: %, requested: %.',
      v_product_name, coalesce(v_available_quantity, 0), v_order.quantity;
  end if;

  v_cost_per_unit := coalesce(v_cost_per_unit, 0);
  v_cogs := v_order.quantity * v_cost_per_unit;
  v_balance_due := greatest(round(v_order.quoted_total - v_payments_total, 2), 0);
  v_revenue_for_margin := v_order.quoted_subtotal + v_order.additional_charges;

  v_payment_status := case
    when v_balance_due = 0 then 'Paid'
    when v_payments_total > 0 then 'Partially Paid'
    else 'Unpaid'
  end;

  -- Match the stock valuation and deduction behaviour of the existing sale RPC.
  update public.finished_goods_inventory
  set
    quantity = quantity - v_order.quantity,
    costed_quantity = case
      when costed_quantity is null then greatest(0, quantity - v_order.quantity)
      when costed_quantity - v_order.quantity < 0 then 0
      else costed_quantity - v_order.quantity
    end,
    total_cost = case
      when quantity - v_order.quantity <= 0 then 0
      else (quantity - v_order.quantity) * v_cost_per_unit
    end,
    unit_cost = case
      when quantity - v_order.quantity <= 0 then 0
      else v_cost_per_unit
    end,
    updated_at = now()
  where product_name = v_product_name;

  -- Delivery is included in the receivable and invoice total, but excluded
  -- from gross margin because no transport-cost ledger is linked to this order.
  insert into public.sales (
    customer_name, product_name, quantity, unit_price, total_amount,
    payment_method, amount_paid, balance_due, cost_per_unit, cogs,
    gross_profit, gross_margin, delivery_charge, additional_charges
  ) values (
    v_order.customer_name, v_product_name, v_order.quantity,
    v_order.quoted_subtotal / v_order.quantity,
    v_order.quoted_total, 'Website Order', v_payments_total,
    v_balance_due, v_cost_per_unit, v_cogs,
    round(v_revenue_for_margin - v_cogs, 2),
    case when v_revenue_for_margin > 0
      then round(((v_revenue_for_margin - v_cogs) / v_revenue_for_margin) * 100, 2)
      else 0 end,
    v_order.delivery_charge, v_order.additional_charges
  )
  returning * into v_sale;

  -- Carry each verified website payment into the ERP sale payment ledger.
  insert into public.sale_payments (
    sale_id, amount, payment_method, reference, notes, created_by, created_at
  )
  select
    v_sale.id, p.amount, p.payment_method, p.reference,
    concat_ws(' | ', nullif(p.notes, ''), 'Website order ' || v_order.reference),
    p.verified_by, p.verified_at
  from public.website_order_payments p
  where p.order_id = p_order_id
  order by p.verified_at, p.id;

  v_invoice_number := 'INV-' || v_order.reference;

  insert into public.invoices (
    invoice_number, sale_id, customer_name, product_name, quantity,
    unit_price, total_amount, payment_method, payment_status,
    delivery_charge, additional_charges
  ) values (
    v_invoice_number, v_sale.id, v_order.customer_name, v_product_name,
    v_order.quantity, round(v_order.quoted_subtotal / v_order.quantity, 2),
    v_order.quoted_total, 'Website Order', v_payment_status,
    v_order.delivery_charge, v_order.additional_charges
  )
  returning id into v_invoice_id;

  insert into public.invoice_items (invoice_id, product_name, quantity, unit_price, total_price)
  values (
    v_invoice_id, v_product_name, v_order.quantity,
    v_order.quoted_subtotal / v_order.quantity, v_order.quoted_subtotal
  );

  if v_order.delivery_charge > 0 then
    insert into public.invoice_items (invoice_id, product_name, quantity, unit_price, total_price)
    values (v_invoice_id, 'Delivery charge', 1, v_order.delivery_charge, v_order.delivery_charge);
  end if;

  if v_order.additional_charges > 0 then
    insert into public.invoice_items (invoice_id, product_name, quantity, unit_price, total_price)
    values (v_invoice_id, 'Additional charges', 1, v_order.additional_charges, v_order.additional_charges);
  end if;

  update public.website_order_requests
  set status = 'converted', sale_id = v_sale.id
  where id = p_order_id;

  return v_sale;
end;
$$;

revoke all on function public.convert_website_order_to_sale(uuid, uuid) from public, anon, authenticated;
grant execute on function public.convert_website_order_to_sale(uuid, uuid) to service_role;

-- These existing sales functions are staff workflows, not public endpoints.
revoke execute on function public.create_sale_with_current_price(text, uuid, integer, text) from public, anon;
revoke execute on function public.record_sale_payment(uuid, numeric, text, text, text) from public, anon;


-- Guard the legacy sales RPC: SECURITY DEFINER must not let arbitrary signed-in users deduct stock.
CREATE OR REPLACE FUNCTION public.create_sale_with_current_price(p_customer_name text, p_product_id uuid, p_quantity integer, p_payment_method text)
 RETURNS sales
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$

DECLARE
  v_user_id uuid;
  v_user_role text;

  v_product_name text;
  v_unit_price numeric := 0;

  v_available_quantity integer := 0;

  v_cost_per_unit numeric := 0;

  v_total_amount numeric := 0;
  v_amount_paid numeric := 0;
  v_balance_due numeric := 0;

  v_cogs numeric := 0;
  v_gross_profit numeric := 0;
  v_gross_margin numeric := 0;

  v_sale public.sales;

BEGIN

  /* ============================================================
     OPTIONAL USER ID

     auth.uid() may be NULL when running directly
     from Supabase SQL Editor.
     ============================================================ */

  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated.';
  END IF;

  SELECT role INTO v_user_role
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_user_role NOT IN ('admin', 'manager', 'operator') THEN
    RAISE EXCEPTION 'You do not have permission to create sales.';
  END IF;


  /* ============================================================
     VALIDATION
     ============================================================ */

  IF p_customer_name IS NULL
     OR trim(p_customer_name) = '' THEN

    RAISE EXCEPTION
      'Customer name is required.';

  END IF;


  IF p_product_id IS NULL THEN

    RAISE EXCEPTION
      'Product is required.';

  END IF;


  IF p_quantity IS NULL
     OR p_quantity <= 0 THEN

    RAISE EXCEPTION
      'Quantity must be greater than zero.';

  END IF;


  IF p_payment_method IS NULL
     OR trim(p_payment_method) = '' THEN

    RAISE EXCEPTION
      'Payment method is required.';

  END IF;


  /* ============================================================
     GET PRODUCT
     ============================================================ */

  SELECT
    name,
    price
  INTO
    v_product_name,
    v_unit_price
  FROM public.products
  WHERE id = p_product_id;


  IF NOT FOUND THEN

    RAISE EXCEPTION
      'Product with ID % was not found.',
      p_product_id;

  END IF;


  /* ============================================================
     VALIDATE SELLING PRICE
     ============================================================ */

  v_unit_price :=
    COALESCE(
      v_unit_price,
      0
    );


  IF v_unit_price <= 0 THEN

    RAISE EXCEPTION
      'Product "%" does not have a valid selling price.',
      v_product_name;

  END IF;


  /* ============================================================
     GET FINISHED GOODS INVENTORY

     Lock the row while processing the sale.
     ============================================================ */

  SELECT
    quantity,
    unit_cost
  INTO
    v_available_quantity,
    v_cost_per_unit
  FROM public.finished_goods_inventory
  WHERE product_name = v_product_name
  FOR UPDATE;


  IF NOT FOUND THEN

    RAISE EXCEPTION
      'No finished goods inventory exists for product "%".',
      v_product_name;

  END IF;


  /* ============================================================
     VALIDATE INVENTORY
     ============================================================ */

  v_available_quantity :=
    COALESCE(
      v_available_quantity,
      0
    );


  IF v_available_quantity < p_quantity THEN

    RAISE EXCEPTION
      'Insufficient stock for "%". Available: %, Requested: %.',
      v_product_name,
      v_available_quantity,
      p_quantity;

  END IF;


  /* ============================================================
     GET COST PER UNIT
     ============================================================ */

  v_cost_per_unit :=
    COALESCE(
      v_cost_per_unit,
      0
    );


  /* ============================================================
     CALCULATE SALE TOTAL
     ============================================================ */

  v_total_amount :=
    p_quantity
    * v_unit_price;


  /* ============================================================
     CALCULATE COGS
     ============================================================ */

  v_cogs :=
    p_quantity
    * v_cost_per_unit;


  /* ============================================================
     CALCULATE GROSS PROFIT
     ============================================================ */

  v_gross_profit :=
    v_total_amount
    - v_cogs;


  /* ============================================================
     CALCULATE GROSS MARGIN
     ============================================================ */

  v_gross_margin :=
    CASE

      WHEN v_total_amount > 0 THEN

        (
          v_gross_profit
          / v_total_amount
        )
        * 100

      ELSE
        0

    END;


  /* ============================================================
     PAYMENT HANDLING

     CREDIT = unpaid initially.

     CASH / other payment methods = fully paid.
     ============================================================ */

  IF lower(trim(p_payment_method)) = 'credit' THEN

    v_amount_paid := 0;

    v_balance_due :=
      v_total_amount;

  ELSE

    v_amount_paid :=
      v_total_amount;

    v_balance_due := 0;

  END IF;


  /* ============================================================
     DEDUCT FINISHED GOODS INVENTORY
     ============================================================ */

  UPDATE public.finished_goods_inventory

  SET

    quantity =
      quantity
      - p_quantity,


    costed_quantity =
      CASE

        WHEN costed_quantity IS NULL THEN
          GREATEST(
            0,
            quantity - p_quantity
          )

        WHEN costed_quantity - p_quantity < 0 THEN
          0

        ELSE
          costed_quantity
          - p_quantity

      END,


    total_cost =
      CASE

        WHEN quantity - p_quantity <= 0 THEN
          0

        ELSE
          (
            quantity - p_quantity
          )
          * v_cost_per_unit

      END,


    unit_cost =
      CASE

        WHEN quantity - p_quantity <= 0 THEN
          0

        ELSE
          v_cost_per_unit

      END,


    updated_at =
      now()

  WHERE product_name =
    v_product_name;


  /* ============================================================
     CREATE SALE RECORD
     ============================================================ */

  INSERT INTO public.sales (

    customer_name,
    product_name,
    quantity,
    unit_price,
    total_amount,
    payment_method,
    amount_paid,
    balance_due,
    cost_per_unit,
    cogs,
    gross_profit,
    gross_margin

  )

  VALUES (

    trim(p_customer_name),

    v_product_name,

    p_quantity,

    v_unit_price,

    v_total_amount,

    trim(p_payment_method),

    v_amount_paid,

    v_balance_due,

    v_cost_per_unit,

    v_cogs,

    v_gross_profit,

    v_gross_margin

  )

  RETURNING *
  INTO v_sale;


  /* ============================================================
     RETURN CREATED SALE
     ============================================================ */

  RETURN v_sale;

END;

$function$
;

revoke execute on function public.create_sale_with_current_price(text, uuid, integer, text) from public, anon;
grant execute on function public.create_sale_with_current_price(text, uuid, integer, text) to authenticated, service_role;
