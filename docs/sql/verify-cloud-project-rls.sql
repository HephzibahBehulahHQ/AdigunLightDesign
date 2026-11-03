-- Transaction-only verification using two existing registered owners.
-- Does not create users, reveal their identities, or retain test projects.
begin;
do $$
declare
  owners uuid[];
  first_project uuid := gen_random_uuid();
  second_project uuid := gen_random_uuid();
  affected integer;
  denied boolean;
begin
  select array_agg(id) into owners from (
    select id from auth.users
    where not coalesce(is_anonymous,false) and deleted_at is null
    order by id limit 2
  ) registered;
  if coalesce(array_length(owners,1),0) <> 2 then
    raise exception 'Verification needs two existing registered users.';
  end if;
  insert into adigunlightdesign.projects(id,owner_id,title,document) values
    (first_project,owners[1],'__ald_rls_verification__',jsonb_build_object('id',first_project,'schemaVersion',1)),
    (second_project,owners[2],'__ald_rls_verification__',jsonb_build_object('id',second_project,'schemaVersion',1));

  execute 'set local role anon';
  denied := false;
  begin
    perform 1 from adigunlightdesign.projects limit 1;
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'Anonymous API role unexpectedly accessed projects.'; end if;
  execute 'reset role';

  perform set_config('request.jwt.claims',jsonb_build_object('sub',owners[1],'role','authenticated','is_anonymous',false)::text,true);
  execute 'set local role authenticated';
  if current_user <> 'authenticated' then raise exception 'Role emulation did not activate.'; end if;
  if not exists(select 1 from adigunlightdesign.projects where id=first_project) then raise exception 'Owner cannot read own project.'; end if;
  if exists(select 1 from adigunlightdesign.projects where id=second_project) then raise exception 'Cross-owner project is visible.'; end if;
  update adigunlightdesign.projects set title='__ald_rls_foreign_update__' where id=second_project;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Cross-owner update succeeded.'; end if;
  delete from adigunlightdesign.projects where id=second_project;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Cross-owner delete succeeded.'; end if;
  update adigunlightdesign.projects set owner_id=owners[2],revision=999 where id=first_project;
  if not exists(select 1 from adigunlightdesign.projects where id=first_project and owner_id=owners[1] and revision=2) then raise exception 'Owner/revision trigger failed.'; end if;
  denied := false;
  begin
    insert into adigunlightdesign.projects(owner_id,title,document)
      values(owners[2],'__ald_rls_forged_owner__','{"id":"verification","schemaVersion":1}'::jsonb);
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'Forged-owner insert succeeded.'; end if;
  execute 'reset role';

  perform set_config('request.jwt.claims',jsonb_build_object('sub',owners[1],'role','authenticated','is_anonymous',true)::text,true);
  execute 'set local role authenticated';
  if exists(select 1 from adigunlightdesign.projects where id=first_project) then raise exception 'Anonymous Auth session accessed a project.'; end if;
  denied := false;
  begin
    insert into adigunlightdesign.projects(owner_id,title,document)
      values(owners[1],'__ald_rls_anonymous__','{"id":"verification","schemaVersion":1}'::jsonb);
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'Anonymous Auth session inserted a project.'; end if;
  execute 'reset role';
end;
$$;
rollback;
select jsonb_build_object(
  'database_role_verification','passed',
  'retained_test_projects',(select count(*) from adigunlightdesign.projects where title like '__ald_rls_%')
) as verification;
