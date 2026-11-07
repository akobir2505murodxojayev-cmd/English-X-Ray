const {TELEGRAM_BOT_TOKEN:token,TELEGRAM_WEBHOOK_SECRET:secret,NEXT_PUBLIC_APP_URL:raw,TELEGRAM_EXPECTED_BOT_USERNAME:expected}=process.env
const url=raw?.replace(/\/$/,'')
const endpoint=url+'/api/telegram/webhook'
const apply=process.argv.includes('--apply')
const replace=process.argv.includes('--replace-existing-webhook')
const commands=[['start','Ro‘yxatni boshlash yoki davom ettirish'],['register','Ro‘yxatdan o‘tish'],['profile','Profil'],['edit','Ma’lumotlarni tahrirlash'],['test','English X-Ray’ni ochish'],['results','So‘nggi natija'],['plan','O‘quv reja'],['help','Yordam'],['cancel','Bekor qilish'],['delete','Hisobni o‘chirish so‘rovi']]
async function call(method,body={}){
 const r=await fetch('https://api.telegram.org/bot'+token+'/'+method,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(10000)})
 const json=await r.json()
 if(!r.ok||!json.ok) throw new Error('Telegram '+method+' HTTP '+r.status)
 return json.result
}
try{
 if(!token||!secret||!/^[A-Za-z0-9_-]{32,256}$/.test(secret)||!url||new URL(url).origin!==url||!url.startsWith('https://')) throw new Error('Tekshirilgan HTTPS manzil va server sirlarini kiriting.')
 const [me,info,menu,current]=await Promise.all([call('getMe'),call('getWebhookInfo'),call('getChatMenuButton'),call('getMyCommands')])
 console.log(JSON.stringify({bot:me.username,webhook:info.url?new URL(info.url).origin:'unset',matchesTarget:info.url===endpoint,pending:info.pending_update_count,menuType:menu.type,commands:current.map(c=>c.command),mode:apply?'apply':'inspect'}))
 if(apply){
  if(!expected||expected.replace(/^@/,'').toLowerCase()!==me.username.toLowerCase()) throw new Error('TELEGRAM_EXPECTED_BOT_USERNAME bot identifikatoriga mos kelishi kerak.')
  if(info.url&&info.url!==endpoint&&!replace) throw new Error('Mavjud webhook boshqa manzilda. Tekshirgach --replace-existing-webhook bilan qayta ishga tushiring.')
  const health=await fetch(url+'/api/health',{signal:AbortSignal.timeout(10000)})
  const checks=await health.json()
  if(!health.ok||checks.database!=='connected'||checks.telegram!=='configured') throw new Error('Production health tekshiruvi muvaffaqiyatsiz.')
  await call('setWebhook',{url:endpoint,secret_token:secret,allowed_updates:['message','callback_query'],drop_pending_updates:false})
  await call('setMyCommands',{commands:[...commands.map(([command,description])=>({command,description})),...current.filter(c=>!commands.some(([x])=>x===c.command))].slice(0,100)})
  await call('setChatMenuButton',{menu_button:{type:'web_app',text:'English X-Ray',web_app:{url}}})
  if((await call('getWebhookInfo')).url!==endpoint) throw new Error('Webhook manzili tasdiqlanmadi.')
  console.log('Webhook saqlandi. Endi Telegram orqali /start va testni qo‘lda tekshiring.')
 }
}catch(e){console.error(e.message==='fetch failed'?'Telegram yoki Vercel bilan bog‘lanib bo‘lmadi.':e.message);process.exitCode=1}
