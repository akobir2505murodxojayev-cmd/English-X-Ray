import type {Answer, Mode, Question, Result, Skill} from './engine'
export type Task={id:string;week:number;skill:Skill;title:string;instruction:string;minutes:number;difficulty:number;completed_at?:string|null}
export type Material={id:string;category:string;title:string;description:string;kind:string;content?:string|null;asset_path?:string|null}
export type Attempt={id:string;mode:Mode;status:string;items:Question[];answers:Record<string,Answer>;result?:Result}
export type Settings={language:'uz'|'en';notifications:boolean;reminders:boolean;minutes:number;deadline?:string;marketing:boolean;timezone:string}
export type History={id:string;mode:Mode;status:string;created_at:string;submitted_at:string;result:Result}
export type ChatMessage={id:string;input:string;output?:string;status:'queued'|'running'|'done'|'failed';tries:number}
export type State={profile:{id:string;name:string;phone?:string;role:string;timezone:string;marketing:boolean;settings:Omit<Settings,'marketing'|'timezone'>};active:string|null;result:Result|null;resultStatus:string|null;history:History[];tasks:Task[];progress:Array<{material_id:string;bookmarked:boolean;completed_at?:string}>;badges:string[];activeDays:string[];streak:number;xp:number;applications:Array<{id:string;status:string;created_at:string}>;chat:ChatMessage[];ai:boolean}
export const labels:Record<string,string>={new:'Qabul qilindi',contacted:'Bog‘lanildi',trial:'Sinov darsi belgilandi',enrolled:'Kursga yozildi',closed:'Yopildi'}
export const defaults:Settings={language:'uz',notifications:true,reminders:false,marketing:false,minutes:25,timezone:'Asia/Tashkent',deadline:''}
export async function request<T>(action?:string,body?:unknown,id?:string,download=false):Promise<T>{
 const query=new URLSearchParams()
 if(action)query.set('action',action)
 if(id)query.set('id',id)
 if(download)query.set('download','1')
 const r=await fetch('/api/xray?'+query,{method:body===undefined?'GET':'POST',headers:body!==undefined&&!(body instanceof FormData)?{'Content-Type':'application/json'}:undefined,body:body===undefined?undefined:body instanceof FormData?body:JSON.stringify(body),cache:'no-store'})
 const data=await r.json().catch(()=>null)
 if(!r.ok||data===null) throw new Error(data?.error??'Aloqa uzildi. Qayta urinib ko‘ring.')
 return data
}
