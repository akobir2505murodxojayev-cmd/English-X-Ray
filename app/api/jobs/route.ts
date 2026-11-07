import {equal} from '../../../lib/auth'
import {db,read,response,handle} from '../../../lib/db'
import {flushNotifications,runAi} from '../../../lib/jobs'
export const maxDuration=60
export async function GET(req:Request){
 const secret=process.env.CRON_SECRET
 if(!secret||!equal(req.headers.get('authorization')??'','Bearer '+secret)) return response({error:'Ruxsat yo‘q.'},401)
 try{
  const client=db(),now=new Date(),old=new Date(now.getTime()-2*60*1000)
  const jobs=await read(client.from('ai_messages').select('id').lt('tries',4).or('status.eq.queued,and(status.eq.running,updated_at.lt.'+old.toISOString()+')').limit(10))
  await Promise.all([flushNotifications(),...(jobs??[]).map(j=>runAi(j.id)),read(client.from('app_sessions').delete().lt('expires_at',now.toISOString())),read(client.from('api_limits').delete().lt('until',now.toISOString()))])
  const day=now.toISOString().slice(0,10)
  const users=await read(client.from('users').select('id,telegram_id,settings').is('deletion_requested_at',null).contains('settings',{notifications:true,reminders:true}).limit(1000))
  if(users?.length) await read(client.from('telegram_notifications').upsert(users.map(u=>({chat_id:u.telegram_id,dedupe_key:'reminder:'+u.id+':'+day,body:{text:'English X-Ray: bugungi o‘quv rejangiz uchun 10 daqiqa ajrating. /plan'}})),{onConflict:'dedupe_key',ignoreDuplicates:true}))
  await flushNotifications('reminder:')
  return response({ok:true})
 }catch(e){return handle(e)}
}
