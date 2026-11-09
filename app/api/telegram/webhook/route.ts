import {z} from 'zod'
import {equal,normalizePhone} from '../../../../lib/auth'
import {adminChats,db,handle,read,response} from '../../../../lib/db'
import {queueNotifications,telegram} from '../../../../lib/jobs'
import {advance} from '../../../../lib/registration'
import {after} from 'next/server'
import {actor,latest,miniButton,reportBody} from '../../../../lib/mvp/server'

const user=z.object({id:z.number().int().positive(),first_name:z.string(),last_name:z.string().optional(),username:z.string().optional()})
const chat=z.object({id:z.number().int(),type:z.string()})
const update=z.object({
 update_id:z.number().int(),message:z.object({from:user.optional(),chat,text:z.string().max(4096).optional(),contact:z.object({user_id:z.number().int().optional(),phone_number:z.string().max(50)}).optional(),voice:z.object({file_id:z.string().max(200),duration:z.number().int().max(120),file_size:z.number().optional()}).optional()}).optional(),
 callback_query:z.object({id:z.string(),from:user,data:z.string().optional(),message:z.object({chat}).optional()}).optional()
})
export async function POST(req:Request){
 const secret=process.env.TELEGRAM_WEBHOOK_SECRET,url=process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/,'')
 if(!secret||!process.env.TELEGRAM_BOT_TOKEN||!url?.startsWith('https://')||process.env.VERCEL_ENV==='preview') return response({error:'Webhook unavailable'},503)
 if(!equal(req.headers.get('x-telegram-bot-api-secret-token')??'',secret)) return response({error:'Forbidden'},403)
 try{
  const parsed=update.safeParse(await req.json().catch(()=>null))
  if(!parsed.success) return response({ok:true})
  const {message,callback_query:cb,update_id:id}=parsed.data
  const u=cb?.from??message?.from,room=cb?.message?.chat??message?.chat
  if(!u||room?.type!=='private'||room.id!==u.id) return response({ok:true})
  const client=db(),incoming=cb?.data??message?.text??''
  const cmd=incoming.split(/\s/,1)[0].split('@')[0].toLowerCase()
  const txt=cmd==='/delete_my_data'?'/delete':incoming
  const source=cmd==='/start'?incoming.trim().split(/\s+/)[1]??'':''
  const phone=message?.contact?.user_id===u.id&&message.contact?normalizePhone(message.contact.phone_number):null
  const voice=message?.voice&&message.voice.duration<=60&&(message.voice.file_size??0)<=3500000?message.voice.file_id:null
  const action=['/start','/help','/test'].includes(cmd)?'start':cmd==='/stop'?'stop':cmd==='/results'?'report':phone?'contact':voice?'voice':null
  if(action){
   const welcome={text:'SANDBOX LC · ENGLISH X-RAY\n\nIngliz tilingizning rentgeni\n20 daqiqada qaysi ko‘nikma sizni to‘xtatayotganini va qaysi mavzularda mashq kerakligini bilib oling.\n\n1. Diagnostika\n2. Tahlil\n3. Keyingi qadam',reply_markup:{inline_keyboard:[[{text:'Diagnostikani boshlash',web_app:{url}}],[{text:'Qanday ishlaydi?',callback_data:'mvp:help'},{text:'Sandbox LC haqida',callback_data:'mvp:about'}]]}}
   let reply=action==='start'?welcome:action==='stop'?{text:'Keyingi eslatmalar o‘chirildi. Hisobotingiz Mini App ichida ochiladi.',reply_markup:miniButton('English X-Ray',url)}:action==='contact'?{text:'Raqam qabul qilindi. To‘liq tahlil ochildi.',reply_markup:miniButton('Hisobotni ochish',url)}:action==='voice'?{text:'Ovoz qabul qilindi. Uni metodist ko‘rib chiqadi.',reply_markup:miniButton('Natijaga o‘tish',url)}:null
   if(action==='report'){
    const account=await actor(u.id)
    const run=account&&!account.deletion_requested_at?await latest(account.id):null
    if(run) reply=['report','booked'].includes(run.state.step)?reportBody(run.state,url):{text:'Natijani ko‘rish uchun Mini App’ni oching.',reply_markup:miniButton('English X-Ray',url)}
   }
   if(reply){
    const done=await read(client.rpc('xr_mvp_bot',{p_telegram:u.id,p_update:id,p_action:action,p_source:/^[A-Za-z0-9_-]{1,64}$/.test(source)?source:null,p_phone:phone,p_voice:voice,p_reply:reply}))
    if(done){queueNotifications('reply:'+id);return response({ok:true})}
    if(action==='voice')return response({ok:true})
   }
  }
  if(cb&&incoming.startsWith('mvp:')){
   const reply={text:incoming==='mvp:help'?'Test → ko‘nikmalar xaritasi → tahlil. To‘liq tahlil testdan so‘ng ochiladi.':'English X-Ray — Sandbox LC diagnostikasi. Natijalar keyingi o‘quv qadamini tanlashga yordam beradi.',reply_markup:miniButton('Diagnostikani boshlash',url)}
   await read(client.rpc('xr_mvp_bot',{p_telegram:u.id,p_update:id,p_action:'info',p_source:null,p_phone:null,p_voice:null,p_reply:reply}))
   after(async()=>{try{await telegram().answerCallbackQuery(cb.id)}catch{}})
   queueNotifications('reply:'+id)
   return response({ok:true})
  }
  for(let i=0;i<3;i++){
   const [session,profile]=await Promise.all([
    read(client.from('registration_sessions').select('*').eq('telegram_id',u.id).maybeSingle()),
    read(client.from('users').select('*').eq('telegram_id',u.id).maybeSingle())
   ])
   let latest:string|null=null,plan:string|null=null
   if(profile&&!profile.deletion_requested_at&&/^\/results(?:@|\s|$)/.test(txt)){
    const row=await read(client.from('diagnostic_sessions').select('result').eq('user_id',profile.id).neq('status','active').order('submitted_at',{ascending:false}).limit(1).maybeSingle())
    if(row?.result) latest='So‘nggi diagnostika: '+(row.result.level??'baholanmoqda')+' · '+(row.result.score??'—')+'%.'
   }
   if(profile&&!profile.deletion_requested_at&&/^\/plan(?:@|\s|$)/.test(txt)){
    const row=await read(client.from('learning_plans').select('learning_tasks(week,title,completed_at)').eq('user_id',profile.id).order('created_at',{ascending:false}).limit(1).maybeSingle())
    if(row) plan=row.learning_tasks.sort((a,b)=>a.week-b.week).map(x=>x.week+'-hafta · '+x.title+(x.completed_at?' ✓':'')).join('\n')
   }
   const next=advance({text:txt,callback:!!cb,sender:u.id,contact:message?.contact,profile,step:session?.current_step??(profile?'COMPLETED':'NOT_STARTED'),draft:session?.draft_data??{},url,latest,plan})
   const outcome=await read(client.rpc('xr_bot_step',{p_telegram:u.id,p_update:id,p_rev:session?.revision??0,p_step:next.step,p_draft:next.draft,p_profile:next.profile?{...next.profile,username:u.username,first:u.first_name,last:u.last_name}:null,p_marketing:next.marketing,p_reply:next.reply,p_admins:adminChats(),p_delete:next.remove}))
   if(outcome==='conflict') continue
   if(cb) after(async()=>{try{await telegram().answerCallbackQuery(cb.id)}catch{console.warn('xray callback expired')}})
   queueNotifications('reply:'+id)
   if(next.profile) queueNotifications('registration:')
   return response({ok:true})
  }
  return response({error:'Retry'},503)
 }catch(e){return handle(e)}
}
