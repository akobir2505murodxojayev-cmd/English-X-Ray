import {equal} from '../../../../lib/auth'
import {handle,response} from '../../../../lib/db'
import {followUp} from '../../../../lib/mvp/followup'
export const maxDuration=60
export async function GET(req:Request){
 const secret=process.env.CRON_SECRET
 if(!secret||!equal(req.headers.get('authorization')??'','Bearer '+secret))return response({error:'Ruxsat yo‘q.'},401)
 try{await followUp(new Date());return response({ok:true})}catch(e){return handle(e)}
}
