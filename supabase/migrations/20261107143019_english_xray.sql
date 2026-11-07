create table public.users (
 id uuid primary key default gen_random_uuid(), telegram_id bigint not null unique, telegram_username text, first_name text, last_name text, full_name text not null,
 phone_number text, phone_verified boolean not null default false, region text, city text, district text, education_category text, learning_goals text[] not null default '{}',
 self_reported_level text, study_preference text, registration_completed boolean not null default true,
 timezone text not null default 'Asia/Tashkent', settings jsonb not null default '{"language":"uz","notifications":true,"reminders":false,"minutes":25}',
 deletion_requested_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.registration_sessions (
 telegram_id bigint primary key, current_step text not null, draft_data jsonb not null default '{}', revision integer not null default 0,
 started_at timestamptz not null default now(), updated_at timestamptz not null default now(), completed_at timestamptz
);
create table public.user_consents (
 user_id uuid primary key references public.users on delete cascade, privacy_policy_version text not null,
 required_processing_accepted_at timestamptz not null, marketing_opt_in boolean not null default false, marketing_consent_updated_at timestamptz not null default now(), guardian_attested boolean not null default false
);
create table public.app_sessions (
 token_hash text primary key, init_hash text not null unique, user_id uuid not null references public.users on delete cascade,
 expires_at timestamptz not null, created_at timestamptz not null default now()
);
create index app_sessions_user on public.app_sessions(user_id);
create index app_sessions_expiry on public.app_sessions(expires_at);
create table public.admin_users (
 user_id uuid primary key references public.users on delete cascade, role text not null check(role in ('super_admin','admin','mentor'))
);
create table public.mentor_assignments (
 student_id uuid primary key references public.users on delete cascade, mentor_id uuid not null references public.admin_users(user_id) on delete cascade
);
create index mentor_assignments_mentor on public.mentor_assignments(mentor_id);
create table public.diagnostic_questions (
 id text primary key, skill text not null check(skill in ('grammar','vocabulary','reading','listening','writing','speaking')),
 kind text not null check(kind in ('single','multiple','blank','writing','speaking')), difficulty integer not null check(difficulty between 1 and 6),
 topic text not null, prompt text not null, options jsonb, stimulus text, audio text, key jsonb, active boolean not null default true
);
create table public.diagnostic_sessions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users on delete cascade,
 mode text not null check(mode in ('quick','full','certificate')), track text check(track in ('CEFR','IELTS')), status text not null default 'active' check(status in ('active','review','complete')),
 items jsonb not null, scoring_version text not null, result jsonb,
 created_at timestamptz not null default now(), submitted_at timestamptz, updated_at timestamptz not null default now()
);
create unique index diagnostic_one_active on public.diagnostic_sessions(user_id) where status='active';
create index diagnostic_history on public.diagnostic_sessions(user_id,created_at desc);
create table public.diagnostic_answers (
 session_id uuid not null references public.diagnostic_sessions on delete cascade, question_id text not null references public.diagnostic_questions, answer jsonb not null,
 updated_at timestamptz not null default now(), primary key(session_id,question_id)
);
create table public.skill_results (
 session_id uuid not null references public.diagnostic_sessions on delete cascade, skill text not null, detail jsonb not null, primary key(session_id,skill)
);
create table public.assessment_reviews (
 session_id uuid not null references public.diagnostic_sessions on delete cascade, skill text not null check(skill in ('writing','speaking')),
 reviewer_id uuid references public.users on delete set null, rubric jsonb not null, feedback text not null, created_at timestamptz not null default now(), primary key(session_id,skill)
);
create table public.learning_plans (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users on delete cascade, session_id uuid not null unique references public.diagnostic_sessions on delete cascade,
 created_at timestamptz not null default now()
);
create index learning_plans_owner on public.learning_plans(user_id,created_at desc);
create table public.learning_tasks (
 id uuid primary key default gen_random_uuid(), plan_id uuid not null references public.learning_plans on delete cascade, week integer not null check(week between 1 and 8),
 skill text not null, title text not null, instruction text not null, minutes integer not null, difficulty integer not null, completed_at timestamptz, unique(plan_id,week)
);
create table public.study_materials (
 id text primary key, category text not null, title text not null, description text not null, kind text not null check(kind in ('text','pdf','audio','video','exercise')), content text, asset_path text, active boolean not null default true
);
create table public.material_progress (
 user_id uuid not null references public.users on delete cascade, material_id text not null references public.study_materials, bookmarked boolean not null default false,
 completed_at timestamptz, primary key(user_id,material_id)
);
create table public.xp_transactions (
 user_id uuid not null references public.users on delete cascade, source text not null, points integer not null check(points>0), study_day date not null, created_at timestamptz not null default now(), primary key(user_id,source)
);
create index xp_transactions_day on public.xp_transactions(user_id,study_day);
create table public.streaks (
 user_id uuid not null references public.users on delete cascade, study_day date not null, primary key(user_id,study_day)
);
create table public.achievements (id text primary key, title text not null);
insert into public.achievements values ('scan','1-test'),('plan','Reja'),('streak','7 kun'),('material','Material'),('mentor','Mentor'),('course','Kurs');
create table public.user_achievements (
 user_id uuid not null references public.users on delete cascade, achievement_id text not null references public.achievements, awarded_at timestamptz not null default now(), primary key(user_id,achievement_id)
);
create table public.ai_conversations (
 id uuid primary key default gen_random_uuid(), user_id uuid not null unique references public.users on delete cascade
);
create table public.ai_messages (
 id uuid primary key default gen_random_uuid(), conversation_id uuid not null references public.ai_conversations on delete cascade,
 client_id uuid not null, input text not null, output text, status text not null default 'queued' check(status in ('queued','running','done','failed')),
 tries integer not null default 0, updated_at timestamptz not null default now(), created_at timestamptz not null default now(), unique(conversation_id,client_id)
);
create index ai_work_queue on public.ai_messages(status,updated_at);
create table public.enrollment_applications (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users on delete cascade, client_id uuid not null,
 name text not null, phone text not null, contact_method text not null, consent_at timestamptz not null default now(), status text not null default 'new' check(status in ('new','contacted','trial','enrolled','closed')),
 created_at timestamptz not null default now(), unique(user_id,client_id)
);
create index enrollment_owner on public.enrollment_applications(user_id,created_at desc);
create table public.enrollment_status_history (
 id bigint generated always as identity primary key, application_id uuid not null references public.enrollment_applications on delete cascade, actor_id uuid references public.users on delete set null, status text not null, created_at timestamptz not null default now()
);
create table public.telegram_notifications (
 id uuid primary key default gen_random_uuid(), dedupe_key text not null unique, chat_id bigint not null, body jsonb not null,
 sent_at timestamptz, claimed_at timestamptz, tries integer not null default 0, created_at timestamptz not null default now()
);
create index telegram_outbox on public.telegram_notifications(created_at) where sent_at is null;
create table public.telegram_processed_updates (
 update_id bigint primary key, processed_at timestamptz not null default now()
);
create table public.audit_logs (
 id bigint generated always as identity primary key, actor_id uuid references public.users on delete set null, action text not null,
 target_id uuid, created_at timestamptz not null default now()
);
create table public.api_limits (
 bucket text primary key, hits integer not null, until timestamptz not null
);

