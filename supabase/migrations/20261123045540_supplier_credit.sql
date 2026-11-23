create table public.supplier_credit_purchases (
  id uuid primary key,
  purchase_id uuid not null unique references public.inventory_purchases(id),
  supplier text not null,
  material text not null,
  quantity numeric not null,
  unit text not null,
  invoice_reference text,
  total numeric(14,2) not null check (total > 0),
  created_at timestamptz not null default now()
);

create table public.supplier_credit_payments (
  id uuid primary key,
  credit_id uuid not null references public.supplier_credit_purchases(id),
  amount numeric(14,2) not null check (amount > 0),
  reference text,
  created_by uuid not null,
  created_at timestamptz not null default now()
);
create index supplier_credit_payments_credit_idx on public.supplier_credit_payments (credit_id);

alter table public.supplier_credit_purchases enable row level security;
alter table public.supplier_credit_payments enable row level security;
revoke all on public.supplier_credit_purchases, public.supplier_credit_payments from public, anon, authenticated;
grant select on public.supplier_credit_purchases, public.supplier_credit_payments to authenticated;
create policy supplier_credit_staff_read on public.supplier_credit_purchases for select to authenticated
using (exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin', 'manager', 'accountant')));
create policy supplier_credit_staff_read on public.supplier_credit_payments for select to authenticated
using (exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin', 'manager', 'accountant')));

create function public.receive_supplier_credit(
  p_id uuid, p_inventory_id uuid, p_supplier text, p_quantity numeric,
  p_total numeric, p_upfront numeric, p_reference text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  item public.inventory;
  purchase public.inventory_purchases;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'manager', 'accountant')) then
    raise exception 'Supplier credit access is restricted.' using errcode = '42501';
  end if;
  if nullif(btrim(p_supplier), '') is null or p_id is null or
     p_total is null or p_total <= 0 or p_total >= 1000000000000 or p_total <> round(p_total, 2) or
     p_upfront is null or p_upfront < 0 or p_upfront >= p_total or p_upfront <> round(p_upfront, 2) then
    raise exception 'Enter a supplier, a valid total, and an upfront payment below the total.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_id::text, 0));
  if exists (select 1 from public.supplier_credit_purchases where id = p_id) then
    return p_id;
  end if;

  select * into item from public.inventory where id = p_inventory_id and category = 'Raw Material' for update;
  if not found then
    raise exception 'Select a raw material from inventory.';
  end if;

  purchase := public.record_inventory_purchase(
    item.id, btrim(p_supplier), p_reference, p_quantity, item.unit,
    p_quantity, item.unit, p_total, 'Supplier credit'
  );

  insert into public.supplier_credit_purchases (id, purchase_id, supplier, material, quantity, unit, invoice_reference, total)
  values (p_id, purchase.id, purchase.supplier, item.item_name, purchase.stock_quantity,
          purchase.stock_unit, purchase.invoice_reference, purchase.total_cost);
  if p_upfront > 0 then
    insert into public.supplier_credit_payments (id, credit_id, amount, reference, created_by)
    values (gen_random_uuid(), p_id, p_upfront, 'Upfront payment', auth.uid());
  end if;
  return p_id;
end;
$$;

create function public.pay_supplier_credit(
  p_id uuid, p_credit_id uuid, p_amount numeric, p_reference text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  credit_total numeric;
  amount_paid numeric;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'manager', 'accountant')) then
    raise exception 'Supplier credit access is restricted.' using errcode = '42501';
  end if;
  if p_id is null or p_amount is null or p_amount <= 0 or p_amount >= 1000000000000 or p_amount <> round(p_amount, 2) then
    raise exception 'Enter a valid payment amount.';
  end if;

  select total into credit_total from public.supplier_credit_purchases where id = p_credit_id for update;
  if not found then
    raise exception 'Supplier credit purchase was not found.';
  end if;
  if exists (select 1 from public.supplier_credit_payments where id = p_id and credit_id = p_credit_id) then
    return p_id;
  end if;

  select coalesce(sum(amount), 0) into amount_paid from public.supplier_credit_payments where credit_id = p_credit_id;
  if p_amount > credit_total - amount_paid then
    raise exception 'Payment exceeds the outstanding balance.';
  end if;
  insert into public.supplier_credit_payments (id, credit_id, amount, reference, created_by)
  values (p_id, p_credit_id, p_amount, nullif(btrim(p_reference), ''), auth.uid());
  return p_id;
end;
$$;

revoke execute on function public.receive_supplier_credit(uuid, uuid, text, numeric, numeric, numeric, text) from public, anon;
revoke execute on function public.pay_supplier_credit(uuid, uuid, numeric, text) from public, anon;
grant execute on function public.receive_supplier_credit(uuid, uuid, text, numeric, numeric, numeric, text) to authenticated;
grant execute on function public.pay_supplier_credit(uuid, uuid, numeric, text) to authenticated;
