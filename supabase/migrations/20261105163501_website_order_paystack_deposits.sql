create table public.website_order_checkouts (
  reference uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.website_order_requests(id),
  amount_pesewas bigint not null check (amount_pesewas > 0),
  checkout_url text,
  status text not null default 'pending' check (status in ('pending', 'recorded', 'needs_review')),
  created_at timestamptz not null default now()
);

alter table public.website_order_checkouts enable row level security;
revoke all on public.website_order_checkouts from public, anon, authenticated;
grant select, insert, update, delete on public.website_order_checkouts to service_role;

alter table public.website_order_payments
  alter column verified_by drop not null,
  add column provider_reference uuid unique references public.website_order_checkouts(reference),
  add constraint website_payment_verification_source
    check (verified_by is not null or provider_reference is not null);

create function public.record_paystack_website_deposit(
  p_reference uuid, p_amount_pesewas bigint
)
returns text
language plpgsql
set search_path = ''
as $$
declare
  checkout public.website_order_checkouts%rowtype;
  order_row public.website_order_requests%rowtype;
  new_paid numeric;
begin
  select * into checkout from public.website_order_checkouts
  where reference = p_reference for update;
  if not found then return 'unknown'; end if;
  if checkout.status <> 'pending' then return checkout.status; end if;

  select * into order_row from public.website_order_requests
  where id = checkout.order_id for update;

  new_paid := order_row.amount_paid + p_amount_pesewas / 100.0;
  if p_amount_pesewas is distinct from checkout.amount_pesewas
    or order_row.status <> 'awaiting_deposit'
    or order_row.deposit_required is null
    or order_row.quoted_total is null
    or new_paid <> order_row.deposit_required
    or new_paid > order_row.quoted_total then
    update public.website_order_checkouts set status = 'needs_review'
    where reference = p_reference;
    return 'needs_review';
  end if;

  insert into public.website_order_payments
    (order_id, amount, payment_method, reference, provider_reference)
  values (order_row.id, p_amount_pesewas / 100.0, 'Paystack', p_reference::text, p_reference);

  update public.website_order_requests
  set amount_paid = new_paid, balance_due = quoted_total - new_paid,
    deposit_verified_at = now(), status = 'deposit_received'
  where id = order_row.id;

  update public.website_order_checkouts set status = 'recorded'
  where reference = p_reference;
  return 'recorded';
end;
$$;

revoke execute on function public.record_paystack_website_deposit(uuid, bigint)
  from public, anon, authenticated;
grant execute on function public.record_paystack_website_deposit(uuid, bigint) to service_role;