create function public.xr_limit(p_bucket text,p_max integer,p_window integer) returns boolean language sql set search_path='' as $$
 insert into public.api_limits as l values(p_bucket,1,now()+make_interval(secs=>p_window))
 on conflict(bucket) do update set hits=case when l.until<now() then 1 else l.hits+1 end,
 until=case when l.until<now() then excluded.until else l.until end returning hits<=p_max
$$;

create function public.xr_award(p_user uuid,p_source text,p_points integer,p_badge text default null) returns void language plpgsql set search_path='' as $$
declare d date; 
begin
 select (now() at time zone timezone)::date into strict d from public.users where id=p_user;
 insert into public.xp_transactions(user_id,source,points,study_day) values(p_user,p_source,p_points,d) on conflict do nothing;
 if found then insert into public.streaks values(p_user,d) on conflict do nothing; end if;
 if p_badge is not null then insert into public.user_achievements(user_id,achievement_id) values(p_user,p_badge) on conflict do nothing; end if;
 if (select count(*) from public.streaks where user_id=p_user and study_day between d-6 and d)=7 then
   insert into public.user_achievements(user_id,achievement_id) values(p_user,'streak') on conflict do nothing;
 end if;
end $$;

create function public.xr_answer(p_user uuid,p_session uuid,p_question text,p_answer jsonb) returns boolean language plpgsql set search_path='' as $$
declare s public.diagnostic_sessions;
begin
 select * into s from public.diagnostic_sessions where id=p_session and user_id=p_user for update;
 if not found or s.status<>'active' or not exists(select 1 from jsonb_array_elements(s.items) as item where item->>'id'=p_question) then return false; end if;
 insert into public.diagnostic_answers(session_id,question_id,answer) values(p_session,p_question,p_answer)
 on conflict(session_id,question_id) do update set answer=excluded.answer,updated_at=now();
 update public.diagnostic_sessions set updated_at=now() where id=p_session;
 return true;
