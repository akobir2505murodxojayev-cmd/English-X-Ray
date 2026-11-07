import {db,ready} from '../../../lib/db'
export const dynamic='force-dynamic'
export async function GET(){
 const configured=ready()
 const database=configured&&!(await db().from('achievements').select('id').limit(1)).error
 return Response.json({app:'English X-Ray',status:configured&&!database?'degraded':'ok',database:database?'connected':configured?'unreachable':'not_configured',telegram:process.env.TELEGRAM_BOT_TOKEN&&process.env.TELEGRAM_WEBHOOK_SECRET?'configured':'not_configured'},{status:configured&&!database?503:200,headers:{'Cache-Control':'no-store'}})
}
