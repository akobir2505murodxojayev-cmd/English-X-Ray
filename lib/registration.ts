import {normalizePhone,validName} from './auth'
type Draft=Record<string,string|boolean|string[]|null|undefined>
type Profile={full_name:string;phone_number?:string;phone_verified?:boolean;region?:string;city?:string;district?:string;education_category?:string;learning_goals?:string[];self_reported_level?:string;study_preference?:string;deletion_requested_at?:string|null}
export type BotMessage={text:string;reply_markup?:{inline_keyboard:Array<Array<{text:string;callback_data:string}|{text:string;web_app:{url:string}}>>}|{keyboard:Array<Array<{text:string;request_contact?:boolean}>>;resize_keyboard:boolean;one_time_keyboard:boolean}|{remove_keyboard:true}}
export type BotInput={text:string;callback:boolean;sender:number;contact?:{user_id?:number;phone_number:string};profile?:Profile|null;step:string;draft:Draft;url:string;latest?:string|null;plan?:string|null;marketing?:boolean}
const options={
 REGION:['Toshkent shahri','Boshqa shahar yoki viloyat','Ko‘rsatmayman'],
 DISTRICT:['Olmazor','Chilonzor','Yunusobod','Shayxontohur','Yakkasaroy','Mirzo Ulug‘bek','Mirobod','Sergeli','Uchtepa','Yashnobod','Bektemir','Yangihayot','Boshqa tuman','Ko‘rsatmayman'],
 EDUCATION:['9-sinf','10-sinf','11-sinf','Universitet talabasi','Maktab o‘qituvchisi','Ishlayman','Boshqa'],
 GOAL:['CEFR sertifikati','IELTS sertifikati','Speaking','Universitetga kirish','Ish uchun ingliz tili','Umumiy ingliz tili'],
 LEVEL:['Bilmayman','Boshlang‘ich','O‘rtacha','Yaxshi','Test orqali aniqlayman'],
 PREFERENCE:['Individual offline','Individual online','Farqi yo‘q','Hozircha faqat diagnostika']
}
const button=(text:string,callback_data:string)=>({text,callback_data})
function render(step:string,draft:Draft,url:string,profile?:Profile|null):BotMessage{
 const inline=(text:string,items:Array<Array<{text:string;callback_data:string}|{text:string;web_app:{url:string}}>>):BotMessage=>({text,reply_markup:{inline_keyboard:items}})
 const menu=(label:string)=>[{text:label,web_app:{url}}]
 const choose=(step:keyof typeof options,prompt:string)=>{
  const buttons=options[step].map((s,i)=>button((step==='GOAL'&&(draft.goals as string[]|undefined)?.includes(s)?'✓ ':'')+s,'choose:'+step+':'+i))
  const rows=Array.from({length:Math.ceil(buttons.length/2)},(_,i)=>buttons.slice(i*2,i*2+2))
  return inline(prompt,[...rows,...(step==='GOAL'?[[button('Davom etish','goal-next')]]:[]),[button('‹ Orqaga','back')]])
 }
 switch(step){
  case 'NOT_STARTED':return inline('Assalomu alaykum! 👋\n\nSandbox Learning Center — English X-Ray tizimiga xush kelibsiz!\nAvval qisqa ro‘yxatdan o‘tamiz.',[[button('Ro‘yxatdan o‘tish','register')]])
  case 'NAME':return {text:'Ism va familiyangizni kiriting. Orqaga qaytish uchun /back yozing.',reply_markup:{remove_keyboard:true}}
  case 'PHONE':return {text:'Telefon raqamingizni ulashing yoki +998 formatida yozing. Qo‘lda yozilgan raqam tasdiqlanmagan deb belgilanadi.',reply_markup:{keyboard:[[{text:'📱 Telefon raqamimni ulashish',request_contact:true}],[{text:'‹ Orqaga'}]],resize_keyboard:true,one_time_keyboard:true}}
  case 'REGION':return choose('REGION','Qaysi hududda yashaysiz? Agar telefon klaviaturasi ko‘rinsa, uni yopishingiz mumkin.')
  case 'DISTRICT':return choose('DISTRICT','Tumaningizni tanlang.')
  case 'OTHER_REGION':return {text:'Viloyat va shahar/tumanni yozing. Masalan, Toshkent viloyati, Qibray. /back — orqaga.',reply_markup:{remove_keyboard:true}}
  case 'EDUCATION':return choose('EDUCATION','Siz qaysi toifaga kirasiz?')
  case 'GOAL':return choose('GOAL','Ingliz tilini nima maqsadda o‘rganmoqchisiz? Bir nechtasini tanlash mumkin.')
  case 'LEVEL':return choose('LEVEL','Hozirgi darajangizni qanday baholaysiz?')
  case 'PREFERENCE':return choose('PREFERENCE','Qaysi ta’lim shakli sizga qulay?')
  case 'CONSENT':return inline('Profil va aloqa ma’lumotlari ro‘yxatdan o‘tish, test va reja uchun ishlatiladi. Kurs xabarlari ixtiyoriy. Ma’lumotlarni o‘chirish uchun /delete yozing.\n\nMaxfiylik siyosati: '+url+'/privacy',[[button('Roziman','privacy-yes')],[button('Rad etaman','cancel')],[button('‹ Orqaga','back')]])
  case 'GUARDIAN':return inline('Agar 18 yoshga to‘lmagan bo‘lsangiz, ushbu bosqichni ota-ona yoki vasiy bilan davom ettiring. Maxfiylik shartlarini birga o‘qing.',[[button('18 yoshdaman yoki undan kattaman','adult')],[button('Vasiy bilan davom etaman','guardian')],[button('‹ Orqaga','back')]])
  case 'MARKETING':return inline('Sandbox LC’dan kurslar haqida xabar olishni xohlaysizmi? Bu tanlov testga kirishga ta’sir qilmaydi.',[[button('Ha, xabar olishni xohlayman','marketing-yes')],[button('Yo‘q, rahmat','marketing-no')],[button('‹ Orqaga','back')]])
  case 'DELETE':return inline('Hisob va unga bog‘liq ma’lumotlarni o‘chirish bo‘yicha so‘rov yuborasizmi? Tasdiqlasangiz, ilovaga kirish yopiladi.',[[button('O‘chirish so‘rovini yuborish','delete-confirm')],[button('Bekor qilish','cancel')]])
  default:return inline(profile?'Salom, '+profile.full_name+'!\nTelefon: '+(profile.phone_number??'kiritilmagan')+'\nHudud: '+([profile.region,profile.district].filter(Boolean).join(', ')||'ko‘rsatilmagan'):'✅ Tabriklaymiz! Siz English X-Ray tizimidan ro‘yxatdan o‘tdingiz. Endi ingliz tilingizni tekshirishingiz mumkin.',[menu('🔍 English X-Ray’ni ochish'),[button('👤 Mening profilim','profile'),button('Tahrirlash','edit')]])
 }
}
const prior:Record<string,string>={NAME:'NOT_STARTED',PHONE:'NAME',REGION:'PHONE',DISTRICT:'REGION',OTHER_REGION:'REGION',EDUCATION:'REGION',GOAL:'EDUCATION',LEVEL:'GOAL',PREFERENCE:'LEVEL',CONSENT:'PREFERENCE',GUARDIAN:'CONSENT',MARKETING:'GUARDIAN'}
export function advance(data:BotInput){
 let {step}=data
 let draft={...data.draft}
 const text=data.text.trim(),p=data.profile,url=data.url
 const cmd=text.startsWith('/')?text.split(/[@\s]/)[0].toLowerCase():text
 const back=cmd==='/back'||cmd==='back'||cmd==='‹ Orqaga'
 const say=(text:string)=>({text})
 let profile:Draft|null=null,marketing=false,remove=false,reply:BotMessage|undefined
 if(p?.deletion_requested_at) return {step:'COMPLETED',draft:{},profile,marketing,remove,reply:say('Hisobni o‘chirish bo‘yicha so‘rov qabul qilingan.')}
 if(cmd==='/cancel'||cmd==='cancel'){
  step=p?'COMPLETED':'NOT_STARTED';draft={}
 }else if(cmd==='/delete'&&p){step='DELETE'}
 else if(cmd==='delete-confirm'&&data.callback&&step==='DELETE'&&p){
  remove=true;step='COMPLETED';draft={};reply=say('Hisobni o‘chirish bo‘yicha so‘rov yuborildi.')
 }else if(cmd==='/edit'||cmd==='edit'){
  step='NAME';draft=p?{name:p.full_name,phone:p.phone_number,verified:p.phone_verified,region:p.region,city:p.city,district:p.district,education:p.education_category,goals:p.learning_goals,level:p.self_reported_level,preference:p.study_preference}:{}
 }else if(cmd==='/register'||(cmd==='register'&&data.callback&&step==='NOT_STARTED')){
  if(step==='NOT_STARTED'||step==='DELETE') step=p?'COMPLETED':'NAME'
 }else if(cmd==='/start'){
  if(step==='DELETE') step=p?'COMPLETED':'NOT_STARTED'
 }else if(cmd==='/profile'||cmd==='profile'){
  reply=p?render('COMPLETED',draft,url,p):say('Avval /register orqali ro‘yxatdan o‘ting.')
 }else if(cmd==='/test'){
  reply=p?render('COMPLETED',draft,url,p):say('Avval /register orqali ro‘yxatdan o‘ting.')
 }else if(cmd==='/results'){reply=say(p?data.latest??'Natija hali yo‘q. /test orqali boshlang.':'Avval /register orqali ro‘yxatdan o‘ting.')}
 else if(cmd==='/plan'){reply=say(p?data.plan??'O‘quv reja testdan keyin tayyorlanadi.':'Avval /register orqali ro‘yxatdan o‘ting.')}
 else if(cmd==='/help'){reply=say('/start — boshlash yoki davom etish\n/register — ro‘yxat\n/profile — profil\n/edit — tahrirlash\n/test — ilovani ochish\n/results — natija\n/plan — reja\n/cancel — bekor qilish\n/delete — hisobni o‘chirish so‘rovi')}
 else if(back){step=step==='EDUCATION'&&draft.region==='Toshkent shahri'?'DISTRICT':step==='EDUCATION'&&draft.region?'OTHER_REGION':prior[step]??step}
 else if(step==='NAME'&&!data.callback&&validName(text)){
  draft.name=text;step='PHONE'
 }else if(step==='PHONE'&&!data.callback){
  const contact=data.contact
  const number=normalizePhone(contact?.phone_number??text)
  if(contact?.user_id&&contact.user_id!==data.sender){const retry=render('PHONE',draft,url);reply={...retry,text:'Iltimos, o‘zingizning raqamingizni ulashing.\n'+retry.text}}
  else if(number){draft.phone=number;draft.verified=contact?.user_id===data.sender;step='REGION'}
 }else if(step==='OTHER_REGION'&&!data.callback&&text.length>=3&&text.length<=90&&/^[\p{L}\p{M} ,.’ʻ'\-]+$/u.test(text)){
  const [region,city]=text.split(',').map(x=>x.trim());draft.region=region;draft.city=city??null;draft.district=null;step='EDUCATION'
 }else if(data.callback&&text.startsWith('choose:'+step+':')&&Object.hasOwn(options,step)){
  const value=options[step as keyof typeof options][Number(text.split(':')[2])]
  if(value){
   if(step==='REGION'){
    draft.region=value==='Ko‘rsatmayman'?null:value;draft.city=value==='Toshkent shahri'?'Toshkent':null;draft.district=null
    step=value==='Toshkent shahri'?'DISTRICT':value==='Ko‘rsatmayman'?'EDUCATION':'OTHER_REGION'
   }else if(step==='DISTRICT'){draft.district=value==='Ko‘rsatmayman'?null:value;step='EDUCATION'}
   else if(step==='EDUCATION'){draft.education=value;step='GOAL'}
   else if(step==='GOAL'){
    const goals=(draft.goals??[]) as string[]
    draft.goals=goals.includes(value)?goals.filter(x=>x!==value):[...goals,value]
   }else if(step==='LEVEL'){draft.level=value;step='PREFERENCE'}
   else if(step==='PREFERENCE'){draft.preference=value;step='CONSENT'}
  }
 }else if(data.callback&&step==='GOAL'&&cmd==='goal-next'&&(draft.goals as string[]|undefined)?.length){step='LEVEL'}
 else if(data.callback&&step==='CONSENT'&&cmd==='privacy-yes'){step='GUARDIAN'}
 else if(data.callback&&step==='GUARDIAN'&&(cmd==='adult'||cmd==='guardian')){
  if(cmd==='adult'&&/^\d+-sinf$/.test(String(draft.education))){
   const message=render('GUARDIAN',draft,url);reply={...message,text:'Maktab toifasi uchun ota-ona yoki vasiy bilan davom eting.\n'+message.text}
  }else{draft.guardian=cmd==='guardian';step='MARKETING'}
 }else if(data.callback&&step==='MARKETING'&&(cmd==='marketing-yes'||cmd==='marketing-no')){
  profile=draft;draft={};step='COMPLETED';marketing=cmd==='marketing-yes'
 }
 if(!reply){
  const message=render(step,draft,url,profile?null:p)
  reply=step===data.step&&!data.callback&&!text.startsWith('/')&&['NAME','PHONE','OTHER_REGION'].includes(step)?{...message,text:'Ma’lumotni tekshirib, qayta kiriting.\n'+message.text}:message
 }
 return {step,draft,profile,marketing,remove,reply}
}
