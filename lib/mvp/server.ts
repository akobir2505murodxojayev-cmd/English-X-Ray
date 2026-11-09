import {db,read,fail} from '../db'
import {defaultConfig,profiles,type Config,type Stored,type Item,type View,type Summary,type Stimulus} from './model'
import {mediaStimuli,pilotBank} from './content'
import {score} from './engine'
export type Run={id:string;user_id:string;revision:number;state:Stored;completed_at:string|null;created_at:string;source:string|null}
export async function config():Promise<Config>{
 const row=await read(db().from('xr_mvp_config').select('value').eq('id',true).maybeSingle())
 return {...defaultConfig,...row?.value}
}
export async function bank(){
 const rows=await read(db().from('xr_mvp_items').select('id,active,item').order('version',{ascending:false}).limit(1000))
 const overrides=new Map<string,Item|null>()
 for(const row of rows??[])if(!overrides.has(row.id))overrides.set(row.id,row.active?row.item as Item:null)
 return [...pilotBank.filter(x=>!overrides.has(x.id)),...[...overrides.values()].filter((x):x is Item=>x!==null)]
}
export async function stimuli():Promise<Record<string,Stimulus>>{
 const rows=await read(db().from('xr_mvp_media').select('id,value'))
 return {...mediaStimuli,...Object.fromEntries((rows??[]).map(x=>[x.id,x.value]))}
}
export async function presented(run:Run|null,c:Config,name?:string,staff?:boolean){
 const value=publicView(run,c,name,staff)
 const path=value.stimulus?.audio
 if(path?.startsWith('mvp/')){
  const signed=await read(db().storage.from('xray-materials').createSignedUrl(path,3600))
  if(value.stimulus&&signed)value.stimulus={...value.stimulus,audio:signed.signedUrl}
 }
 return value
}
export async function actor(telegram:number) {
 return await read(db().from('users').select('id,full_name,phone_number,deletion_requested_at').eq('telegram_id',telegram).maybeSingle())
}
export async function staffRole(id:string){
 return (await read(db().from('admin_users').select('role').eq('user_id',id).maybeSingle()))?.role as string|undefined
}
export async function latest(id:string):Promise<Run|null>{
 return await read(db().from('xr_mvp_runs').select('*').eq('user_id',id).order('created_at',{ascending:false}).limit(1).maybeSingle())
}
export function publicView(run:Run|null,c:Config,name?:string,staff?:boolean):View{
 const common={price:c.price,terms:c.fullTerms,name,staff}
 if(!run)return {...common,step:'intro',revision:0}
 const s=run.state
 const q=s.items[s.answers.length]
 const summary:Summary|undefined=s.report&&{skills:s.report.skills,weakest:s.report.weakest,profile:s.report.profile}
 return {...common,id:run.id,revision:run.revision,step:s.step,goal:s.goal,context:s.context,index:s.answers.length,
  section:q?.skill==='reading'?2:q?.skill==='listening'?3:s.step==='speaking'?4:1,
  question:s.step==='test'&&q?{id:q.id,skill:q.skill,stem:q.stem,options:q.options}:undefined,
  stimulus:s.step==='test'&&q?.group?(s.stimuli??mediaStimuli)[q.group]:undefined,
  playCount:s.playCount,summary,report:s.step==='report'||s.step==='booked'?s.report:undefined,contactPending:s.contactPending,
  voice:!!s.voice,review:s.step==='report'||s.step==='booked'?s.review:undefined,
  retestAt:run.completed_at?new Date(Date.parse(run.completed_at)+c.retestDays*86400000).toISOString():undefined}
}
export function finish(s:Stored,c:Config):Stored{
 return {...s,step:'short',report:score(s.items,s.answers,s,c)}
}
export async function mustStaff(id:string|undefined,allowMentor=false){
 const role=id?await staffRole(id):null
 if(role!=='admin'&&role!=='super_admin'&&!(allowMentor&&role==='mentor'))return fail(403,'Admin paneliga ruxsat yo‘q.')
 return role
}
export const miniButton=(text:string,url:string)=>({inline_keyboard:[[{text,web_app:{url}}]]})
export const reportBody=(s:Stored,url:string)=>{
 const report=s.report
 const text=report?'X-RAY HISOBOTI\n\n'+Object.entries(report.skills).map(([k,v])=>({grammar:'Grammatika',vocabulary:'Leksika',reading:'Reading',listening:'Listening',speaking:'Speaking'}[k]??k)+' · '+v.band).join('\n')+'\n\n'+profiles[report.profile].title:'English X-Ray hisobotiga qayting.'
 return {text,reply_markup:miniButton('Hisobotni ochish',url),...(report?{photo:url+'/api/mvp/card?profile='+report.profile}:{})}
}
