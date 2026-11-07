import {createClient} from '@supabase/supabase-js'
import {NextRequest,NextResponse} from 'next/server'
import {cookieHash} from './auth'

export class Problem extends Error {
 constructor(public status:number,message:string){super(message)}
}
export const fail=(status:number,message:string):never=>{throw new Problem(status,message)}
export const unavailable=()=>fail(503,'Xizmatni ulash yakunlanmoqda. Keyinroq urinib ko‘ring.')
export const ready=()=>Boolean(process.env.SUPABASE_URL&&process.env.SUPABASE_SECRET_KEY)
export function db(){
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY
 if(!url||!key) return unavailable()
 return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
}
type ResponseLike<T>={data:T;error:{code?:string;message:string}|null}
export async function read<T>(request:PromiseLike<ResponseLike<T>>):Promise<T>{
 const {data,error}=await request
 if(error) {
  if(error.code==='23505') return fail(409,'Ma’lumot avval saqlangan.')
  throw new Error('database:'+String(error.code??'request'))
 }
 return data
}
export const response=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}})
export function handle(e:unknown){
 if(e instanceof Problem) return response({error:e.message},e.status)
 console.error('xray operation failed',e instanceof Error&&/^database:[\w-]+$/.test(e.message)?e.message:'internal')
 return response({error:'Amalni bajarib bo‘lmadi. Qayta urinib ko‘ring.'},500)
}
export const COOKIE='xray_session'
export const adminChats=()=>[...new Set((process.env.ADMIN_TELEGRAM_IDS??'').split(',').map(s=>Number(s.trim())).filter(n=>Number.isSafeInteger(n)&&n>0))]
export async function viewer(req:NextRequest){
 const raw=req.cookies.get(COOKIE)?.value
 const secret=process.env.SESSION_SECRET
 if(!raw||!secret||raw.length!==64) return fail(401,'Ilovani Telegram botidan oching.')
 const client=db()
 const session=await read(client.from('app_sessions').select('user_id').eq('token_hash',cookieHash(raw,secret)).gt('expires_at',new Date().toISOString()).maybeSingle())
 if(!session) return fail(401,'Sessiya yakunlandi. Ilovani Telegram botidan qayta oching.')
 const user=await read(client.from('users').select('*').eq('id',session.user_id).is('deletion_requested_at',null).eq('registration_completed',true).maybeSingle())
 if(!user) return fail(401,'Avval botda ro‘yxatdan o‘ting.')
 return user
}
export function requireOrigin(req:NextRequest){
 const origin=req.headers.get('origin')
 const allowed=[new URL(req.url).origin,process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/,'')].filter(Boolean)
 if(!origin||!allowed.includes(origin)) return fail(403,'So‘rovga ruxsat berilmadi.')
}
