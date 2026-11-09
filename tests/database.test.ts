import {readFileSync,readdirSync} from 'node:fs'
import {PGlite} from '@electric-sql/pglite'
import {afterAll,beforeAll,expect,it} from 'vitest'
const db=new PGlite()
let user:string,other:string
beforeAll(async()=>{
 await db.exec('create role anon; create role authenticated; create role service_role bypassrls; create schema storage; create table storage.buckets(id text primary key,name text,public bool,file_size_limit bigint,allowed_mime_types text[]);')
 const dir='supabase/migrations'
 for(const name of readdirSync(dir).filter(n=>n.endsWith('.sql')).sort())await db.exec(readFileSync(dir+'/'+name,'utf8'))
 const rows=await db.query<{id:string}>("insert into users(telegram_id,full_name) values(101,'Test'),(102,'Other') returning id")
 ;[user,other]=rows.rows.map(r=>r.id)
},30000)
afterAll(async()=>{await db.close()})
it('keeps browser roles out of all app tables and scoring procedures',async()=>{
 const q=await db.query<{all_safe:boolean}>("select bool_and(c.relrowsecurity and not has_table_privilege('anon',c.oid,'SELECT') and not has_table_privilege('authenticated',c.oid,'SELECT')) as all_safe from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r'")
 expect(q.rows[0].all_safe).toBe(true)
 const f=await db.query<{can:boolean}>("select has_function_privilege('authenticated','public.xr_award(uuid,text,integer,text)','EXECUTE') as can")
 expect(f.rows[0].can).toBe(false)
})
it('accepts the same bot update once and handles stale state revisions',async()=>{
 const apply=(update:number,revision:number)=>db.query<{v:string}>("select xr_bot_step(304,$1,$2,'NAME','{}',null,false,'{\"text\":\"next\"}','{}') v",[update,revision])
 expect((await apply(305,0)).rows[0].v).toBe('ok')
 expect((await apply(305,0)).rows[0].v).toBe('duplicate')
 expect((await apply(306,0)).rows[0].v).toBe('conflict')
 const records=await db.query<{n:number}>("select count(*)::int n from telegram_notifications where chat_id=304")
 expect(records.rows[0].n).toBe(1)
})
it('enforces test ownership, snapshots answers, and awards one XP event',async()=>{
 const test=(await db.query<{id:string}>("insert into diagnostic_sessions(user_id,mode,items,scoring_version) values($1,'quick','[{\"id\":\"g1\"}]','xray-1.0') returning id",[user])).rows[0].id
 const answer=(u:string)=>db.query<{ok:boolean}>("select xr_answer($1,$2,'g1','\"is\"') ok",[u,test])
 expect((await answer(other)).rows[0].ok).toBe(false)
 expect((await answer(user)).rows[0].ok).toBe(true)
 const finish=(snapshot:string)=>db.query<{ok:boolean}>("select xr_finish($1,$2,$3,'{\"skills\":{}}','[]','complete') ok",[user,test,snapshot])
 expect((await finish('{}')).rows[0].ok).toBe(false)
 expect((await finish('{"g1":"is"}')).rows[0].ok).toBe(true)
 expect((await finish('{"g1":"is"}')).rows[0].ok).toBe(true)
 const points=await db.query<{points:number}>('select sum(points)::int points from xp_transactions where user_id=$1',[user])
 expect(points.rows[0].points).toBe(50)
})
it('deduplicates applications and enforces admin status updates',async()=>{
 const enroll=()=>db.query<{id:string}>("select xr_enroll($1,gen_random_uuid(),'Test','+998901234567','Telegram','{304}') id",[other])
 const a=(await enroll()).rows[0].id
 expect((await enroll()).rows[0].id).toBe(a)
 const status=()=>db.query<{ok:boolean}>("select xr_enrollment_status($1,$2,'trial') ok",[user,a])
 expect((await status()).rows[0].ok).toBe(false)
 await db.query("insert into admin_users values($1,'admin')",[user])
 expect((await status()).rows[0].ok).toBe(true)
 expect((await db.query<{n:number}>('select count(*)::int n from enrollment_status_history where application_id=$1',[a])).rows[0].n).toBe(2)
})

it('stores consent and first touch, rejects stale saves, and unlocks only the intended user contact',async()=>{
 const open=(telegram:number,source:string)=>db.query<{id:string}>(`select public.xr_mvp_open($1,'Test',null,null,'{"step":"goal","age":"adult"}',$2,14,'{}') id`,[telegram,source])
 const start=(await open(301,'src_first')).rows[0].id
 expect((await open(301,'src_second')).rows[0].id).toBe(start)
 const save=(telegram:number,rev:number,state:string)=>db.query<{ok:boolean}>(`select public.xr_mvp_save($1,$2,$3,$4,'test_completed') ok`,[telegram,start,rev,state])
 expect((await save(302,0,'{"step":"short"}')).rows[0].ok).toBe(false)
 expect((await save(301,0,'{"step":"short","contactPending":false}')).rows[0].ok).toBe(true)
 expect((await save(301,0,'{"step":"goal"}')).rows[0].ok).toBe(false)
 const contact=(telegram:number,update:number)=>db.query<{ok:boolean}>(`select public.xr_mvp_bot($1,$2,'contact',null,'+998901234567',null,'{"text":"done"}') ok`,[telegram,update])
 expect((await contact(301,990)).rows[0].ok).toBe(false)
 expect((await save(301,1,'{"step":"short","contactPending":true}')).rows[0].ok).toBe(true)
 expect((await contact(302,990)).rows[0].ok).toBe(false)
 expect((await contact(301,990)).rows[0].ok).toBe(true)
 expect((await contact(301,990)).rows[0].ok).toBe(true)
 const data=await db.query(`select r.source,r.state->>'step' step,u.phone_verified,l.status
  from xr_mvp_runs r join users u on u.id=r.user_id join xr_mvp_leads l on l.run_id=r.id where r.id=$1`,[start])
 expect(data.rows).toEqual([{source:'src_first',step:'report',phone_verified:true,status:'contact'}])
 expect((await open(301,'src_second')).rows[0].id).toBe(start)
})
it('keeps immutable question versions and cancels queued follow-up when a user opts out',async()=>{
 await db.exec(`select public.xr_mvp_import('[{"id":"sample","stem":"Old"}]');
 select public.xr_mvp_import('[{"id":"sample","stem":"New"}]');
 insert into public.telegram_notifications(dedupe_key,chat_id,body) values('mvp-follow:sample:1',301,'{"text":"follow"}');
 select public.xr_mvp_bot(301,991,'stop',null,null,null,'{"text":"stopped"}');`)
 const versions=await db.query(`select item->>'stem' stem,active from xr_mvp_items where id='sample' order by version`)
 expect(versions.rows).toEqual([{stem:'Old',active:false},{stem:'New',active:true}])
 expect((await db.query("select id from telegram_notifications where dedupe_key='mvp-follow:sample:1'")).rows).toEqual([])
})