end $$;

create function public.xr_finish(p_user uuid,p_session uuid,p_snapshot jsonb,p_result jsonb,p_tasks jsonb,p_status text) returns boolean language plpgsql set search_path='' as $$
declare s public.diagnostic_sessions; plan uuid; a record;
begin
 select * into s from public.diagnostic_sessions where id=p_session and user_id=p_user for update;
 if not found then return false; end if;
 if s.status<>'active' then return true; end if;
 if p_snapshot is distinct from (select coalesce(jsonb_object_agg(question_id,answer),'{}') from public.diagnostic_answers where session_id=p_session)
 or (select count(*) from public.diagnostic_answers where session_id=p_session)<>jsonb_array_length(s.items) then return false; end if;
 update public.diagnostic_sessions set status=p_status,result=p_result,submitted_at=now(),updated_at=now() where id=p_session;
 for a in select * from jsonb_each(p_result->'skills') loop
   insert into public.skill_results values(p_session,a.key,a.value);
 end loop;
 insert into public.learning_plans(user_id,session_id) values(p_user,p_session) returning id into plan;
 insert into public.learning_tasks(plan_id,week,skill,title,instruction,minutes,difficulty)
 select plan,week,skill,title,instruction,minutes,difficulty from jsonb_to_recordset(p_tasks) as t(week integer,skill text,title text,instruction text,minutes integer,difficulty integer);
 perform public.xr_award(p_user,'scan:'||p_session,50,'scan');
 return true;
end $$;

create function public.xr_task(p_user uuid,p_task uuid) returns boolean language plpgsql set search_path='' as $$
declare plan uuid;
begin
 select p.id into plan from public.learning_tasks t join public.learning_plans p on p.id=t.plan_id where t.id=p_task and p.user_id=p_user for update of p;
 if not found then return false; end if;
 update public.learning_tasks set completed_at=now() where id=p_task and completed_at is null;
 if found then
   perform public.xr_award(p_user,'task:'||p_task,15,case when not exists(select 1 from public.learning_tasks where plan_id=plan and completed_at is null) then 'plan' end);
 end if;
 return true;
end $$;

create function public.xr_enroll(p_user uuid,p_id uuid,p_name text,p_phone text,p_method text,p_chats bigint[]) returns uuid language plpgsql set search_path='' as $$
declare a uuid;
begin
 perform 1 from public.users where id=p_user and deletion_requested_at is null for update;
 if not found then return null; end if;
 select id into a from public.enrollment_applications where user_id=p_user and (client_id=p_id or status in ('new','contacted','trial')) order by created_at desc limit 1;
 if found then return a; end if;
 insert into public.enrollment_applications(user_id,client_id,name,phone,contact_method) values(p_user,p_id,p_name,p_phone,p_method) returning id into a;
 insert into public.enrollment_status_history(application_id,actor_id,status) values(a,p_user,'new');
 perform public.xr_award(p_user,'enrollment:'||a,10,'course');
 insert into public.telegram_notifications(dedupe_key,chat_id,body)
 select 'enrollment:'||a||':'||chat,chat,jsonb_build_object('text','English X-Ray: yangi kurs arizasi. Tafsilotlarni admin panelida ko‘ring.') from unnest(p_chats) chat on conflict do nothing;
 return a;
end $$;

create function public.xr_enrollment_status(p_actor uuid,p_id uuid,p_status text) returns boolean language plpgsql set search_path='' as $$
declare prev text;
begin
 if not exists(select 1 from public.admin_users where user_id=p_actor and role in ('admin','super_admin')) then return false; end if;
 select status into prev from public.enrollment_applications where id=p_id for update;
 if not found then return false; end if;
 if prev=p_status then return true; end if;
 update public.enrollment_applications set status=p_status where id=p_id;
 insert into public.enrollment_status_history(application_id,actor_id,status) values(p_id,p_actor,p_status);
 insert into public.audit_logs(actor_id,action,target_id) values(p_actor,'enrollment_status',p_id);
 return true;
end $$;

