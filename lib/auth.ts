import {createHmac,createHash,timingSafeEqual} from 'node:crypto'

export function equal(a:string,b:string) {
 const x=Buffer.from(a),y=Buffer.from(b)
 return x.length===y.length && timingSafeEqual(x,y)
}
export const digest=(s:string)=>createHash('sha256').update(s).digest('hex')
export function verifyInitData(raw:string,token:string,now=Math.floor(Date.now()/1000),maxAge=300) {
 if(!raw||raw.length>16000||!token) return null
 const params=new URLSearchParams(raw)
 if(new Set(params.keys()).size!==[...params.keys()].length) return null
 const hash=params.get('hash')??''
 const date=Number(params.get('auth_date'))
 if(!/^[a-f0-9]{64}$/.test(hash)||!Number.isSafeInteger(date)||date<now-maxAge||date>now+30) return null
 params.delete('hash')
 params.sort()
 const check=[...params].map(([key,value])=>key+'='+value).join('\n')
 const secret=createHmac('sha256','WebAppData').update(token).digest()
 if(!equal(hash,createHmac('sha256',secret).update(check).digest('hex'))) return null
 try{
  const user=JSON.parse(params.get('user')??'null')
  if(!user||!Number.isSafeInteger(user.id)||user.id<=0) return null
  const source=params.get('start_param')??''
  return {id:user.id,hash,first:typeof user.first_name==='string'?user.first_name.slice(0,80):'Telegram foydalanuvchisi',last:typeof user.last_name==='string'?user.last_name.slice(0,80):null,username:typeof user.username==='string'?user.username.slice(0,64):null,source:/^[A-Za-z0-9_-]{1,512}$/.test(source)?source:null,photo:typeof user.photo_url==='string'&&/^https:\/\/t\.me\//.test(user.photo_url)?user.photo_url:null}
 }catch{return null}
}
export function cookieHash(raw:string,secret:string) { return createHmac('sha256',secret).update(raw).digest('hex') }
export function normalizePhone(raw:string) {
 const clean=raw.trim().replace(/[\s().-]/g,'')
 if(/^\d{9}$/.test(clean)) return '+998'+clean
 if(/^998\d{9}$/.test(clean)) return '+'+clean
 return /^\+[1-9]\d{7,14}$/.test(clean)?clean:null
}
export const validName=(name:string)=>/^[\p{L}][\p{L}\p{M} .’'ʻ‘-]{1,79}$/u.test(name)
