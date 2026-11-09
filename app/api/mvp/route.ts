import {randomUUID} from 'node:crypto'
import {NextRequest} from 'next/server'
import {z} from 'zod'
import {adminChats,db,fail,handle,read,requireOrigin,response} from '../../../lib/db'
import {cookieHash,equal,normalizePhone,validName,verifyInitData} from '../../../lib/auth'
import {queueNotifications,telegram} from '../../../lib/jobs'
import {chooseItems,chooseModule,score} from '../../../lib/mvp/engine'
import {mediaStimuli} from '../../../lib/mvp/content'
import {actor,bank,config,finish,latest,mustStaff,presented,reportBody,staffRole,stimuli,type Run} from '../../../lib/mvp/server'
import {deadlines,experience,goals,profiles,selfLevels,targets,type Stored} from '../../../lib/mvp/model'

const contextSchema=z.object({experience:z.number().int().min(0).max(experience.length-1),deadline:z.number().int().min(0).max(deadlines.length-1),self:z.number().int().min(0).max(selfLevels.length-1),target:z.string().max(12).optional()})
const phoneSchema=z.string().trim().max(32)
const idSchema=z.uuid()
const roleNames=['new','contact','requested','scheduled','attended','enrolled','declined','closed'] as const
const profileIds=Object.keys(profiles) as (keyof typeof profiles)[]
const int=(min:number,max:number)=>z.number().int().min(min).max(max)
const unique=(items:string[])=>new Set(items).size===items.length
const configSchema=z.object({routing:z.tuple([int(0,6),int(1,7)]),bands:z.tuple([int(1,97),int(2,98),int(3,100)]),retestDays:int(1,180),
 priority:z.array(z.enum(['grammar','vocabulary','reading','listening'])).length(4).refine(unique),
 profileOrder:z.array(z.enum(profileIds)).length(profileIds.length).refine(unique),price:z.string().trim().min(1).max(100),fullTerms:z.string().trim().min(1).max(500),
 followups:z.array(z.object({day:int(1,90),text:z.string().trim().min(1).max(800)})).max(15)})
 .refine(c=>c.routing[0]<c.routing[1]&&c.bands[0]<c.bands[1]&&c.bands[1]<c.bands[2]&&unique(c.followups.map(f=>String(f.day))))
const itemSchema=z.object({id:z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),skill:z.enum(['grammar','vocabulary','reading','listening']),level:z.enum(['A2','B1','B2','C1']),module:z.enum(['routing','A','B','C']),
 topic:z.string().min(1).max(90),topicUz:z.string().min(1).max(90),stem:z.string().min(1).max(500),options:z.array(z.string().min(1).max(220)).min(3).max(4).refine(unique),correct:int(0,3),why:z.string().min(1).max(800),
 weight:z.number().positive().max(10).optional(),errors:z.array(z.string().max(80)).max(4).optional(),group:z.string().max(35).optional(),active:z.boolean().optional()})
 .refine(q=>q.correct<q.options.length&&((q.skill==='grammar'||q.skill==='vocabulary')||q.group===q.skill+'-'+q.module&&q.group in mediaStimuli))
