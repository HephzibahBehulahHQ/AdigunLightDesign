-- Hosted shared-project schema contract. Applied through Supabase migrations.
-- Product-owned objects only; do not modify other products or global Auth.
create schema adigunlightdesign;
revoke all on schema adigunlightdesign from public, anon;
grant usage on schema adigunlightdesign to authenticated;

create table adigunlightdesign.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  document jsonb not null check (
    jsonb_typeof(document) = 'object'
    and document @> '{"schemaVersion":1}'::jsonb
    and document ? 'id'
    and octet_length(document::text) <= 5242880
  ),
  revision bigint not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index projects_owner_updated_idx on adigunlightdesign.projects(owner_id, updated_at desc);
alter table adigunlightdesign.projects enable row level security;
revoke all on adigunlightdesign.projects from public, anon;
grant select, insert, update, delete on adigunlightdesign.projects to authenticated;
create policy projects_select_owner on adigunlightdesign.projects for select to authenticated
  using ((select auth.uid()) = owner_id);
create policy projects_insert_owner on adigunlightdesign.projects for insert to authenticated
  with check ((select auth.uid()) = owner_id);
create policy projects_update_owner on adigunlightdesign.projects for update to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy projects_delete_owner on adigunlightdesign.projects for delete to authenticated
  using ((select auth.uid()) = owner_id);
-- Supabase anonymous Auth sessions also assume the authenticated database role.
-- This restrictive gate applies in addition to every operation-specific policy.
create policy projects_registered_owner on adigunlightdesign.projects as restrictive
  for all to authenticated
  using ((select auth.uid()) = owner_id and coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) = false)
  with check ((select auth.uid()) = owner_id and coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) = false);

create function adigunlightdesign.stamp_project_update() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  new.id := old.id;
  new.owner_id := old.owner_id;
  new.created_at := old.created_at;
  new.revision := old.revision + 1;
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function adigunlightdesign.stamp_project_update() from public, anon;
grant execute on function adigunlightdesign.stamp_project_update() to authenticated;
create trigger stamp_project_update before update on adigunlightdesign.projects
  for each row execute function adigunlightdesign.stamp_project_update();
