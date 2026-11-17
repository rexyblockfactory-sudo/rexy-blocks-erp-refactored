-- Keep existing staff roles. New identities start without any ERP permissions,
-- including identities made through public registration and Supabase invitations.
alter table public.profiles alter column role set default 'unassigned';

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''), 'unassigned');
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create schema if not exists rexy_access;
revoke all on schema rexy_access from public, anon, authenticated;
grant usage on schema rexy_access to authenticated;

create or replace function rexy_access.is_erp_staff()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role in ('admin','manager','operator','accountant','production_staff')
  );
$$;
revoke all on function rexy_access.is_erp_staff() from public, anon, authenticated;
grant execute on function rexy_access.is_erp_staff() to authenticated, service_role;

-- Match the existing public catalogue, public verified properties, and
-- public order INSERT contracts. Keep profiles' existing own-row/admin policies.
-- Add an AND gate to existing staff policies instead of widening their permissions.
do $$
declare
  t record;
begin
  for t in
    select c.relname, c.relkind from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm', 'f')
      and c.relname not in ('products', 'property_listings', 'website_order_requests', 'profiles')
      and exists (
        select 1 from pg_catalog.aclexplode(c.relacl) a
        where a.grantee = 0 or a.grantee in ('anon'::regrole, 'authenticated'::regrole)
      )
  loop
    -- No ERP views are exposed at the time of this migration. Stop rather than
    -- accidentally carrying over an unexpected view that could bypass RLS.
    if t.relkind not in ('r','p') then
      raise exception 'Review the public view/foreign table % before restricting ERP access', t.relname;
    end if;
    execute format('revoke all on table public.%I from public, anon', t.relname);
    execute format('revoke truncate, references, trigger on table public.%I from authenticated', t.relname);
    execute format('alter table public.%I enable row level security', t.relname);
    execute format('create policy rexy_erp_staff_only on public.%I as restrictive for all to authenticated using ((select rexy_access.is_erp_staff())) with check ((select rexy_access.is_erp_staff()))', t.relname);
  end loop;
end;
$$;

revoke all on table public.profiles from public, anon;
revoke insert, delete, truncate, references, trigger on table public.profiles from authenticated;
revoke update on table public.profiles from authenticated;
grant update (role) on table public.profiles to authenticated;

-- Public visitors can browse products, never modify them.
revoke all on table public.products from public, anon;
grant select on table public.products to anon;
revoke truncate, references, trigger on table public.products from authenticated;
create policy rexy_products_staff_insert on public.products as restrictive for insert to authenticated
  with check ((select rexy_access.is_erp_staff()));
create policy rexy_products_staff_update on public.products as restrictive for update to authenticated
  using ((select rexy_access.is_erp_staff())) with check ((select rexy_access.is_erp_staff()));
create policy rexy_products_staff_delete on public.products as restrictive for delete to authenticated
  using ((select rexy_access.is_erp_staff()));

-- Retain existing published-property policy and existing column-limited
-- public order grants. Owners cannot read or amend requests as ERP staff.
create policy rexy_website_orders_staff_only on public.website_order_requests as restrictive for all to authenticated
  using ((select rexy_access.is_erp_staff())) with check ((select rexy_access.is_erp_staff()));

-- No anonymous ERP RPC. Preserve authenticated callers where previously
-- granted, and retain the existing service_role grants.
do $$
declare
  f record;
  declaration text;
  body_start integer;
  guard constant text := E'\n  IF (auth.uid() IS NOT NULL OR current_setting(''role'', true) IN (''authenticated'', ''anon'')) AND NOT rexy_access.is_erp_staff() THEN\n    RAISE EXCEPTION USING ERRCODE = ''42501'', MESSAGE = ''ERP staff access required.'';\n  END IF;\n';
  guarded_names constant text[] := array[
    'create_inventory_item_with_opening_stock','create_production_with_inventory',
    'record_inventory_movement','record_inventory_purchase','record_customer_payment',
    'record_sale','record_sale_payment'
  ];