create function public.xr_bot_step(p_telegram bigint,p_update bigint,p_rev integer,p_step text,p_draft jsonb,p_profile jsonb,p_marketing boolean,p_reply jsonb,p_admins bigint[],p_delete boolean default false)
returns text language plpgsql set search_path='' as $$
declare rev integer; uid uuid; is_new boolean;
begin
 perform pg_advisory_xact_lock(p_telegram);
 if exists(select 1 from public.telegram_processed_updates where update_id=p_update) then return 'duplicate'; end if;
 select revision into rev from public.registration_sessions where telegram_id=p_telegram;
 if coalesce(rev,0)<>p_rev then return 'conflict'; end if;
 if p_profile is not null then
   is_new := not exists(select 1 from public.users where telegram_id=p_telegram);
   insert into public.users(telegram_id,telegram_username,first_name,last_name,full_name,phone_number,phone_verified,region,city,district,education_category,learning_goals,self_reported_level,study_preference)
   values(p_telegram,p_profile->>'username',p_profile->>'first',p_profile->>'last',p_profile->>'name',p_profile->>'phone',coalesce((p_profile->>'verified')::boolean,false),p_profile->>'region',p_profile->>'city',p_profile->>'district',p_profile->>'education',
   array(select jsonb_array_elements_text(coalesce(p_profile->'goals','[]'))),p_profile->>'level',p_profile->>'preference')
   on conflict(telegram_id) do update set telegram_username=excluded.telegram_username,full_name=excluded.full_name,phone_number=excluded.phone_number,phone_verified=excluded.phone_verified,
   region=excluded.region,city=excluded.city,district=excluded.district,education_category=excluded.education_category,learning_goals=excluded.learning_goals,self_reported_level=excluded.self_reported_level,study_preference=excluded.study_preference,updated_at=now()
   returning id into uid;
   insert into public.user_consents values(uid,'v1',now(),p_marketing,now(),coalesce((p_profile->>'guardian')::boolean,false)) on conflict(user_id) do update set marketing_opt_in=excluded.marketing_opt_in,marketing_consent_updated_at=now(),guardian_attested=excluded.guardian_attested;
   if is_new then
     insert into public.telegram_notifications(dedupe_key,chat_id,body)
     select 'registration:'||uid||':'||chat,chat,jsonb_build_object('text','English X-Ray: yangi ro‘yxatdan o‘tish. Tafsilotlarni admin panelida ko‘ring.') from unnest(p_admins) chat on conflict do nothing;
   end if;
 end if;
 if p_delete then
   update public.users set deletion_requested_at=now() where telegram_id=p_telegram returning id into uid;
   delete from public.app_sessions where user_id=uid;
 end if;
 insert into public.registration_sessions(telegram_id,current_step,draft_data,revision,completed_at)
 values(p_telegram,p_step,p_draft,p_rev+1,case when p_step='COMPLETED' then now() end)
 on conflict(telegram_id) do update set current_step=excluded.current_step,draft_data=excluded.draft_data,revision=excluded.revision,updated_at=now(),completed_at=excluded.completed_at;
 insert into public.telegram_processed_updates(update_id) values(p_update);
 insert into public.telegram_notifications(dedupe_key,chat_id,body) values('reply:'||p_update,p_telegram,p_reply);
 return 'ok';
end $$;

create function public.xr_claim_notifications(p_prefix text default null) returns setof public.telegram_notifications language sql set search_path='' as $$
 update public.telegram_notifications set claimed_at=now(),tries=tries+1 where id in (
  select id from public.telegram_notifications where sent_at is null and tries<8 and (claimed_at is null or claimed_at<now()-interval '1 minute')
  and (p_prefix is null or left(dedupe_key,length(p_prefix))=p_prefix) order by created_at limit 12 for update skip locked
 ) returning *
$$;

create function public.xr_ai_claim(p_id uuid) returns setof public.ai_messages language sql set search_path='' as $$
 update public.ai_messages set status='running',tries=tries+1,updated_at=now() where id=p_id and tries<4
 and (status='queued' or (status='running' and updated_at<now()-interval '2 minutes')) returning *
$$;

