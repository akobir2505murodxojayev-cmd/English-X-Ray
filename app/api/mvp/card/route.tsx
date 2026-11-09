import {ImageResponse} from 'next/og'
import {profiles,type Profile} from '../../../../lib/mvp/model'

export function GET(req:Request){
 const query=new URL(req.url).searchParams
 const key=query.get('profile')??'balanced'
 const profile=Object.hasOwn(profiles,key)?profiles[key as Profile]:profiles.balanced
 const height=query.get('size')==='square'?1080:1920
 const bot=process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.replace(/^@/,'')
 const link=bot?'t.me/'+bot:'sandbox-english-x-ray.vercel.app'
 return new ImageResponse(
  <div style={{display:'flex',width:'100%',height:'100%',background:'#151d30',color:'#fff',padding:82,flexDirection:'column',justifyContent:'space-between',fontFamily:'sans-serif'}}>
   <div style={{display:'flex',fontSize:27,letterSpacing:6,fontWeight:700,color:'#e5be80'}}>SANDBOX LC · ENGLISH X-RAY</div>
   <div style={{display:'flex',flexDirection:'column',maxWidth:870}}>
    <div style={{display:'flex',color:'#d6a45e',fontSize:30,letterSpacing:3,marginBottom:24}}>INGLIZ TILI PROFILI</div>
    <div style={{display:'flex',fontSize:80,fontWeight:700,lineHeight:1.05,marginBottom:32}}>{profile.title}</div>
    <div style={{display:'flex',fontSize:37,color:'#e8e9f1',lineHeight:1.3}}>{profile.description}</div>
   </div>
   <div style={{display:'flex',flexDirection:'column',gap:8}}><div style={{display:'flex',fontSize:39,fontWeight:700}}>O‘zingizni tekshiring</div><div style={{display:'flex',fontSize:29,color:'#e5be80'}}>{link}</div></div>
  </div>,{width:1080,height,headers:{'Cache-Control':'public, max-age=86400'}})
}