begin
  for f in
    select p.oid, p.proname, p.prosecdef, p.prosrc, l.lanname,
      pg_catalog.pg_get_function_identity_arguments(p.oid) as arguments,
      pg_catalog.has_function_privilege('authenticated',p.oid,'execute') as previously_authenticated
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    join pg_catalog.pg_language l on l.oid = p.prolang
    where n.nspname = 'public' and p.prokind = 'f'
      and (pg_catalog.has_function_privilege('anon',p.oid,'execute')
        or pg_catalog.has_function_privilege('authenticated',p.oid,'execute'))
      and p.proname not in ('is_admin','get_my_role')
  loop
    if f.prosecdef and f.previously_authenticated and f.proname = any(guarded_names) then
      -- Preserve each installed routine's exact signature and stock/accounting
      -- logic. Insert a role check before its first executable statement.
      declaration := pg_catalog.pg_get_functiondef(f.oid);
      body_start := pg_catalog.regexp_instr(upper(f.prosrc), E'(^|\n)[ \t]*BEGIN(?=[ \t\r\n]|$)', 1, 1, 1);
      if f.lanname <> 'plpgsql' or body_start <= 0 or strpos(declaration, f.prosrc) = 0 then
        raise exception 'Cannot safely guard ERP routine %', f.proname;
      end if;
      declaration := replace(declaration, f.prosrc,
        overlay(f.prosrc placing guard from body_start for 0));
      execute declaration;
    elsif f.prosecdef and f.previously_authenticated
      and f.proname not in ('create_sale_with_current_price','rls_auto_enable','sync_payroll_to_expenses') then
      raise exception 'Review unexpectedly exposed privileged function %', f.proname;
    end if;

    execute format('revoke execute on function public.%I(%s) from public, anon', f.proname, f.arguments);
    if f.previously_authenticated and f.proname not in
      ('rls_auto_enable','sync_payroll_to_expenses','set_website_order_updated_at') then
      execute format('grant execute on function public.%I(%s) to authenticated', f.proname, f.arguments);
    else
      execute format('revoke execute on function public.%I(%s) from authenticated', f.proname, f.arguments);
    end if;
  end loop;
end;
$$;

-- Prevent a project-only identity from being promoted accidentally in the
-- ERP user-role dropdown. Staff must use their separate staff account.
create or replace function rexy_access.keep_project_owner_non_staff()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if old.role = 'project_owner' and new.role is distinct from old.role then
    raise exception using errcode = '42501', message = 'Project owners must use a separate staff account.';
  end if;
  return new;
end;
$$;
revoke execute on function rexy_access.keep_project_owner_non_staff() from public, anon, authenticated;
create trigger rexy_keep_project_owner_non_staff
before update of role on public.profiles
for each row execute function rexy_access.keep_project_owner_non_staff();

-- Service-only: lock the authoritative profile, validate the Auth identity
-- and add membership in the same transaction as granting the non-staff role.
create or replace function public.enroll_rexy_project_owner(
  p_project_id uuid, p_user_id uuid, p_email text, p_admin_id uuid
)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_role text;
  v_email text;
begin
  if not exists(select 1 from public.profiles where id=p_admin_id and role='admin') then
    raise exception using errcode='42501', message='Administrator access required.';
  end if;
  select p.role, u.email into v_role, v_email
    from public.profiles p join auth.users u on u.id=p.id
    where p.id=p_user_id for update of p;
  if not found or v_email is null or lower(v_email) is distinct from lower(p_email)
      or v_role is null or v_role not in ('unassigned','project_owner','employee') then
    raise exception using errcode='42501', message='Only a matching non-staff account can be enrolled.';
  end if;
  update public.profiles set role='project_owner' where id=p_user_id and role <> 'project_owner';
  insert into public.client_project_members (project_id,user_id,added_by)
    values (p_project_id,p_user_id,p_admin_id) on conflict (project_id,user_id) do nothing;
end;
$$;
revoke all on function public.enroll_rexy_project_owner(uuid,uuid,text,uuid) from public, anon, authenticated;
grant execute on function public.enroll_rexy_project_owner(uuid,uuid,text,uuid) to service_role;