function parse<T extends z.ZodType>(schema:T, data:unknown):z.infer<T>{
 const r=schema.safeParse(data)
 if(!r.success)return fail(400,'Kiritilgan ma’lumotlarni tekshiring.')
 return r.data
}
const standardUrl=()=>process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/,'')??''
export async function POST(req:NextRequest){
 try{
  requireOrigin(req)
  const raw=req.headers.get('x-telegram-init-data')??'',token=process.env.TELEGRAM_BOT_TOKEN??''
  const sessionSecret=process.env.SESSION_SECRET
  if(!sessionSecret||sessionSecret.length<32)return fail(503,'Mini App sessiyasi sozlanmagan.')
  const fresh=verifyInitData(raw,token),identity=fresh??verifyInitData(raw,token,undefined,8*3600)
  const ticket=identity?cookieHash('mvp:'+identity.hash,sessionSecret):''
  if(!identity||(!fresh&&!equal(ticket,req.cookies.get('xray_mvp')?.value??'')))return fail(401,'Telegram tasdiqlovi topilmadi yoki eskirgan. Mini App’ni qayta oching.')
  const client=db(),action=req.nextUrl.searchParams.get('action')??'state'
  if(!await read(client.rpc('xr_limit',{p_bucket:'mvp:'+identity.id,p_max:100,p_window:60})))return fail(429,'Biroz kutib, qayta urinib ko‘ring.')
  const [u,c]=await Promise.all([actor(identity.id),config()])
  if(u?.deletion_requested_at)return fail(403,'Hisobni o‘chirish so‘rovi qabul qilingan.')
  let run=u?await latest(u.id):null
  if(action==='state'||action==='consent'){
   if(action==='consent'){
    const a=parse(z.object({age:z.enum(['minor','adult']),guardian:z.boolean(),accepted:z.literal(true),marketing:z.boolean(),device:z.object({platform:z.string().max(32),version:z.string().max(20)}).optional()}),await req.json())
    if(a.age==='minor'&&!a.guardian)return fail(400,'Ota-ona yoki vasiy roziligi kerak.')
    const first:Stored={step:'goal',age:a.age,guardian:a.guardian,marketing:a.marketing,items:[],answers:[],playCount:0,audioFailures:0}
    const id=await read(client.rpc('xr_mvp_open',{p_telegram:identity.id,p_first:identity.first,p_last:identity.last,p_username:identity.username,p_state:first,p_source:identity.source,p_days:c.retestDays,p_device:a.device??{}}))
    if(!id)return fail(403,'Diagnostika ochilmadi.')
    run=await read(client.from('xr_mvp_runs').select('*').eq('id',id).single()) as Run
   }
   const reply=response(await presented(run,c,u?.full_name??identity.first,!!(u&&await staffRole(u.id))))
   if(fresh)reply.cookies.set('xray_mvp',ticket,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',maxAge:8*3600,path:'/'})
   return reply
  }
  if(action.startsWith('admin-')){
   const staff=await mustStaff(u?.id,['admin-load','admin-voice','admin-review'].includes(action))
   if(action==='admin-media'){
    const form=await req.formData()
    const group=parse(z.enum(['reading-A','reading-B','reading-C','listening-A','listening-B','listening-C']),form.get('group'))
    const title=parse(z.string().trim().min(2).max(100),form.get('title'))
    if(group.startsWith('reading')){
     const text=parse(z.string().trim().min(200).max(4000).refine(v=>v.split(/\s+/).length>=120&&v.split(/\s+/).length<=250),form.get('text'))
     await read(client.from('xr_mvp_media').upsert({id:group,value:{title,text}}))
    }else{
     const file=form.get('file')
     if(!(file instanceof File)||file.size<1000||file.size>1500000)return fail(400,'MP3 fayli 1,5 MB dan oshmasligi kerak.')
     const header=Buffer.from(await file.slice(0,3).arrayBuffer())
     if(header.toString('ascii')!=='ID3'&&(header[0]!==255||(header[1]&224)!==224))return fail(400,'MP3 formatini tekshiring.')
     const audio='mvp/'+group+'/'+randomUUID()+'.mp3'
     const storage=client.storage.from('xray-materials')
     await read(storage.upload(audio,file,{contentType:'audio/mpeg'}))
     try{await read(client.from('xr_mvp_media').upsert({id:group,value:{title,audio}}))}
     catch(e){await storage.remove([audio]);throw e}
    }
    return response({ok:true})
   }
   const body=await req.json()
   if(action==='admin-load'){
    const base=client.from('xr_mvp_runs').select('id,user_id,source,created_at,completed_at,state,users(full_name,phone_number),xr_mvp_leads(*)').order('created_at',{ascending:false}).limit(200)
    const assigned=staff==='mentor'?await read(client.from('mentor_assignments').select('student_id').eq('mentor_id',u!.id)):null
    const records=staff==='mentor'&&!assigned?.length?[]:await read(assigned?base.in('user_id',assigned.map(x=>x.student_id)):base)
    const rows=(records??[]).map(x=>({id:x.id,source:x.source,created_at:x.created_at,completed_at:x.completed_at,
     user:staff==='mentor'?{full_name:(x.users as unknown as {full_name:string})?.full_name}:x.users,lead:x.xr_mvp_leads,
     goal:x.state.goal,report:x.state.report,review:x.state.review,voice:!!x.state.voice,step:x.state.step,answers:x.state.answers.map((a:{item:string;choice:number|null;ms:number})=>({item:a.item,choice:a.choice,ms:a.ms}))}))
    return response({rows,config:c,role:staff,items:staff==='mentor'?[]:await bank()})
   }
   if(action==='admin-config'){
    await read(client.from('xr_mvp_config').upsert({id:true,value:parse(configSchema,body)}))
    return response({ok:true})
   }
   if(action==='admin-import'){
    const items=parse(z.array(itemSchema).min(1).max(500).refine(items=>unique(items.map(x=>x.id))),body)
    return response({count:await read(client.rpc('xr_mvp_import',{p_items:items}))})
   }
   if(action==='admin-lead'){
    const a=parse(z.object({id:idSchema,status:z.enum(roleNames),notes:z.string().max(2000)}),body)
    if(!await read(client.rpc('xr_mvp_admin_lead',{p_actor:u!.id,p_run:a.id,p_status:a.status,p_notes:a.notes})))return fail(404,'Lead topilmadi.')
    return response({ok:true})
   }
   if(['admin-voice','admin-review','admin-recompute'].includes(action)){
    const a=parse(z.object({id:idSchema,review:z.string().trim().min(8).max(1800).optional()}),body)
    const row=await read(client.from('xr_mvp_runs').select('*,users(telegram_id,deletion_requested_at)').eq('id',a.id).maybeSingle())
    if(!row||row.users?.deletion_requested_at)return fail(404,'Diagnostika topilmadi.')
    if(staff==='mentor'&&!await read(client.from('mentor_assignments').select('student_id').eq('mentor_id',u!.id).eq('student_id',row.user_id).maybeSingle()))return fail(403,'Bu o‘quvchi sizga biriktirilmagan.')
    const s=row.state as Stored
    if(action==='admin-voice'){
     if(!s.voice)return fail(404,'Ovoz topilmadi.')
     if(s.voiceType==='storage'){
      const signed=await read(client.storage.from('xray-recordings').createSignedUrl(s.voice,120))
      return response({url:signed?.signedUrl})
     }
     const file=await telegram().getFile(s.voice)
     const recording=await fetch('https://api.telegram.org/file/bot'+process.env.TELEGRAM_BOT_TOKEN+'/'+file.file_path,{signal:AbortSignal.timeout(10000),redirect:'error'})
     if(!recording.ok)return fail(502,'Ovoz yozuvini yuklab bo‘lmadi.')
     return new Response(recording.body,{headers:{'Content-Type':'audio/ogg','Cache-Control':'no-store'}})
    }
    if(action==='admin-recompute'){
     if(!row.completed_at)return fail(409,'Test yakunlanmagan.')
     const next={...s,report:score(s.items,s.answers,s,c)}
     if(!await read(client.rpc('xr_mvp_save',{p_telegram:row.users?.telegram_id,p_run:row.id,p_revision:row.revision,p_state:next,p_event:'report_recomputed'})))return fail(409,'Sessiya yangilangan.')
     return response({ok:true})
    }
    if(!a.review||!s.voice)return fail(400,'Ovoz va metodist izohi kerak.')
    if(!await read(client.rpc('xr_mvp_save',{p_telegram:row.users?.telegram_id,p_run:row.id,p_revision:row.revision,p_state:{...s,review:a.review},p_event:'mentor_reviewed'})))return fail(409,'Sessiya yangilangan.')
    const key='mvp-review:'+a.id+':'+row.revision
    await read(client.from('telegram_notifications').upsert({dedupe_key:key,chat_id:row.users?.telegram_id,body:{text:'Sandbox LC metodisti izohi\n\n'+a.review}},{onConflict:'dedupe_key',ignoreDuplicates:true}))
    queueNotifications(key)
    return response({ok:true})
   }
   return fail(404,'Amal topilmadi.')
  }
  if(!u||!run)return fail(409,'Avval diagnostikani boshlang.')
  const row=run
  let s=row.state
  const current=s.items[s.answers.length]
  const save=async(state:Stored,event:string,detail:unknown={},phone?:string,booking?:unknown)=>{
   if(!await read(client.rpc('xr_mvp_save',{p_telegram:identity.id,p_run:row.id,p_revision:row.revision,p_state:state,p_event:event,p_detail:detail,p_phone:phone??null,p_booking:booking??null})))return fail(409,'Bu ekran yangilangan. Qayta oching.')
   return response(await presented((await latest(row.user_id))!,c,u.full_name))
  }
  if(action==='voice'){
   if(s.step!=='speaking'||s.age!=='adult')return fail(403,'Ovoz yozish bu sessiyada yopiq.')
   const form=await req.formData()
   const file=form.get('audio')
   if(!(file instanceof File)||file.size<256||file.size>3500000)return fail(400,'Ovoz fayli hajmi noto‘g‘ri.')
   const mime=file.type.split(';')[0]
   const types:Record<string,string>={'audio/webm':'webm','audio/mp4':'m4a','audio/ogg':'ogg'}
   const ext=types[mime]
   const header=Buffer.from(await file.slice(0,12).arrayBuffer())
   const valid=ext==='webm'?header.subarray(0,4).equals(Buffer.from([26,69,223,163])):ext==='m4a'?header.toString('ascii',4,8)==='ftyp':ext==='ogg'&&header.toString('ascii',0,4)==='OggS'
   if(!valid)return fail(400,'Ovoz formati qo‘llanmaydi.')
   const path=u.id+'/'+row.id+'/mvp/'+randomUUID()+'.'+ext
   const storage=client.storage.from('xray-recordings')
   await read(storage.upload(path,file,{contentType:mime}))
   let reply
   try{reply=await save({...s,voice:path,voiceType:'storage',voicePending:false},'voice_received')}
   catch(e){await storage.remove([path]);throw e}
   if(s.voice&&s.voiceType==='storage')await storage.remove([s.voice])
   return reply
  }
  const body=parse(z.record(z.string(),z.unknown()),await req.json())
  if(body.revision!==row.revision)return fail(409,'Bu ekran yangilangan. Qayta oching.')
  if(action==='goal'&&s.step==='goal'){
   const goal=parse(int(0,goals.length-1),body.goal)
   return save({...s,step:'context',goal},'goal_selected',{goal})
  }
  if(action==='context'&&s.step==='context'){
   const ctx=parse(contextSchema,body.context)
   if((s.goal===0||s.goal===1)&&!targets[s.goal].some(t=>t===ctx.target))return fail(400,'Maqsad natijasini tanlang.')
   const questions=chooseItems(await bank(),'routing',8,ctx.self)
   return save({...s,step:'test',context:ctx,items:questions,stimuli:await stimuli()},'test_started')
  }
  if(action==='answer'&&s.step==='test'&&current){
   const a=parse(z.object({item:z.string(),choice:int(0,3).nullable(),ms:int(0,86400000)}),body)
   if(a.item!==current.id||(a.choice!==null&&a.choice>=current.options.length))return fail(409,'Savol yangilangan.')
   const index=s.answers.length+1
   s={...s,answers:[...s.answers,{item:a.item,choice:a.choice,ms:a.ms}]}
   let event='answer_saved'
   if(index===8){
    const correct=s.answers.filter((a,i)=>a.choice===s.items[i].correct).length
    const nextModule=chooseModule(correct,c.routing)
    s={...s,module:nextModule,items:[...s.items,...chooseItems(await bank(),nextModule,12)]}
   }else if(index===20){
    const score=s.answers.slice(8).filter((a,i)=>a.choice===s.items[i+8].correct).length
    const modules=['A','B','C'] as const
    const difficulty=modules.indexOf(s.module??'A')
    const mediaModule=modules[Math.min(2,Math.max(0,difficulty+(score>=10?1:score<=4?-1:0)))]
    const items=(await bank()).filter(q=>q.group==='reading-'+mediaModule||q.group==='listening-'+mediaModule)
    const ordered=['reading','listening'].flatMap(skill=>items.filter(q=>q.skill===skill).slice(0,5))
    if(ordered.length!==10)return fail(503,'Matn yoki audio savollari yetishmayapti.')
    s={...s,items:[...s.items,...ordered],mediaModule};event='section_completed'
   }else if(index===25)event='section_completed'
   else if(index===30){s=s.age==='minor'?finish(s,c):{...s,step:'speaking'};event=s.step==='short'?'test_completed':'section_completed'}
   return save(s,event,{section:current.skill,item:a.item})
  }
  if(action==='audio-play'&&s.step==='test'&&current?.skill==='listening'){
   if(s.playCount>=2)return fail(409,'Ikki tinglashdan foydalanilgan.')
   return save({...s,playCount:s.playCount+1},'audio_started')
  }
  if(action==='audio-error'&&s.step==='test'&&current?.skill==='listening'){
   const next={...s,audioFailures:s.audioFailures+1,playCount:Math.max(0,s.playCount-1)}
   if(next.audioFailures<2)return save(next,'audio_failed')
   const kept=next.items.filter(q=>q.skill!=='listening')
   const filtered={...next,items:kept,answers:next.answers.filter(a=>kept.some(q=>q.id===a.item))}
   return save(s.age==='minor'?finish(filtered,c):{...filtered,step:'speaking'},s.age==='minor'?'test_completed':'section_completed',{section:'listening',skipped:true})
  }
  if(action==='voice-pending'&&s.step==='speaking'&&s.age==='adult')return save({...s,voicePending:true},'voice_requested')
  if(action==='speaking-done'&&s.step==='speaking')return save(finish({...s,voicePending:false},c),'test_completed')
  if(action==='contact-request'&&s.step==='short')return save({...s,contactPending:true},'contact_requested')
  if(action==='contact-manual'&&s.step==='short'){
   const value=parse(phoneSchema,body.phone)
   const phone=normalizePhone(value)
   if(!phone||!/^\+998\d{9}$/.test(phone))return fail(400,'Telefonni +998 XX XXX XX XX shaklida kiriting.')
   return save({...s,step:'report',contactPending:false},'contact_manual',{},phone)
  }
  if(action==='report-send'&&(s.step==='report'||s.step==='booked')){
   const url=standardUrl()
   if(!url.startsWith('https://'))return fail(503,'Bot manzili sozlanmagan.')
   const key='mvp-report:'+row.id
   await read(client.from('telegram_notifications').upsert({dedupe_key:key,chat_id:identity.id,body:reportBody(s,url)},{onConflict:'dedupe_key',ignoreDuplicates:true}))
   queueNotifications(key)
   return response(await presented(row,c,u.full_name))
  }
  if(action==='booking'&&s.step==='report'){
   const booking=parse(z.object({name:z.string().trim().min(2).max(80).refine(validName),time:z.enum(['morning','day','evening']),format:z.enum(['onsite','online'])}),body.booking)
   const reply=await save({...s,step:'booked'},'full_booking_submitted',{},undefined,booking)
   const url=standardUrl()
   const admins=adminChats()
   if(admins.length){
    await read(client.from('telegram_notifications').upsert(admins.map(chat_id=>({dedupe_key:'mvp-booking:'+row.id+':'+chat_id,chat_id,body:{text:'English X-Ray: yangi X-Ray Full so‘rovi. '+url+'/mvp-admin'}})),{onConflict:'dedupe_key',ignoreDuplicates:true}))
    queueNotifications('mvp-booking:'+row.id+':')
   }
   return reply
  }
  if(action==='event'){
   const event=parse(z.enum(['app_opened','short_result_viewed','full_report_viewed','share_clicked','story_shared','full_booking_started']),body.event)
   await read(client.from('xr_mvp_events').insert({run_id:row.id,name:event,detail:event==='app_opened'?{source:identity.source}:{}}))
   return response({ok:true})
  }
  return fail(409,'Bu amal joriy bosqichda bajarilmaydi.')
 }catch(e){return handle(e)}
}