create function public.xr_review(p_actor uuid,p_session uuid,p_skill text,p_rubric jsonb,p_feedback text,p_detail jsonb,p_expected jsonb,p_result jsonb,p_status text,p_tasks jsonb) returns boolean language plpgsql set search_path='' as $$
declare s public.diagnostic_sessions; actor_role text;
begin
 select role into actor_role from public.admin_users where user_id=p_actor;
 select * into s from public.diagnostic_sessions where id=p_session for update;
 if not found or s.status='active' or actor_role is null or (actor_role='mentor' and not exists(select 1 from public.mentor_assignments where mentor_id=p_actor and student_id=s.user_id)) then return false; end if;
 if s.result is distinct from p_expected then return false; end if;
 insert into public.assessment_reviews(session_id,skill,reviewer_id,rubric,feedback) values(p_session,p_skill,p_actor,p_rubric,p_feedback)
 on conflict(session_id,skill) do update set reviewer_id=excluded.reviewer_id,rubric=excluded.rubric,feedback=excluded.feedback,created_at=now();
 update public.skill_results set detail=p_detail where session_id=p_session and skill=p_skill;
 update public.diagnostic_sessions set result=p_result,status=p_status,updated_at=now() where id=p_session;
 update public.learning_tasks as task set skill=t.skill,title=t.title,instruction=t.instruction,minutes=t.minutes,difficulty=t.difficulty
 from public.learning_plans as plan,jsonb_to_recordset(p_tasks) as t(week integer,skill text,title text,instruction text,minutes integer,difficulty integer)
 where plan.session_id=p_session and task.plan_id=plan.id and task.week=t.week and task.completed_at is null;
 insert into public.audit_logs(actor_id,action,target_id) values(p_actor,'assessment_review',p_session);
 return true;
end $$;

create function public.xr_xp_total(p_user uuid) returns bigint language sql stable set search_path='' as $$
 select coalesce(sum(points),0) from public.xp_transactions where user_id=p_user
$$;
create function public.xr_material_done(p_user uuid,p_material text) returns void language plpgsql set search_path='' as $$
begin
 insert into public.material_progress(user_id,material_id,completed_at) values(p_user,p_material,now())
 on conflict(user_id,material_id) do update set completed_at=excluded.completed_at where public.material_progress.completed_at is null;
 perform public.xr_award(p_user,'material:'||p_material,10,'material');
end $$;
create function public.xr_delete_account(p_actor uuid,p_target uuid) returns boolean language plpgsql set search_path='' as $$
declare tg bigint;
begin
 if not exists(select 1 from public.admin_users where user_id=p_actor and role='super_admin') then return false; end if;
 select telegram_id into tg from public.users where id=p_target and deletion_requested_at is not null for update;
 if not found then return false; end if;
 delete from public.registration_sessions where telegram_id=tg;
 delete from public.telegram_notifications where chat_id=tg;
 delete from public.api_limits where bucket in ('user:'||p_target,'ai:'||p_target);
 delete from public.users where id=p_target;
 insert into public.audit_logs(actor_id,action) values(case when p_actor=p_target then null else p_actor end,'account_erased');
 return true;
end $$;

do $$
declare t record; f record;
begin
 for t in select tablename from pg_tables where schemaname='public' and tablename in (
  'users','registration_sessions','user_consents','app_sessions','admin_users','mentor_assignments','diagnostic_questions','diagnostic_sessions','diagnostic_answers','skill_results','assessment_reviews',
  'learning_plans','learning_tasks','study_materials','material_progress','xp_transactions','streaks','achievements','user_achievements','ai_conversations','ai_messages',
  'enrollment_applications','enrollment_status_history','telegram_notifications','telegram_processed_updates','audit_logs','api_limits'
 ) loop
  execute format('alter table public.%I enable row level security',t.tablename);
  execute format('revoke all on table public.%I from public, anon, authenticated',t.tablename);
  execute format('grant select, insert, update, delete on table public.%I to service_role',t.tablename);
 end loop;
 for f in select oid::regprocedure as signature from pg_proc where pronamespace='public'::regnamespace and proname like 'xr\_%' loop
  execute format('revoke all on function %s from public, anon, authenticated',f.signature);
  execute format('grant execute on function %s to service_role',f.signature);
 end loop;
end $$;
grant usage on sequence public.enrollment_status_history_id_seq,public.audit_logs_id_seq to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('xray-recordings','xray-recordings',false,4000000,array['audio/webm','audio/mp4','audio/ogg','audio/wav']),
 ('xray-materials','xray-materials',false,4000000,null)
on conflict(id) do nothing;

