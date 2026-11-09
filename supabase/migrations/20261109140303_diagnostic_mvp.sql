create table public.xr_mvp_runs (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.users on delete cascade,
 revision integer not null default 0,
 state jsonb not null,
 consent_version text not null,
 consent_at timestamptz not null default now(),
 source text,
 device jsonb not null default '{}',
 contacted_at timestamptz,
 completed_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create unique index xr_mvp_one_active on public.xr_mvp_runs(user_id) where completed_at is null;
create index xr_mvp_latest on public.xr_mvp_runs(user_id,created_at desc);
create table public.xr_mvp_attribution (
 telegram_id bigint primary key,
 first_source text not null,
 created_at timestamptz not null default now()
);
create table public.xr_mvp_events (
 id bigint generated always as identity primary key,
 run_id uuid not null references public.xr_mvp_runs on delete cascade,
 name text not null,
 detail jsonb not null default '{}',
 created_at timestamptz not null default now()
);
create index xr_mvp_events_run on public.xr_mvp_events(run_id,created_at);
create table public.xr_mvp_leads (
 run_id uuid primary key references public.xr_mvp_runs on delete cascade,
 status text not null default 'new' check(status in ('new','contact','requested','scheduled','attended','enrolled','declined','closed')),
 booking jsonb,
 notes text,
 updated_at timestamptz not null default now()
);
create table public.xr_mvp_follow_optout(telegram_id bigint primary key, stopped_at timestamptz not null default now());
create table public.xr_mvp_config (id boolean primary key default true check(id), value jsonb not null);
create table public.xr_mvp_media (id text primary key, value jsonb not null);
create table public.xr_mvp_items (
 id text not null, version integer not null,
 item jsonb not null, active boolean not null default true,
 created_at timestamptz not null default now(), primary key(id,version)
);
create unique index xr_mvp_item_active on public.xr_mvp_items(id) where active;

create function public.xr_mvp_open(p_telegram bigint,p_first text,p_last text,p_username text,p_state jsonb,p_source text,p_days integer,p_device jsonb)
returns uuid language plpgsql set search_path='' as $$
declare u public.users; r public.xr_mvp_runs; source_value text;
begin
 perform pg_advisory_xact_lock(p_telegram);
 select * into u from public.users where telegram_id=p_telegram;
 if u.deletion_requested_at is not null then return null; end if;
 if u.id is null then
  insert into public.users(telegram_id,first_name,last_name,full_name,telegram_username)
  values(p_telegram,p_first,p_last,trim(concat_ws(' ',p_first,p_last)),p_username) returning * into u;
 end if;
 select * into r from public.xr_mvp_runs where user_id=u.id order by created_at desc limit 1;
 if r.id is not null and (r.completed_at is null or r.completed_at+make_interval(days=>p_days)>now()) then return r.id; end if;
 insert into public.xr_mvp_attribution values(p_telegram,coalesce(p_source,'direct'),now()) on conflict do nothing;
 select first_source into source_value from public.xr_mvp_attribution where telegram_id=p_telegram;
 insert into public.xr_mvp_runs(user_id,state,consent_version,source,device)
 values(u.id,p_state,'xray-mvp-v1',source_value,p_device) returning id into r.id;
 insert into public.xr_mvp_events(run_id,name,detail) values(r.id,'app_opened',jsonb_build_object('source',p_source)),(r.id,'consent_given',jsonb_build_object('version','xray-mvp-v1'));
 return r.id;
end $$;

create function public.xr_mvp_save(p_telegram bigint,p_run uuid,p_revision integer,p_state jsonb,p_event text,p_detail jsonb default '{}',p_phone text default null,p_booking jsonb default null)
returns boolean language plpgsql set search_path='' as $$
declare u public.users; r public.xr_mvp_runs;
begin
 select * into u from public.users where telegram_id=p_telegram and deletion_requested_at is null for update;
 if not found then return false; end if;
 select * into r from public.xr_mvp_runs where id=p_run and user_id=u.id and revision=p_revision for update;
 if not found then return false; end if;
 update public.xr_mvp_runs set state=p_state,revision=revision+1,updated_at=now(),
  completed_at=case when p_state->>'step'='short' then coalesce(completed_at,now()) else completed_at end,
  contacted_at=case when p_phone is not null then coalesce(contacted_at,now()) else contacted_at end where id=p_run;
 if p_state->>'step'='short' then
  insert into public.xr_mvp_leads(run_id) values(p_run) on conflict do nothing;
 end if;
 if p_phone is not null then
  update public.users set phone_number=p_phone,phone_verified=false,updated_at=now() where id=u.id and (not phone_verified or phone_number is distinct from p_phone);
  update public.xr_mvp_leads set status='contact',updated_at=now() where run_id=p_run and status='new';
 end if;
 if p_booking is not null then
  update public.xr_mvp_leads set status='requested',booking=p_booking,updated_at=now() where run_id=p_run and status='contact';
  delete from public.telegram_notifications where left(dedupe_key,12+length(p_run::text))='mvp-follow:'||p_run||':' and sent_at is null;
 end if;
 if p_event is not null then insert into public.xr_mvp_events(run_id,name,detail) values(p_run,p_event,p_detail); end if;
 return true;
end $$;

create function public.xr_mvp_bot(p_telegram bigint,p_update bigint,p_action text,p_source text,p_phone text,p_voice text,p_reply jsonb)
returns boolean language plpgsql set search_path='' as $$
declare u public.users; r public.xr_mvp_runs; message jsonb:=p_reply;
begin
 perform pg_advisory_xact_lock(p_telegram);
 if exists(select 1 from public.telegram_processed_updates where update_id=p_update) then return true; end if;
 select * into u from public.users where telegram_id=p_telegram and deletion_requested_at is null for update;
 select * into r from public.xr_mvp_runs where user_id=u.id order by created_at desc limit 1 for update;
 if p_action='start' and p_source is not null then
  insert into public.xr_mvp_attribution values(p_telegram,p_source,now()) on conflict do nothing;
  if r.id is not null then insert into public.xr_mvp_events(run_id,name,detail) values(r.id,'bot_opened',jsonb_build_object('source',p_source)); end if;
 elsif p_action='contact' then
  if r.id is null or r.state->>'step'<>'short' or not coalesce((r.state->>'contactPending')::boolean,false) then return false; end if;
  update public.users set phone_number=p_phone,phone_verified=true,updated_at=now() where id=u.id;
  update public.xr_mvp_runs set state=state||'{"step":"report","contactPending":false}',contacted_at=now(),revision=revision+1,updated_at=now() where id=r.id;
  update public.xr_mvp_leads set status='contact',updated_at=now() where run_id=r.id and status='new';
  insert into public.xr_mvp_events(run_id,name) values(r.id,'contact_shared');
 elsif p_action='voice' then
  if r.id is null or r.state->>'step'<>'speaking' or r.state->>'age'<>'adult' or not coalesce((r.state->>'voicePending')::boolean,false) then return false; end if;
  update public.xr_mvp_runs set state=state||jsonb_build_object('voice',p_voice,'voiceType','telegram','voicePending',false),revision=revision+1,updated_at=now() where id=r.id;
  insert into public.xr_mvp_events(run_id,name) values(r.id,'voice_received');
 elsif p_action='stop' then
  insert into public.xr_mvp_follow_optout values(p_telegram,now()) on conflict do nothing;
  delete from public.telegram_notifications where chat_id=p_telegram and dedupe_key like 'mvp-follow:%' and sent_at is null;
 end if;
 insert into public.telegram_processed_updates(update_id) values(p_update);
 if message is not null then insert into public.telegram_notifications(dedupe_key,chat_id,body) values('reply:'||p_update,p_telegram,message); end if;
 return true;
end $$;

create function public.xr_mvp_admin_lead(p_actor uuid,p_run uuid,p_status text,p_notes text)
returns boolean language plpgsql set search_path='' as $$
begin
 if not exists(select 1 from public.admin_users where user_id=p_actor and role in ('super_admin','admin')) then return false; end if;
 update public.xr_mvp_leads set status=p_status,notes=p_notes,updated_at=now() where run_id=p_run;
 if not found then return false; end if;
 if p_status<>'contact' then
  delete from public.telegram_notifications where left(dedupe_key,12+length(p_run::text))='mvp-follow:'||p_run||':' and sent_at is null;
 end if;
 insert into public.xr_mvp_events(run_id,name,detail) values(p_run,'lead_status',jsonb_build_object('by',p_actor,'status',p_status));
 return true;
end $$;

create function public.xr_mvp_import(p_items jsonb) returns integer language plpgsql set search_path='' as $$
declare row_item jsonb; item_id text; v integer; count_items integer:=0;
begin
 perform pg_advisory_xact_lock(hashtext('xr_mvp_import'));
 for row_item in select value from jsonb_array_elements(p_items) loop
  item_id:=row_item->>'id';
  select coalesce(max(version),1)+1 into v from public.xr_mvp_items where id=item_id;
  update public.xr_mvp_items set active=false where id=item_id and active;
  insert into public.xr_mvp_items values(item_id,v,row_item||jsonb_build_object('version',v),coalesce((row_item->>'active')::boolean,true),now());
  count_items:=count_items+1;
 end loop;
 return count_items;
end $$;

create or replace function public.xr_claim_notifications(p_prefix text default null) returns setof public.telegram_notifications language sql set search_path='' as $$
 update public.telegram_notifications set claimed_at=now(),tries=tries+1 where id in (
  select id from public.telegram_notifications where sent_at is null and tries<8 and (claimed_at is null or claimed_at<now()-interval '1 minute')
  and (p_prefix is null or left(dedupe_key,length(p_prefix))=p_prefix)
  and (dedupe_key not like 'mvp-follow:%' or (now() at time zone 'Asia/Tashkent')::time >= time '10:00' and (now() at time zone 'Asia/Tashkent')::time < time '21:00')
  order by created_at limit 12 for update skip locked
 ) returning *
$$;

create function public.xr_mvp_forget() returns trigger language plpgsql set search_path='' as $$
begin
 delete from public.xr_mvp_attribution where telegram_id=old.telegram_id;
 delete from public.xr_mvp_follow_optout where telegram_id=old.telegram_id;
 return old;
end $$;
create trigger xr_mvp_forget before delete on public.users for each row execute function public.xr_mvp_forget();

do $$
declare t text; f record;
begin
 foreach t in array array['xr_mvp_runs','xr_mvp_attribution','xr_mvp_events','xr_mvp_leads','xr_mvp_follow_optout','xr_mvp_config','xr_mvp_items','xr_mvp_media'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on table public.%I from public, anon, authenticated',t);
  execute format('grant select, insert, update, delete on table public.%I to service_role',t);
 end loop;
 for f in select oid::regprocedure as signature from pg_proc where pronamespace='public'::regnamespace and left(proname,7)='xr_mvp_' loop
  execute format('revoke all on function %s from public, anon, authenticated',f.signature);
  execute format('grant execute on function %s to service_role',f.signature);
 end loop;
end $$;
grant usage on sequence public.xr_mvp_events_id_seq to service_role;
