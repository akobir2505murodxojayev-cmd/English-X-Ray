import {randomBytes,randomUUID} from 'node:crypto'
import {NextRequest} from 'next/server'
import {z} from 'zod'
import {cookieHash,normalizePhone,validName,verifyInitData} from '../../../lib/auth'
import {adminChats,COOKIE,db,fail,handle,Problem,read,ready,requireOrigin,response,unavailable,viewer} from '../../../lib/db'
import {aiEnabled,queueAi,queueNotifications} from '../../../lib/jobs'
import {makePlan,scoreTest,selectQuestions,skills,streakLength,studyDay,summarize,validAnswer,VERSION,type Answer,type Mode,type Question,type Result} from '../../../lib/engine'

export const maxDuration=60
const uuid=z.uuid()
const idString=z.string().regex(/^[a-zA-Z0-9_-]{1,60}$/)
const text=z.string().trim().min(1)
const answersSchema=z.union([z.string().max(5000),z.array(z.string().max(300)).max(8),z.object({recording:z.string().max(180)})])
const cleanQuestion=({key,...question}:Question)=>{void key;return question}
const reviewKinds=z.enum(['writing','speaking'])
const statusSchema=z.enum(['new','contacted','trial','enrolled','closed'])
function input<T extends z.ZodType>(schema:T,data:unknown):z.infer<T>{
 const result=schema.safeParse(data)
 if(!result.success) return fail(400,'Kiritilgan ma’lumotlarni tekshiring.')
 return result.data
}
function found<T>(value:T):NonNullable<T>{
 if(value==null) return fail(404,'Ma’lumot topilmadi.')
 return value
}
async function state(user:Awaited<ReturnType<typeof viewer>>){
 const c=db()
 const [role,attempts,plan,progress,awards,days,xp,apps,conversation,consent]=await Promise.all([
  read(c.from('admin_users').select('role').eq('user_id',user.id).maybeSingle()),
  read(c.from('diagnostic_sessions').select('id,mode,track,status,created_at,submitted_at,result').eq('user_id',user.id).order('created_at',{ascending:false}).limit(80)),
  read(c.from('learning_plans').select('id,learning_tasks(*)').eq('user_id',user.id).order('created_at',{ascending:false}).limit(1).maybeSingle()),
  read(c.from('material_progress').select('material_id,bookmarked,completed_at').eq('user_id',user.id)),
  read(c.from('user_achievements').select('achievement_id').eq('user_id',user.id)),
  read(c.from('streaks').select('study_day').eq('user_id',user.id).order('study_day',{ascending:false}).limit(400)),
  read(c.rpc('xr_xp_total',{p_user:user.id})),
  read(c.from('enrollment_applications').select('id,status,created_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(20)),
  read(c.from('ai_conversations').select('id').eq('user_id',user.id).maybeSingle()),
  read(c.from('user_consents').select('marketing_opt_in').eq('user_id',user.id).maybeSingle())
 ])
 const chat=conversation?await read(c.from('ai_messages').select('id,input,output,status,tries').eq('conversation_id',conversation.id).order('created_at',{ascending:false}).limit(40)):[]
 const profile={id:user.id,name:user.full_name,phone:user.phone_number,settings:user.settings,timezone:user.timezone,marketing:consent?.marketing_opt_in??false,role:role?.role??'student'}
 const active=(attempts??[]).find(a=>a.status==='active')
 const completed=(attempts??[]).filter(a=>a.status!=='active')
 const dayList=(days??[]).map(d=>d.study_day)
 return {profile,active:active?.id??null,result:completed[0]?.result??null,resultStatus:completed[0]?.status??null,history:completed,
  tasks:(plan?.learning_tasks??[]).sort((a,b)=>a.week-b.week),progress,badges:(awards??[]).map(a=>a.achievement_id),
  activeDays:dayList,streak:streakLength(dayList,studyDay(user.timezone)),xp:Number(xp??0),
  applications:apps,chat:(chat??[]).reverse(),ai:aiEnabled()}
}
async function ownSession(user:string,id:string){
 return found(await read(db().from('diagnostic_sessions').select('*').eq('id',id).eq('user_id',user).maybeSingle()))
}
async function attemptData(user:string,id:string){
 const s=await ownSession(user,id)
 const a=await read(db().from('diagnostic_answers').select('question_id,answer').eq('session_id',id))
 return {id,mode:s.mode,status:s.status,items:(s.items as Question[]).map(cleanQuestion),answers:Object.fromEntries((a??[]).map(row=>[row.question_id,typeof row.answer==='object'&&!Array.isArray(row.answer)?{recording:'saved'}:row.answer])),result:s.result}
}
async function roleFor(user:string){
 return (await read(db().from('admin_users').select('role').eq('user_id',user).maybeSingle()))?.role??'student'
}
async function permitsStudent(actor:string,role:string,target:string){
 if(role==='super_admin'||role==='admin') return
 if(role==='mentor'&&await read(db().from('mentor_assignments').select('student_id').eq('mentor_id',actor).eq('student_id',target).maybeSingle())) return
 fail(403,'Bu talaba ma’lumotiga ruxsat yo‘q.')
}
async function adminState(user:string){
 const c=db(),role=await roleFor(user)
 if(role==='student') return fail(403,'Admin paneliga ruxsat yo‘q.')
 const scope=role==='mentor'?((await read(c.from('mentor_assignments').select('student_id').eq('mentor_id',user)))??[]).map(x=>x.student_id):null
 const students=c.from('users').select(role==='mentor'?'id,full_name,education_category,created_at':'id,full_name,education_category,created_at,phone_number,deletion_requested_at').order('created_at',{ascending:false}).limit(200)
 const attempts=c.from('diagnostic_sessions').select('id,user_id,mode,status,result,submitted_at').neq('status','active').order('submitted_at',{ascending:false}).limit(200)
 const plans=c.from('learning_plans').select('id,user_id,created_at,learning_tasks(week,title,completed_at)').order('created_at',{ascending:false}).limit(200)
 const [s,a,p,enrollment,questions,materials,mentors,assignments]=await Promise.all([
  scope&&!scope.length?[]:read(scope?students.in('id',scope):students),
  scope&&!scope.length?[]:read(scope?attempts.in('user_id',scope):attempts),
  scope&&!scope.length?[]:read(scope?plans.in('user_id',scope):plans),
  scope?[]:read(c.from('enrollment_applications').select('*,enrollment_status_history(status,created_at)').order('created_at',{ascending:false}).limit(200)),
  scope?[]:read(c.from('diagnostic_questions').select('*').order('id').limit(500)),
  scope?[]:read(c.from('study_materials').select('*').order('title').limit(200)),
  scope?[]:read(c.from('admin_users').select('user_id,role,users(full_name)').eq('role','mentor')),
  scope?[]:read(c.from('mentor_assignments').select('*'))
 ])
 return {role,students:s,attempts:a,plans:p,enrollment,questions,materials,mentors,assignments}
}

export async function GET(req:NextRequest){
 try{
  const u=await viewer(req),q=req.nextUrl.searchParams,c=db()
  switch(q.get('action')){
   case 'attempt':return response(await attemptData(u.id,input(uuid,q.get('id'))))
   case 'materials':return response(await read(c.from('study_materials').select('id,category,title,description,kind,content,asset_path').eq('active',true).order('title')))
   case 'material':{
    const m=found(await read(c.from('study_materials').select('*').eq('active',true).eq('id',input(idString,q.get('id'))).maybeSingle()))
    if(!m.asset_path||m.asset_path.startsWith('/audio/')) return response({url:m.asset_path})
    return response({url:found(await read(c.storage.from('xray-materials').createSignedUrl(m.asset_path,90,{download:q.get('download')==='1'}))).signedUrl})
   }
   case 'admin':return response(await adminState(u.id))
   case 'review':{
    const id=input(uuid,q.get('id'))
    const s=found(await read(c.from('diagnostic_sessions').select('id,user_id,status,items,result').eq('id',id).maybeSingle()))
    await permitsStudent(u.id,await roleFor(u.id),s.user_id)
    if(s.status==='active') return fail(409,'Test hali yakunlanmagan.')
    const answers=await read(c.from('diagnostic_answers').select('question_id,answer').eq('session_id',id))
    const items=(s.items as Question[]).filter(x=>x.kind==='writing'||x.kind==='speaking')
    return response(await Promise.all(items.map(async question=>{
     const answer=answers?.find(x=>x.question_id===question.id)?.answer
     const url=question.kind==='speaking'&&answer?.recording?found(await read(c.storage.from('xray-recordings').createSignedUrl(answer.recording,120))).signedUrl:null
     return {question:cleanQuestion(question),answer:typeof answer==='string'?answer:null,url,previous:s.result?.skills[question.skill]?.feedback}
    })))
   }
   default:return response(await state(u))
  }
 }catch(e){return handle(e)}
}

export async function POST(req:NextRequest){
 try{
  requireOrigin(req)
  const action=req.nextUrl.searchParams.get('action')
  if(!ready()) return unavailable()
  const c=db()
  if(action==='login'){
   const raw=input(z.object({initData:z.string().max(16000)}),await req.json()).initData
   const token=process.env.TELEGRAM_BOT_TOKEN,secret=process.env.SESSION_SECRET
   if(!token||!secret||secret.length<32) return unavailable()
   const identity=verifyInitData(raw,token)
   if(!identity) return fail(401,'Telegram tasdiqlovi eskirgan yoki yaroqsiz. Ilovani qayta oching.')
   const u=await read(c.from('users').select('id,deletion_requested_at').eq('telegram_id',identity.id).eq('registration_completed',true).maybeSingle())
   if(!u||u.deletion_requested_at) return fail(403,u?.deletion_requested_at?'Hisobni o‘chirish so‘rovi qabul qilingan.':'Avval botda ro‘yxatdan o‘ting.')
   const existing=req.cookies.get(COOKIE)?.value
   if(existing){
    const session=await read(c.from('app_sessions').select('user_id').eq('token_hash',cookieHash(existing,secret)).gt('expires_at',new Date().toISOString()).maybeSingle())
    if(session?.user_id===u.id) return response({ok:true,photo:identity.photo})
   }
   const session=randomBytes(32).toString('hex'),expires=new Date(Date.now()+1000*60*60*24*7)
   await read(c.from('app_sessions').insert({user_id:u.id,init_hash:identity.hash,token_hash:cookieHash(session,secret),expires_at:expires.toISOString()}))
   const reply=response({ok:true,photo:identity.photo})
   reply.cookies.set(COOKIE,session,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',expires})
   return reply
  }
  const u=await viewer(req)
  if(!await read(c.rpc('xr_limit',{p_bucket:'user:'+u.id,p_max:120,p_window:60}))) return fail(429,'Biroz kutib, yana urinib ko‘ring.')
  if(action==='record'){
   const form=await req.formData(),file=form.get('audio')
   const id=input(uuid,form.get('session')),qid=input(idString,form.get('question'))
   const s=await ownSession(u.id,id)
   if(s.status!=='active'||!(s.items as Question[]).some(q=>q.id===qid&&q.kind==='speaking')) return fail(409,'Bu topshiriq ovozli javob qabul qilmaydi.')
   if(!(file instanceof File)||file.size<256||file.size>4000000) return fail(400,'Ovozli fayl 4 MB dan kichik bo‘lishi kerak.')
   const mime=file.type.split(';')[0]
   const types:Record<string,string>={'audio/webm':'webm','audio/mp4':'m4a','audio/ogg':'ogg','audio/wav':'wav'}
   const ext=types[mime]
   if(!ext) return fail(400,'Ovozli fayl formati qo‘llanmaydi.')
   const header=Buffer.from(await file.slice(0,12).arrayBuffer())
   const matches=ext==='webm'?header.subarray(0,4).equals(Buffer.from([26,69,223,163])):ext==='m4a'?header.toString('ascii',4,8)==='ftyp':ext==='ogg'?header.toString('ascii',0,4)==='OggS':header.toString('ascii',0,4)==='RIFF'&&header.toString('ascii',8,12)==='WAVE'
   if(!matches) return fail(400,'Fayl ovoz formati sifatida tasdiqlanmadi.')
   const path=u.id+'/'+id+'/'+qid+'/'+randomUUID()+'.'+ext
   await read(c.storage.from('xray-recordings').upload(path,file,{contentType:mime}))
   try{
    if(!await read(c.rpc('xr_answer',{p_user:u.id,p_session:id,p_question:qid,p_answer:{recording:path}}))) fail(409,'Test yakunlangan.')
   }catch(e){await c.storage.from('xray-recordings').remove([path]);throw e}
   return response({answer:{recording:'saved'}})
  }
  const body:Record<string,unknown>=input(z.record(z.string(),z.unknown()),await req.json())
  switch(action){
   case 'start':{
    const {mode,track}=input(z.object({mode:z.enum(['quick','full','certificate']),track:z.enum(['CEFR','IELTS']).optional()}),body)
    const active=await read(c.from('diagnostic_sessions').select('id').eq('user_id',u.id).eq('status','active').maybeSingle())
    if(active) return response(await attemptData(u.id,active.id))
    const bank=await read(c.from('diagnostic_questions').select('*').eq('active',true))
    const last=(await read(c.from('diagnostic_sessions').select('result').eq('user_id',u.id).neq('status','active').order('submitted_at',{ascending:false}).limit(1)))?.[0]?.result?.level
    const target=last?['A1','A2','B1','B2','C1'].indexOf(last)+1:u.self_reported_level==='Boshlang‘ich'?1:u.self_reported_level==='Yaxshi'?4:3
    const items=selectQuestions(bank as Question[],mode,target)
    if(items.length<4) return unavailable()
    try{
     const attempt=await read(c.from('diagnostic_sessions').insert({user_id:u.id,mode,track:mode==='certificate'?track??'CEFR':null,items,scoring_version:VERSION}).select('id').single())
     return response(await attemptData(u.id,found(attempt).id))
    }catch(e){
     if(e instanceof Problem&&e.status===409){
      const existing=found(await read(c.from('diagnostic_sessions').select('id').eq('user_id',u.id).eq('status','active').maybeSingle()))
      return response(await attemptData(u.id,existing.id))
     }
     throw e
    }
   }
   case 'answer':{
    const {session,question,answer}=input(z.object({session:uuid,question:idString,answer:z.union([z.string().max(5000),z.array(z.string().max(300)).max(8)])}),body)
    const s=await ownSession(u.id,session),q=found((s.items as Question[]).find(x=>x.id===question))
    if(!validAnswer(q,answer)) return fail(400,'Javobni tekshiring.')
    if(!await read(c.rpc('xr_answer',{p_user:u.id,p_session:session,p_question:question,p_answer:answer}))) return fail(409,'Test yakunlangan.')
    return response({ok:true})
   }
   case 'submit':{
    const id=input(uuid,body.id),s=await ownSession(u.id,id)
    if(s.status!=='active') return response({result:s.result,status:s.status})
    const items=s.items as Question[]
    const list=await read(c.from('diagnostic_answers').select('question_id,answer').eq('session_id',id))
    const answers=Object.fromEntries((list??[]).map(row=>[row.question_id,input(answersSchema,row.answer)])) as Record<string,Answer>
    if(items.some(q=>!answers[q.id]||!validAnswer(q,answers[q.id]))) return fail(400,'Avval barcha savollarga javob bering.')
    const result=scoreTest(items,answers,s.mode as Mode),status=items.some(q=>q.kind==='speaking'||q.kind==='writing')?'review':'complete'
    if(!await read(c.rpc('xr_finish',{p_user:u.id,p_session:id,p_snapshot:answers,p_result:result,p_tasks:makePlan(result,u.learning_goals,u.settings.minutes,u.settings.deadline),p_status:status}))) return fail(409,'Javoblar o‘zgardi. Testni qayta yakunlang.')
    const saved=await ownSession(u.id,id)
    return response({result:saved.result,status:saved.status})
   }
   case 'task':{
    if(!await read(c.rpc('xr_task',{p_user:u.id,p_task:input(uuid,body.id)}))) return fail(404,'Vazifa topilmadi.')
    return response({ok:true})
   }
   case 'material':{
    const {id,bookmark,complete}=input(z.object({id:idString,bookmark:z.boolean().optional(),complete:z.literal(true).optional()}),body)
    found(await read(c.from('study_materials').select('id').eq('id',id).eq('active',true).maybeSingle()))
    if(bookmark!==undefined) await read(c.from('material_progress').upsert({user_id:u.id,material_id:id,bookmarked:bookmark},{onConflict:'user_id,material_id',defaultToNull:false}))
    if(complete) await read(c.rpc('xr_material_done',{p_user:u.id,p_material:id}))
    return response({ok:true})
   }
   case 'enroll':{
    const data=input(z.object({id:uuid,name:text.max(80),phone:text.max(30),method:z.enum(['Telefon','Telegram']),consent:z.literal(true)}),body)
    const phone=normalizePhone(data.phone)
    if(!phone||!validName(data.name)) return fail(400,'Ism yoki telefon raqamini tekshiring.')
    const id=found(await read(c.rpc('xr_enroll',{p_user:u.id,p_id:data.id,p_name:data.name,p_phone:phone,p_method:data.method,p_chats:adminChats()})))
    queueNotifications('enrollment:'+id)
    return response({id})
   }
   case 'settings':{
    const v=input(z.object({notifications:z.boolean(),reminders:z.boolean(),marketing:z.boolean(),minutes:z.number().int().min(10).max(90),deadline:z.iso.date().or(z.literal('')).optional(),language:z.enum(['uz','en']),timezone:z.string().max(80)}),body)
    try{studyDay(v.timezone)}catch{return fail(400,'Vaqt mintaqasi noto‘g‘ri.')}
    const {marketing,timezone,...settings}=v
    await read(c.from('users').update({settings,timezone,updated_at:new Date().toISOString()}).eq('id',u.id))
    await read(c.from('user_consents').update({marketing_opt_in:marketing,marketing_consent_updated_at:new Date().toISOString()}).eq('user_id',u.id))
    return response({ok:true})
   }
   case 'delete':{
    input(z.literal(true),body.confirm)
    await read(c.from('users').update({deletion_requested_at:new Date().toISOString()}).eq('id',u.id))
    await read(c.from('app_sessions').delete().eq('user_id',u.id))
    const r=response({ok:true});r.cookies.delete(COOKIE);return r
   }
   case 'chat':{
    if(!aiEnabled()) return unavailable()
    const {id,message,retry}=input(z.object({id:uuid,message:text.max(1500).optional(),retry:z.boolean().optional()}),body)
    if(!await read(c.rpc('xr_limit',{p_bucket:'ai:'+u.id,p_max:20,p_window:86400}))) return fail(429,'Bugungi Mentor limiti tugadi.')
    await read(c.from('ai_conversations').upsert({user_id:u.id},{onConflict:'user_id',ignoreDuplicates:true}))
    const conv=found(await read(c.from('ai_conversations').select('id').eq('user_id',u.id).maybeSingle()))
    if(retry){
     const pending=await read(c.from('ai_messages').update({status:'queued',updated_at:new Date().toISOString()}).eq('id',id).eq('conversation_id',conv.id).eq('status','failed').lt('tries',4).select('id').maybeSingle())
     if(!pending) return fail(409,'Bu xabarni qayta yuborib bo‘lmaydi.')
     queueAi(id);return response({id})
    }
    if(!message) return fail(400,'Xabar yozing.')
    await read(c.from('ai_messages').upsert({conversation_id:conv.id,client_id:id,input:message},{onConflict:'conversation_id,client_id',ignoreDuplicates:true}))
    const job=found(await read(c.from('ai_messages').select('id').eq('conversation_id',conv.id).eq('client_id',id).maybeSingle()))
    queueAi(job.id);return response(job)
   }
   case 'review':{
    const {id,skill,rubric,feedback}=input(z.object({id:uuid,skill:reviewKinds,rubric:z.array(z.number().int().min(0).max(5)).length(4),feedback:text.max(1600)}),body)
    const s=found(await read(c.from('diagnostic_sessions').select('*').eq('id',id).maybeSingle()))
    await permitsStudent(u.id,await roleFor(u.id),s.user_id)
    if(s.status==='active'||!s.result?.skills[skill]?.items.length) return fail(409,'Bu ko‘nikma bo‘yicha topshiriq yo‘q.')
    const result=s.result as Result,detail={...result.skills[skill],score:5*rubric.reduce((a,b)=>a+b,0),feedback}
    const next=summarize({...result.skills,[skill]:detail},s.mode)
    const status=next.skills.writing.score!==null&&next.skills.speaking.score!==null?'complete':'review'
    const student=found(await read(c.from('users').select('learning_goals,settings').eq('id',s.user_id).maybeSingle()))
    if(!await read(c.rpc('xr_review',{p_actor:u.id,p_session:id,p_skill:skill,p_rubric:rubric,p_feedback:feedback,p_detail:detail,p_expected:result,p_result:next,p_status:status,p_tasks:makePlan(next,student.learning_goals,student.settings.minutes,student.settings.deadline)}))) return fail(409,'Natija yangilangan. Sahifani qayta yuklang.')
    return response({ok:true})
   }
  }
  const role=await roleFor(u.id)
  if(role!=='admin'&&role!=='super_admin') return fail(403,'Bu amal uchun ruxsat yo‘q.')
  if(action==='erase'){
   if(role!=='super_admin') return fail(403,'Faqat super admin o‘chira oladi.')
   const id=input(uuid,body.id)
   const target=found(await read(c.from('users').select('deletion_requested_at').eq('id',id).maybeSingle()))
   if(!target.deletion_requested_at) return fail(409,'O‘chirish so‘rovi topilmadi.')
   const storage=c.storage.from('xray-recordings')
   const sessions=found(await read(storage.list(id,{limit:1000})))
   for(const session of sessions){
    const path=id+'/'+session.name
    const folders=found(await read(storage.list(path,{limit:1000})))
    for(const folder of folders){
     const sub=path+'/'+folder.name
     const files=found(await read(storage.list(sub,{limit:1000})))
     if(files.length) await read(storage.remove(files.map(f=>sub+'/'+f.name)))
    }
   }
   if(!await read(c.rpc('xr_delete_account',{p_actor:u.id,p_target:id}))) return fail(409,'O‘chirish so‘rovi o‘zgardi.')
   return response({ok:true})
  }
  if(action==='enrollment-status'){
   const {id,status}=input(z.object({id:uuid,status:statusSchema}),body)
   if(!await read(c.rpc('xr_enrollment_status',{p_actor:u.id,p_id:id,p_status:status}))) return fail(404,'Ariza topilmadi.')
   return response({ok:true})
  }
  if(action==='assignment'){
   const {student,mentor}=input(z.object({student:uuid,mentor:uuid.nullable()}),body)
   if(mentor){
    if(await roleFor(mentor)!=='mentor') return fail(400,'Mentor tanlang.')
    await read(c.from('mentor_assignments').upsert({student_id:student,mentor_id:mentor},{onConflict:'student_id'}))
   }else await read(c.from('mentor_assignments').delete().eq('student_id',student))
   await read(c.from('audit_logs').insert({actor_id:u.id,action:'mentor_assignment',target_id:student}))
   return response({ok:true})
  }
  if(action==='question-save'){
   const data=input(z.object({id:idString,skill:z.enum(skills),kind:z.enum(['single','multiple','blank','writing','speaking']),difficulty:z.number().int().min(1).max(6),topic:text.max(120),prompt:text.max(2000),options:z.array(text.max(300)).max(8).nullable(),key:z.array(text.max(300)).max(8).nullable(),stimulus:z.string().max(8000).nullable(),audio:z.string().regex(/^\/audio\/[a-zA-Z0-9_-]+\.mp3$/).nullable(),active:z.boolean()}),body)
   const objective=!['speaking','writing'].includes(data.kind)
   if((data.skill==='speaking'||data.skill==='writing')?data.skill!==data.kind:!objective) return fail(400,'Ko‘nikma va savol turini tekshiring.')
   if(objective&&(!data.key?.length||((data.kind==='single'||data.kind==='multiple')&&(!data.options||data.options.length<2||data.key.some(k=>!data.options?.includes(k)))))) return fail(400,'Javob kalitini tekshiring.')
   await read(c.from('diagnostic_questions').upsert(data))
   await read(c.from('audit_logs').insert({actor_id:u.id,action:'question_save'}))
   return response({ok:true})
  }
  if(action==='material-save'){
   const data=input(z.object({id:idString,category:z.enum(skills),title:text.max(160),description:text.max(500),kind:z.enum(['text','pdf','audio','video','exercise']),content:z.string().max(12000).nullable(),asset_path:z.string().regex(/^(?:\/audio\/[a-z0-9_-]+\.mp3|[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_.-]+)+)$/).nullable(),active:z.boolean()}),body)
   if(!data.content&&!data.asset_path) return fail(400,'Material matni yoki fayl manzilini kiriting.')
   await read(c.from('study_materials').upsert(data))
   await read(c.from('audit_logs').insert({actor_id:u.id,action:'material_save'}))
   return response({ok:true})
  }
  return fail(404,'Amal topilmadi.')
 }catch(e){return handle(e)}
}
