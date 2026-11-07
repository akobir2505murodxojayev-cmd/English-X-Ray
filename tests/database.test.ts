import {readFileSync,readdirSync} from 'node:fs'
import {PGlite} from '@electric-sql/pglite'
import {afterAll,beforeAll,expect,it} from 'vitest'
const db=new PGlite()
let user:string,other:string
beforeAll(async()=>{
 await db.exec('create role anon; create role authenticated; create role service_role bypassrls; create schema storage; create table storage.buckets(id text primary key,name text,public bool,file_size_limit bigint,allowed_mime_types text[]);')
 const dir='supabase/migrations'
 await db.exec(readFileSync(dir+'/'+readdirSync(dir)[0],'utf8'))
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
