import {db,read} from '../db'
import {flushNotifications} from '../jobs'
import {config,miniButton} from './server'
export async function followUp(now:Date){
 const client=db()
 const c=await config()
 const url=process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/,'')??''
 if(!url.startsWith('https://'))return
 const day=(d:Date)=>Math.floor((d.getTime()+5*3600000)/86400000)
 const hour=(now.getUTCHours()+5)%24
 if(hour<10||hour>=21)return
 const rows=await read(client.from('xr_mvp_runs').select('id,contacted_at,completed_at,state,users!inner(telegram_id,deletion_requested_at),xr_mvp_leads!inner(status)').not('contacted_at','is',null).is('users.deletion_requested_at',null).eq('xr_mvp_leads.status','contact').contains('state',{marketing:true}).gte('contacted_at',new Date(now.getTime()-91*86400000).toISOString()).limit(1000))
 for(const row of rows??[]){
  const user=row.users as unknown as {telegram_id:number}
  const delta=day(now)-day(new Date(row.contacted_at))
  const follow=c.followups.find(x=>x.day===delta)
  if(!follow)continue
  if(await read(client.from('xr_mvp_follow_optout').select('telegram_id').eq('telegram_id',user.telegram_id).maybeSingle()))continue
  await read(client.from('telegram_notifications').upsert({dedupe_key:'mvp-follow:'+row.id+':'+delta,chat_id:user.telegram_id,body:{text:follow.text+'\n\nEslatmalarni to‘xtatish /stop',reply_markup:miniButton('Hisobotni ochish',url)}},{onConflict:'dedupe_key',ignoreDuplicates:true}))
 }
 await flushNotifications('mvp-follow:')
}