insert into public.diagnostic_questions(id,skill,kind,difficulty,topic,prompt,options,stimulus,audio,key,active)
select id,skill,kind,difficulty,topic,prompt,options,stimulus,audio,key,active from jsonb_to_recordset($seed$[{"id": "g1", "skill": "grammar", "difficulty": 1, "topic": "To be", "prompt": "Maya ___ a student.", "options": ["am", "is", "are", "be"], "key": ["is"], "stimulus": null, "audio": null, "kind": "single", "active": true}, {"id": "g2", "skill": "grammar", "difficulty": 1, "topic": "Present Simple", "prompt": "My brother ___ football every Saturday.", "options": ["play", "plays", "playing", "is play"], "key": ["plays"], "stimulus": null, "audio": null, "kind": "single", "active": true}, {"id": "g3", "skill": "grammar", "difficulty": 2, "topic": "Past Simple", "prompt": "I ___ the museum last Sunday.", "options": ["visit", "visited", "have visited", "visiting"], "key": ["visited"], "stimulus": null, "audio": null, "kind": "single", "active": true}, {"id": "g4", "skill": "grammar", "difficulty": 2, "topic": "Countable nouns", "prompt": "Choose TWO sentences with correct quantifiers.", "options": ["We need some apples.", "There are much books.", "How many tickets do you need?", "I have a few water."], "key": ["We need some apples.", "How many tickets do you need?"], "stimulus": null, "audio": null, "kind": "multiple", "active": true}, {"id": "g5", "skill": "grammar", "difficulty": 3, "topic": "Present Perfect", "prompt": "I have lived in Tashkent ___ 2020.", "options": null, "key": ["since"], "stimulus": null, "audio": null, "kind": "blank", "active": true}, {"id": "g6", "skill": "grammar", "difficulty": 3, "topic": "Conditionals", "prompt": "If it rains tomorrow, we ___ at home.", "options": ["stayed", "will stay", "had stayed", "would have stayed"], "key": ["will stay"], "stimulus": null, "audio": null, "kind": "single", "active": true}, {"id": "g7", "skill": "grammar", "difficulty": 4, "topic": "Past Perfect", "prompt": "By the time the talk began, most people ___.", "options": ["left", "had left", "have left", "are leaving"], "key": ["had left"], "stimulus": null, "audio": null, "kind": "single", "active": true}, {"id": "g8", "skill": "grammar", "difficulty": 5, "topic": "Inversion", "prompt": "Not until the results arrived ___ the scale of the problem.", "options": ["we understood", "did we understand", "we had understood", "understood we"], "key": ["did we understand"], "stimulus": null, "audio": null, "kind": "single", "active": true}, {"id": "v1", "skill": "vocabulary", "difficulty": 1, "topic": "Everyday verbs", "prompt": "Which verb means to get something by paying money?", "options": ["buy", "bring", "lend", "leave"], "key": ["buy"], "stimulus": null, "audio": null, "kind": "single", "active": true}, {"id": "v2", "skill": "vocabulary", "difficulty": 1, "topic": "Daily routine", "prompt": "I usually ___ breakfast at seven.", "options": ["make", "do", "get on", "go"], "key": ["make"], "stimulus": null, "audio": null, "kind": "single", "active": true}, {"id": "v3", "skill": "vocabulary", "difficulty": 2, "topic": "Travel", "prompt": "Which word means a single trip from one place to another?", "options": ["journey", "luggage", "platform", "schedule"], "key": ["journey"], "stimulus": null, "audio": null, "kind": "single", "active": true}, {"id": "v4", "skill": "vocabulary", "difficulty": 2, "topic": "Opposites", "prompt": "The opposite of narrow is ___.", "options": ["deep", "wide", "smooth", "short"], "key": ["wide"], "stimulus": null, "audio": null, "kind": "single", "active": true}, {"id": "v5", "skill": "vocabulary", "difficulty": 3, "topic": "Collocations", "prompt": "We need to ___ a decision by Friday.", "options": ["take up", "make", "do", "put"], "key": ["make"], "stimulus": null, "audio": null, "kind": "single", "active": true}, {"id": "v6", "skill": "vocabulary", "difficulty": 3, "topic": "Context", "prompt": "The shop is closed temporarily. What does temporarily mean?", "options": ["For a limited time", "On purpose", "Without warning", "For good"], "key": ["For a limited time"], "stimulus": null, "audio": null, "kind": "single", "active": true}, {"id": "v7", "skill": "vocabulary", "difficulty": 4, "topic": "Word meaning", "prompt": "The plan is feasible. Which word is closest in meaning?", "options": ["Practical", "Expensive", "Unusual", "Necessary"], "key": ["Practical"], "stimulus": null, "audio": null, "kind": "single", "active": true}, {"id": "v8", "skill": "vocabulary", "difficulty": 5, "topic": "Register", "prompt": "Which word best fits: The findings are preliminary and should be interpreted with ___.", "options": ["caution", "relief", "certainty", "indifference"], "key": ["caution"], "stimulus": null, "audio": null, "kind": "single", "active": true}, {"id": "r1", "skill": "reading", "difficulty": 1, "topic": "Aniq ma’lumot", "prompt": "When does Sam start on Wednesdays?", "options": ["Nine", "Ten", "Five", "Six"], "key": ["Ten"], "stimulus": "Sam works at a library. On Wednesdays he starts at ten instead of nine. The library closes at six.", "audio": null, "kind": "single", "active": true}, {"id": "r2", "skill": "reading", "difficulty": 2, "topic": "Taqqoslash", "prompt": "What is true about Train B?", "options": ["It costs more.", "It arrives first.", "It leaves first.", "It takes longer."], "key": ["It arrives first."], "stimulus": "Train A leaves at 11:20 and arrives at 12:10. Train B leaves later but arrives at 12:05. Both cost the same.", "audio": null, "kind": "single", "active": true}, {"id": "r3", "skill": "reading", "difficulty": 3, "topic": "Sabab va natija", "prompt": "What changed the club’s plan?", "options": ["A building delay", "Members’ preferences", "Higher rent", "A staff complaint"], "key": ["Members’ preferences"], "stimulus": "The sports club was going to build a larger gym. After a survey showed that most members wanted longer opening hours, the club decided to hire more evening staff instead.", "audio": null, "kind": "single", "active": true}, {"id": "r4", "skill": "reading", "difficulty": 3, "topic": "Shartni aniqlash", "prompt": "What condition must be met?", "options": ["Costs must fall in summer.", "Winter use must stay high.", "The trial must be repeated.", "Cyclists must pay for maintenance."], "key": ["Winter use must stay high."], "stimulus": "The new cycle lane was popular during the trial. However, the council will keep it only if winter usage remains high, since maintenance costs increase sharply in cold weather.", "audio": null, "kind": "single", "active": true}, {"id": "r5", "skill": "reading", "difficulty": 4, "topic": "Muallif pozitsiyasi", "prompt": "Why does the author mention motivation?", "options": ["To identify a possible alternative explanation", "To prove the sessions work", "To report a measured outcome", "To describe the researchers’ schedules"], "key": ["To identify a possible alternative explanation"], "stimulus": "A pilot study found that people remembered more words after short, frequent sessions. The participants chose their own schedules, however, so differences in motivation could account for some of the effect.", "audio": null, "kind": "single", "active": true}, {"id": "r6", "skill": "reading", "difficulty": 5, "topic": "Xulosa chiqarish", "prompt": "What distinction does the writer draw?", "options": ["Digital records are less reliable than paper records.", "Wider access does not guarantee broader representation.", "The oldest documents were written for public use.", "The archive needs fewer published sources."], "key": ["Wider access does not guarantee broader representation."], "stimulus": "Although the archive is promoted as comprehensive, its earliest records largely reflect the views of people who could afford to publish. Digitising those records has widened access while preserving that original imbalance.", "audio": null, "kind": "single", "active": true}, {"id": "l1", "skill": "listening", "difficulty": 1, "topic": "Tinglab tushunish", "prompt": "Where will the club meet?", "options": ["Room 6", "Room 10", "Room 12", "Room 20"], "key": ["Room 12"], "stimulus": null, "audio": "/audio/l1.mp3", "kind": "single", "active": true}, {"id": "l2", "skill": "listening", "difficulty": 2, "topic": "Tinglab tushunish", "prompt": "What has changed?", "options": ["The price", "The meeting point", "The day", "The time"], "key": ["The meeting point"], "stimulus": null, "audio": "/audio/l2.mp3", "kind": "single", "active": true}, {"id": "l3", "skill": "listening", "difficulty": 3, "topic": "Tinglab tushunish", "prompt": "You will hear a conversation about a ____.", "options": ["A new apartment", "A job interview", "A language course", "A travel plan"], "key": ["A job interview"], "stimulus": null, "audio": "/audio/l3.mp3", "kind": "single", "active": true}, {"id": "l4", "skill": "listening", "difficulty": 3, "topic": "Tinglab tushunish", "prompt": "When is a payment needed?", "options": ["When you join the class", "When you download the workbook", "When you want a printed workbook", "When you book an online class"], "key": ["When you want a printed workbook"], "stimulus": null, "audio": "/audio/l4.mp3", "kind": "single", "active": true}, {"id": "l5", "skill": "listening", "difficulty": 4, "topic": "Tinglab tushunish", "prompt": "What did the speaker miss?", "options": ["The questions", "The whole presentation", "The recording", "The train connection"], "key": ["The questions"], "stimulus": null, "audio": "/audio/l5.mp3", "kind": "single", "active": true}, {"id": "l6", "skill": "listening", "difficulty": 5, "topic": "Tinglab tushunish", "prompt": "What is the speaker’s position?", "options": ["The scheme had no effect.", "The reporting change had no effect.", "The result is promising but causation is uncertain.", "The figures were deliberately inaccurate."], "key": ["The result is promising but causation is uncertain."], "stimulus": null, "audio": "/audio/l6.mp3", "kind": "single", "active": true}, {"id": "w1", "skill": "writing", "difficulty": 3, "topic": "Fikrni rivojlantirish", "prompt": "Write 90–130 words. A friend is deciding whether to study alone or join an English group. Explain which option you recommend and give two reasons.", "options": null, "key": null, "stimulus": null, "audio": null, "kind": "writing", "active": true}, {"id": "w2", "skill": "writing", "difficulty": 4, "topic": "Dalillash", "prompt": "Write 180–240 words. Some schools allow students to use phones during lessons. Discuss one benefit and one drawback, and give your own opinion.", "options": null, "key": null, "stimulus": null, "audio": null, "kind": "writing", "active": true}, {"id": "s1", "skill": "speaking", "difficulty": 3, "topic": "Ravonlik", "prompt": "Record 45–90 seconds. Describe a skill you learned. Explain why you chose it, what was difficult, and how you improved.", "options": null, "key": null, "stimulus": null, "audio": null, "kind": "speaking", "active": true}, {"id": "s2", "skill": "speaking", "difficulty": 4, "topic": "Fikrni asoslash", "prompt": "Record 60–120 seconds. Do people learn better online or face-to-face? Compare the two approaches and support your view with an example.", "options": null, "key": null, "stimulus": null, "audio": null, "kind": "speaking", "active": true}]$seed$::jsonb) as q(id text,skill text,kind text,difficulty int,topic text,prompt text,options jsonb,stimulus text,audio text,key jsonb,active bool);

