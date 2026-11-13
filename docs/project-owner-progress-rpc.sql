-- Atomic progress update: insert a client-visible journal entry and update the
-- project's current completion percentage in one database transaction.
-- Invokable only through server-side service-role API after staff authorization.

create or replace function public.record_client_project_progress(
  p_project_id uuid, p_heading text, p_details text,
  p_progress_percent integer, p_created_by uuid
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare v_update_id uuid;
begin
  if p_project_id is null or
     p_progress_percent is null or p_progress_percent < 0 or p_progress_percent > 100 or
     length(trim(coalesce(p_heading,''))) not between 4 and 160 or
     length(trim(coalesce(p_details,''))) not between 10 and 5000 or
     p_created_by is null then
    raise exception 'Invalid project progress report';
  end if;

  update public.client_projects
    set progress_percent = p_progress_percent, updated_at = now()
    where id = p_project_id;
  if not found then
    raise exception 'Project does not exist';
  end if;

  insert into public.client_project_updates
    (project_id, heading, details, progress_percent, created_by, is_visible)
    values (p_project_id, trim(p_heading), trim(p_details),
            p_progress_percent, p_created_by, true)
    returning id into v_update_id;

  return v_update_id;
end;
$function$;

revoke all on function public.record_client_project_progress(uuid,text,text,integer,uuid)
  from public, anon, authenticated;
grant execute on function public.record_client_project_progress(uuid,text,text,integer,uuid)
  to service_role;