insert into public.study_materials(id,category,title,description,kind,content,asset_path) select id,category,title,description,kind,content,asset_path from jsonb_to_recordset($seed$[
 {"id":"writing","category":"writing","title":"Writing templates","description":"CEFR / IELTS · Qo‘llanma","kind":"text","content":"Fikrni aniqlang. Har asosiy xatboshida bitta fikrni sabab va misol bilan rivojlantiring. Masalan: Online learning suits working adults because lessons can fit around shifts. For example, a nurse can review a recorded lesson after work. Mashq: 15 daqiqada ikkita asosiy xatboshi yozing."},
 {"id":"speaking","category":"speaking","title":"Speaking practice","description":"Savollar · Amaliy mashq","kind":"exercise","content":"Describe a place where you study well. Where is it? What helps you focus there? How has your routine changed? 30 soniya tayyorlaning, 60 soniya gapiring. Keyin bir noaniq joyni aniq misol bilan qayta ayting."},
 {"id":"vocabulary","category":"vocabulary","title":"Useful phrases","description":"So‘z birikmalari · Matn","kind":"text","content":"Make steady progress — muntazam o‘sish. Set aside time — vaqt ajratish. Put something into practice — biror narsani amalda qo‘llash. Har bir iborani o‘zingiz haqingizdagi bitta gapda ishlating."},
 {"id":"listening","category":"listening","title":"Listening drills","description":"Intervyu · Audio mashq","kind":"audio","content":"Birinchi tinglashda suhbatning maqsadini aniqlang. Ikkinchisida nomzoddan so‘ralgan mavzu va javob qachon berilishini yozing.","asset_path":"/audio/practice.mp3"},
 {"id":"reading","category":"reading","title":"Reading for evidence","description":"Matndan dalil topish","kind":"exercise","content":"The library extended its weekend hours after students requested a quiet study space. Weekday hours stayed the same. Savol: Kutubxona qaysi paytda ish vaqtini uzaytirdi va nima sababdan? Har javob uchun matndan aniq dalil toping."},
 {"id":"grammar","category":"grammar","title":"Grammar repair","description":"Present Perfect · Amaliy mashq","kind":"exercise","content":"Use since for a starting point and for for a duration. I have studied here since September. I have studied here for three months. O‘zingiz haqingizda har biriga ikki misol yozing."}
]
$seed$::jsonb) as m(id text,category text,title text,description text,kind text,content text,asset_path text);
