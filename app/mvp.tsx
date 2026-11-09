'use client'
import {useCallback,useEffect,useRef,useState,type ReactNode} from 'react'
import {ArrowDownToLine,AudioLines,ChevronLeft,CircleHelp,Lock,Mic,Play,ScanLine,Send,Square} from 'lucide-react'
import Link from 'next/link'
import {mini,mvpRequest} from '../lib/mvp/client'
import {deadlines,experience,goals,profiles,selfLevels,skillLabels,targets,type Context,type Summary,type View} from '../lib/mvp/model'
import './mvp.css'

const bot=process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.replace(/^@/,'')
const appName=process.env.NEXT_PUBLIC_TELEGRAM_APP_NAME
const botLink=bot?'https://t.me/'+bot:null
const notes='Bu 20 daqiqalik taxminiy diagnostika, rasmiy imtihon natijasi emas. Aniq xulosa va individual reja uchun o‘qituvchi speaking va writing’ingizni ko‘rishi kerak.'
type Local='consent'|'card'|'booking'|null
const initial:View={step:'intro',revision:0,price:'Narxni menejer tasdiqlaydi',terms:''}
function Panel({children,className=''}:{children:ReactNode;className?:string}){return <div className={'xr-panel '+className}>{children}</div>}
function Choices<T extends string>({values,selected,pick,compact=false}:{values:readonly T[];selected:T|undefined;pick:(s:T,i:number)=>void;compact?:boolean}){
 return <div className={compact?'xr-chips':'xr-choices'}>{values.map((s,i)=><button type="button" key={s} className={selected===s?'selected':''} aria-pressed={selected===s} onClick={()=>pick(s,i)}>{!compact&&<i/>}{s}</button>)}</div>
}
function Progress({section,caption}:{section:number;caption:string}){
 return <div className="xr-progress"><small>{caption}</small><div aria-hidden="true">{[1,2,3,4].map(i=><span key={i} className={i<=section?'active':''}/>)}</div></div>
}
function MapCard({summary}:{summary:Summary}){
 return <Panel><div className="xr-row"><strong>Ko‘nikmalar xaritasi</strong><small>taxminiy diapazon</small></div>{Object.entries(summary.skills).map(([id,s])=><div key={id} className={'xr-map '+(summary.weakest===id?'weak':'')}><div className="xr-row"><b>{skillLabels[id as keyof typeof skillLabels]}</b><small>{s.band}</small></div><div className="xr-meter">{s.meter!==null&&<span style={{width:s.meter+'%'}}/>}</div></div>)}</Panel>
}
export default function Mvp(){
 const [clock]=useState(()=>Date.now()),[view,setView]=useState(initial),[local,setLocal]=useState<Local>(null),[loaded,setLoaded]=useState(false),[inApp,setInApp]=useState(false),[dark,setDark]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('')
 const [age,setAge]=useState<'minor'|'adult'|null>(null),[guardian,setGuardian]=useState(false),[consent,setConsent]=useState(false),[marketing,setMarketing]=useState(false)
 const [goal,setGoal]=useState<number>(),[context,setContext]=useState<Partial<Context>>({}),[choice,setChoice]=useState<number>(),[manual,setManual]=useState(false),[phone,setPhone]=useState(''),[passageOpen,setPassageOpen]=useState(true)
 const [name,setName]=useState(''),[time,setTime]=useState<'morning'|'day'|'evening'>(),[format,setFormat]=useState<'onsite'|'online'>('onsite')
 const [audioTime,setAudioTime]=useState(0),[audioDuration,setAudioDuration]=useState(0),[playing,setPlaying]=useState(false),[story,setStory]=useState(false)
 const audio=useRef<HTMLAudioElement>(null),started=useRef(0),locked=useRef(false),ready=useRef(false),shownQuestion=useRef<string|null>(null),events=useRef(new Set<string>()),reportedAudioError=useRef(false)
 const apply=useCallback((next:View)=>{setView(previous=>{
   const sameAudio=previous.id===next.id&&previous.stimulus?.audio&&next.stimulus?.audio&&previous.stimulus.title===next.stimulus.title
   return {...next,staff:next.staff??previous.staff,stimulus:sameAudio?{...next.stimulus!,audio:previous.stimulus?.audio}:next.stimulus}
  });if(next.question&&shownQuestion.current!==next.question.id){shownQuestion.current=next.question.id;setChoice(undefined);started.current=performance.now()}},[])
 const sync=useCallback(async()=>{try{const next=await mvpRequest('state');apply(next);return next as View}catch(e){setError((e as Error).message);return null}},[apply])
 const act=useCallback(async(action:string,body:Record<string,unknown>|FormData={},applyResult=true)=>{
  if(locked.current)return null
  locked.current=true;setBusy(true);setError('')
  try{
   const next=await mvpRequest(action,body instanceof FormData?body:{...body,revision:view.revision})
   if(applyResult)apply(next)
   return next as View
  }catch(e){setError((e as Error).message);return null}
  finally{locked.current=false;setBusy(false)}
 },[view.revision,apply])
 useEffect(()=>{
  let mounted=true
  const update=()=>{
   const web=mini()
   if(!web?.initData)return false
   if(!ready.current){
    ready.current=true;web.ready();web.expand()
    setInApp(true);setStory(!!web.shareToStory&&(web.isVersionAtLeast?.('7.8')??true))
    void sync().then(n=>{if(n?.id)void mvpRequest('event',{event:'app_opened',revision:n.revision}).catch(()=>{})}).finally(()=>{if(mounted)setLoaded(true)})
   }
   setDark(web.colorScheme==='dark')
   return true
  }
  const t=setInterval(()=>{if(update()){clearInterval(t);mini()?.onEvent?.('themeChanged',update)}},70)
  const stop=setTimeout(()=>{if(!ready.current){clearInterval(t);setLoaded(true)}},2500)
  return()=>{mounted=false;clearInterval(t);clearTimeout(stop);mini()?.offEvent?.('themeChanged',update)}
 },[sync])
 useEffect(()=>{
  if(!view.id)return
  const event=view.step==='short'?'short_result_viewed':view.step==='report'?'full_report_viewed':null
  if(!event||events.current.has(view.id+event))return
  events.current.add(view.id+event)
  void mvpRequest('event',{event,revision:view.revision}).catch(()=>{})
 },[view.id,view.step,view.revision])
 useEffect(()=>{
  if((view.step!=='short'||!view.contactPending)&&(view.step!=='speaking'||!manual))return
  const timer=setInterval(()=>{if(!locked.current)void mvpRequest('state').then((next:View)=>{if(next.revision!==view.revision)apply(next)}).catch(()=>{})},1900)
  return()=>clearInterval(timer)
 },[apply,manual,view.contactPending,view.revision,view.step])
 const change=useCallback((next:Local)=>{setLocal(next);setError('');setNotice('');window.scrollTo(0,0)},[])
 const viewStep=local??view.step
 const retestAllowed=!!view.retestAt&&clock>=Date.parse(view.retestAt)
 const question=view.question
 const submitAnswer=(answer:number|null)=>{if(question)void act('answer',{item:question.id,choice:answer,ms:Math.max(0,Math.min(86400000,Math.round(performance.now()-started.current)))})}
 async function contact(){
  const next=await act('contact-request')
  if(!next)return
  const tg=mini()
  setManual(true)
  if(tg?.requestContact&&(tg.isVersionAtLeast?.('6.9')??true)){
   try{tg.requestContact(shared=>{if(shared)setNotice('Telegram’dan tasdiqlangan raqam kutilmoqda…')})}catch{}
  }
 }
 async function sendReport(){
  const run=()=>void act('report-send').then(next=>{if(next)setNotice('Hisobot botga yuborish navbatiga qo‘yildi.')})
  const tg=mini()
  if(tg?.requestWriteAccess&&(tg.isVersionAtLeast?.('6.9')??true)){
   try{tg.requestWriteAccess(allowed=>{if(allowed)run();else setNotice('Hisobotni yuborish uchun botga yozishga ruxsat bering.')})}catch{run()}
  }else run()
 }
 async function play(){
  const player=audio.current
  if(!player||busy)return
  if(playing){player.pause();return}
  if(player.currentTime>0&&player.currentTime<player.duration&&!player.ended){
   try{await player.play()}catch{setError('Audio ochilmadi. Qayta urinib ko‘ring.')}
   return
  }
  if((view.playCount??0)>=2)return
  reportedAudioError.current=false
  player.currentTime=0
  // Start inside the click gesture for iOS. Pause if the server rejects this play.
  const playback=player.play().then(()=>true).catch(()=>false)
  const reserved=await act('audio-play',{},false)
  if(!reserved){player.pause();return}
  apply({...reserved,question:view.question})
  if(!await playback){
   reportedAudioError.current=true
   const failure=await mvpRequest('audio-error',{revision:reserved.revision}).catch(()=>null)
   if(failure)apply(failure)
   setError(failure?.step==='test'?'Audio ochilmadi. Qayta urinib ko‘ring.':'Listening baholanmadi.')
  }
 }
 const progressCaption=(section:number)=>['Grammatika va leksika','Reading','Listening','Speaking'][section-1]
 const introDisabled=!loaded||!inApp
 const formReady=context.experience!==undefined&&context.deadline!==undefined&&context.self!==undefined&&((view.goal!==0&&view.goal!==1)||!!context.target)
 const status=view.summary?.profile??'balanced'
 const storyUrl='/api/mvp/card?profile='+status
 const referral=botLink?(appName?botLink+'/'+appName:botLink)+'?startapp=ref_'+(view.id?.slice(0,8)??'xray'):typeof window!=='undefined'?location.origin:''
 async function share(){
  const tg=mini()
  if(!tg?.shareToStory)return
  try{
   tg.shareToStory(location.origin+storyUrl,{text:'English X-Ray · Sandbox LC',widget_link:{url:referral,name:'O‘zingizni tekshiring'}})
   await mvpRequest('event',{event:'share_clicked',revision:view.revision})
  }catch{setError('Stories ochilmadi. Kartani yuklab olib ulashing.')}
 }
 async function copy(){
  try{await navigator.clipboard.writeText(referral);setNotice('Havola nusxalandi.');void mvpRequest('event',{event:'share_clicked',revision:view.revision}).catch(()=>{})}
  catch{setNotice(referral)}
 }
 let content:ReactNode=null
 let cta:string|undefined
 let blocked=false
 let primaryAction:(()=>void)|undefined
 if(viewStep==='intro'){
  content=<><div className="xr-brand"><ScanLine size={19}/> SANDBOX <em>LC</em></div><div className="xr-kicker">INGLIZ TILI DIAGNOSTIKASI</div><h1 className="xr-hero">English<br/>X-Ray</h1><p className="xr-intro">20 daqiqa. Darajangizni va <b>rivojlanishingizni nima sekinlashtirayotganini</b> ko‘rsatamiz.</p><Panel className="xr-path">{[['Diagnostika','Grammatika, leksika, reading va listening'],['Tahlil','Ko‘nikmalar xaritasi va aynan sizning xatolaringiz'],['Keyingi qadam','Maqsadingizga mos tavsiyalar']].map(([title,desc],i)=><div key={title}><span>{i+1}</span><div><b>{title}</b><small>{desc}</small></div></div>)}</Panel><div className="xr-tags"><span>Bepul</span><span>15–20 daqiqa</span><span>Telegram ichida</span></div>{loaded&&!inApp&&<p className="xr-muted">Diagnostikani Telegram bot ichidan oching.</p>}</>
  if(inApp){cta='Boshlash';blocked=introDisabled;primaryAction=()=>change('consent')}
  else if(botLink){cta='Telegram’da ochish';primaryAction=()=>window.location.assign(botLink)}
 }else if(viewStep==='consent'){
  content=<><div className="xr-kicker">BOSHLASHDAN OLDIN</div><h1>Ma’lumotlaringiz haqida</h1><Panel><p>Javoblaringizdan hisobot tayyorlash va sizga o‘quv tavsiyasi berish uchun foydalanamiz. Ma’lumotlaringizni o‘chirish uchun botda <code>/delete_my_data</code> buyrug‘ini yuboring.</p><Link href="/privacy">Maxfiylik siyosati ↗</Link></Panel><strong>Yoshingiz</strong><Choices values={['18 dan kichik','18 va undan katta']} selected={age==='minor'?'18 dan kichik':age==='adult'?'18 va undan katta':undefined} pick={(_,i)=>setAge(i?'adult':'minor')} compact/>{age==='minor'&&<label className="xr-check xr-sand"><input type="checkbox" checked={guardian} onChange={e=>setGuardian(e.target.checked)}/> Ota-onam yoki vasiyim roziligi bor. 18 yoshgacha ovoz yozish o‘chirilgan.</label>}<label className="xr-check"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/> Shaxsiy ma’lumotlarimni qayta ishlashga roziman.</label><label className="xr-check"><input type="checkbox" checked={marketing} onChange={e=>setMarketing(e.target.checked)}/> Botdan keyingi tavsiyalarni olishni xohlayman (ixtiyoriy).</label></>
  cta='Roziman, davom etish';blocked=!age||!consent||(age==='minor'&&!guardian)
  primaryAction=()=>{const t=mini();void act('consent',{age,guardian,accepted:consent,marketing,device:{platform:t?.platform??'',version:t?.version??''}}).then(n=>{if(n)change(null)})}
 }else if(viewStep==='goal'){
  content=<><Progress section={1} caption="Siz haqingizda · 1 / 2"/><h1>Ingliz tili sizga nima uchun kerak?</h1><p className="xr-muted">Hisobot va tavsiyalar maqsadingizga moslanadi.</p><Choices values={goals} selected={goal===undefined?undefined:goals[goal]} pick={(_,i)=>setGoal(i)}/></>
  cta='Davom etish';blocked=goal===undefined;primaryAction=()=>void act('goal',{goal})
 }else if(viewStep==='context'){
  content=<><Progress section={2} caption="Siz haqingizda · 2 / 2"/><h1>Yana bir nechta savol</h1><strong>Ingliz tilini qancha vaqt o‘qigansiz?</strong><Choices values={experience} selected={experience[context.experience??-1]} pick={(_,i)=>setContext({...context,experience:i})} compact/><strong>Imtihongacha qancha vaqt bor?</strong><Choices values={deadlines} selected={deadlines[context.deadline??-1]} pick={(_,i)=>setContext({...context,deadline:i})} compact/>{(view.goal===0||view.goal===1)&&<><strong>Qaysi natija kerak?</strong><Choices values={targets[view.goal]} selected={context.target} pick={v=>setContext({...context,target:v})} compact/></>}<strong>O‘zingizni qanday baholaysiz?</strong><Choices values={selfLevels} selected={selfLevels[context.self??-1]} pick={(_,i)=>setContext({...context,self:i})} compact/></>
  cta='Diagnostikani boshlash';blocked=!formReady;primaryAction=()=>void act('context',{context})
 }else if(viewStep==='test'&&question){
  const section=view.section??1
  const number=(view.index??0)-(section===2?20:section===3?25:0)+1
  content=<><Progress section={section} caption={section+'-bo‘lim / 4 · '+progressCaption(section)}/>{view.stimulus?.text&&<Panel className="xr-stimulus"><div className="xr-row"><span className="xr-tag">Matn</span><button onClick={()=>setPassageOpen(!passageOpen)}>{passageOpen?'Yig‘ish ↑':'Yoyish ↓'}</button></div><strong>{view.stimulus.title}</strong>{passageOpen&&<p>{view.stimulus.text}</p>}</Panel>}{view.stimulus?.audio&&<div className="xr-audio"><div className="xr-row"><span>Audio · {view.stimulus.title}</span><span>Tinglash {view.playCount??0} / 2</span></div><audio ref={audio} src={view.stimulus.audio} preload="metadata" onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onEnded={()=>setPlaying(false)} onLoadedMetadata={e=>setAudioDuration(e.currentTarget.duration)} onTimeUpdate={e=>setAudioTime(e.currentTarget.currentTime)}/><AudioLines aria-hidden="true" className="xr-wave"/><div className="xr-row"><button aria-label={playing?'Pauza':'Audioni tinglash'} disabled={busy||(!playing&&audioTime>=audioDuration&&audioDuration>0&&(view.playCount??0)>=2)} onClick={()=>void play()}>{playing?<Square size={16}/>:<Play size={18}/>}</button><small>{stamp(audioTime)} / {stamp(audioDuration)}</small></div></div>}{section>1&&<small>Savol {number} / 5</small>}<Panel className={section===1?'xr-question serif':'xr-question'}>{question.stem}</Panel><div className="xr-choices">{question.options.map((o,i)=><button key={o} className={choice===i?'selected':''} aria-pressed={choice===i} onClick={()=>setChoice(i)}><span>{'ABCD'[i]}</span>{o}</button>)}</div><button className="xr-unknown" disabled={busy} onClick={()=>submitAnswer(null)}>Bilmayman</button></>
  cta='Javob berish';blocked=choice===undefined;primaryAction=()=>submitAnswer(choice??null)
 }else if(viewStep==='speaking'){
  content=<><Progress section={4} caption="4-bo‘lim / 4 · Speaking"/><span className="xr-tag">Ixtiyoriy bo‘lim</span><Panel className="xr-question serif">Describe a skill you learned recently. Why did you decide to learn it?</Panel><Recording busy={busy} saved={!!view.voice} save={async blob=>{const form=new FormData();form.append('audio',blob,'speaking');return !!await act('voice',form)}}/><button className="xr-unknown" disabled={busy} onClick={()=>{void act('voice-pending').then(n=>{if(n){setManual(true);setNotice('Botga 60 soniyagacha ovozli xabar yuboring va bu ekranga qayting.');if(botLink)mini()?.openTelegramLink?.(botLink)}})}}>Ovozni bot orqali yuborish</button><p className="xr-muted xr-center">Yozuvni Sandbox LC metodisti ko‘rib chiqadi.</p></>
  cta=view.voice?'Natijaga o‘tish':'O‘tkazib yuborish';primaryAction=()=>{setManual(false);void act('speaking-done')}
 }else if(viewStep==='short'&&view.summary){
  content=<><div className="xr-kicker">DIAGNOSTIKA TUGADI</div><h1>{view.goal===5?'Farzandingizning rentgeni':'Sizning rentgeningiz'}</h1><MapCard summary={view.summary}/>{view.summary.weakest&&<Panel className="xr-weak"><small>ASOSIY E’TIBOR KERAK BO‘LGAN KO‘NIKMA</small><strong>{skillLabels[view.summary.weakest]}</strong></Panel>}<Panel><small>INGLIZ TILI PROFILI</small><strong>{profiles[status].title}</strong></Panel><Panel><p className="xr-row"><Lock size={17}/> <b>Xatolaringiz tahlili yopiq</b></p><small>Mavzular, javob misollari va keyingi tavsiyalar to‘liq hisobotda.</small></Panel>{manual&&<Panel><label>Telefon raqami<input type="tel" placeholder="+998 XX XXX XX XX" value={phone} onChange={e=>setPhone(e.target.value)}/></label><button className="xr-secondary" disabled={busy||phone.trim().length<9} onClick={()=>void act('contact-manual',{phone})}>Raqamni saqlash</button></Panel>}</>
  cta=manual?'Kontaktni yana so‘rash':'To‘liq tahlilni ochish';primaryAction=()=>void contact()
 }else if((viewStep==='report'||viewStep==='booked')&&view.report){
  content=<><div className="xr-kicker">X-RAY · TO‘LIQ TAHLIL</div><h1>{view.goal===5?'Farzandingizning hisoboti':'To‘liq hisobot'}</h1><MapCard summary={view.report}/><h2>Ochiq qolgan mavzular</h2>{view.report.gaps.length?view.report.gaps.map(g=><Panel key={g.topic}><small>{g.topic}</small><strong>{g.topicUz}</strong><p>{g.stem}</p><p className="xr-wrong">Javob · {g.answer}</p><p className="xr-right">To‘g‘ri · {g.correct}</p><small>{g.why}</small></Panel>):<Panel>Javoblaringizda ochiq mavzu aniqlanmadi.</Panel>}<Panel className="xr-sand"><strong>Maqsadgacha masofa</strong><p>{view.report.distance}</p></Panel><Panel><small>{notes}</small></Panel>{view.review&&<Panel><strong>Metodist izohi</strong><p>{view.review}</p></Panel>}<button className="xr-secondary" onClick={()=>change('card')}>Profil kartasini ochish</button><button className="xr-secondary" disabled={busy} onClick={()=>void sendReport()}><Send size={16}/> Hisobotni botga yuborish</button>{viewStep==='booked'&&<Panel className="xr-sand"><strong>So‘rov qabul qilindi</strong><p>Menejer siz bilan bog‘lanadi.</p></Panel>}{retestAllowed&&<button className="xr-secondary" onClick={()=>{setGoal(undefined);setContext({});change('consent')}}>Yangi diagnostika</button>}</>
  if(viewStep==='report'){cta='X-Ray Full’ga yozilish';primaryAction=()=>{setName(view.name??'');void mvpRequest('event',{event:'full_booking_started',revision:view.revision}).catch(()=>{});change('booking')}}
 }else if(viewStep==='card'){
  content=<><div className="xr-kicker xr-center">SIZNING INGLIZ TILI PROFILINGIZ</div><p className="xr-muted xr-center">Kartada ball va daraja ko‘rsatilmaydi.</p><div className="xr-profile-card"><small>SANDBOX LC · ENGLISH X-RAY</small><div><div className="xr-kicker">INGLIZ TILI PROFILI</div><h1>{profiles[status].title}</h1><p>{profiles[status].description}</p></div><b>O‘zingizni tekshiring</b></div><div className="xr-row"><a className="xr-secondary" href={storyUrl} download="english-x-ray.png"><ArrowDownToLine size={16}/> Yuklab olish</a><button className="xr-secondary" onClick={()=>void copy()}>Do‘stga yuborish</button></div></>
  if(story){cta='Stories’ga ulashish';primaryAction=()=>void share()}
 }else if(viewStep==='booking'){
  content=<><div className="xr-kicker">SANDBOX LC</div><h1>X-Ray Full</h1><Panel><div className="xr-row"><strong>X-Ray Full</strong><span className="xr-tag">45–60 daqiqa</span></div><p>✓ Speaking intervyu</p><p>✓ Writing topshirig‘i va tahlil</p><p>✓ Yozma individual o‘quv reja</p><hr/><strong>{view.price}</strong><small>{view.terms}</small></Panel><strong>Format</strong><Choices values={['Markazda','Onlayn']} selected={format==='onsite'?'Markazda':'Onlayn'} pick={(_,i)=>setFormat(i?'online':'onsite')} compact/><strong>Qulay vaqt</strong><Choices values={['Ertalab','Kunduzi','Kechqurun']} selected={time==='morning'?'Ertalab':time==='day'?'Kunduzi':time==='evening'?'Kechqurun':undefined} pick={(_,i)=>setTime((['morning','day','evening'] as const)[i])} compact/><label>Ismingiz<input value={name} maxLength={80} onChange={e=>setName(e.target.value)}/></label></>
  cta='So‘rov yuborish';blocked=!time||name.trim().length<2;primaryAction=()=>void act('booking',{booking:{name,format,time}}).then(n=>{if(n)change(null)})
 }
 const primaryRef=useRef<HTMLButtonElement>(null)
 const ctaDisabled=busy||blocked
 useEffect(()=>{
  const tg=mini(),button=tg?.MainButton
  if(!inApp||!button||!cta){button?.hide();return}
  const click=()=>primaryRef.current?.click()
  button.setText(cta);if(ctaDisabled)button.disable();else button.enable()
  button.show();button.onClick(click)
  return()=>{button.offClick(click);button.hide()}
 },[cta,ctaDisabled,inApp])
 useEffect(()=>{
  const button=mini()?.BackButton
  const click=()=>change(null)
  if(local)button?.show();else button?.hide()
  button?.onClick(click)
  return()=>button?.offClick(click)
 },[change,local])
 return <main className={'xr-shell'+(dark?' xr-dark':'')}><header className="xr-head"><button type="button" onClick={()=>local?change(null):void sync()} aria-label={local?'Orqaga':'Sahifani yangilash'}>{local?<><ChevronLeft size={15}/> Orqaga</>:'Sandbox LC'}</button><div><b>Sandbox X-Ray</b><small>mini ilova</small></div>{view.staff?<Link href="/mvp-admin">Admin</Link>:<Link aria-label="Maxfiylik" href="/privacy"><CircleHelp size={18}/></Link>}</header>
 <div className="xr-body">{error&&<div role="alert" className="xr-error">{error} {inApp&&<button onClick={()=>void sync()}>Qayta ochish</button>}</div>}{notice&&<div role="status" className="xr-sand xr-message">{notice}</div>}{content}</div>
 {cta&&<footer className="xr-foot"><button ref={primaryRef} type="button" className="xr-primary" disabled={ctaDisabled} onClick={primaryAction}>{busy?'Saqlanmoqda…':cta}</button></footer>}
 </main>
}
function stamp(value:number){const n=Math.max(0,Math.floor(value||0));return Math.floor(n/60)+':'+String(n%60).padStart(2,'0')}
function Recording({busy,saved,save}:{busy:boolean;saved:boolean;save:(b:Blob)=>Promise<boolean>}){
 const [mode,setMode]=useState<'ready'|'prep'|'recording'|'saved'>('ready'),[seconds,setSeconds]=useState(0),[error,setError]=useState('')
 const recorder=useRef<MediaRecorder|null>(null),stream=useRef<MediaStream|null>(null)
 const timer=useRef<ReturnType<typeof setInterval>|null>(null),running=useRef(true)
 useEffect(()=>{running.current=true;return()=>{running.current=false;if(timer.current)clearInterval(timer.current);stream.current?.getTracks().forEach(t=>t.stop())}},[])
 async function start(){
  setError('')
  try{
   const tracks=await navigator.mediaDevices.getUserMedia({audio:true})
   if(!running.current){tracks.getTracks().forEach(t=>t.stop());return}
   stream.current=tracks
   const mime=['audio/webm','audio/mp4','audio/ogg'].find(t=>MediaRecorder.isTypeSupported(t))
   const r=new MediaRecorder(tracks,mime?{mimeType:mime,audioBitsPerSecond:32000}:undefined)
   recorder.current=r
   const chunks:Blob[]=[]
   r.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)}
   r.onstop=()=>{
    if(timer.current)clearInterval(timer.current);tracks.getTracks().forEach(t=>t.stop())
    if(running.current)void save(new Blob(chunks,{type:r.mimeType})).then(ok=>setMode(ok?'saved':'ready'))
   }
   r.start();setMode('recording');setSeconds(60)
   let left=60
   timer.current=setInterval(()=>{setSeconds(--left);if(left<=0&&r.state==='recording')r.stop()},1000)
  }catch{stream.current?.getTracks().forEach(t=>t.stop());setMode('ready');setError('Mikrofon ochilmadi. Bot orqali yuboring yoki bo‘limni o‘tkazing.')}
 }
 function prepare(){
  setMode('prep');setSeconds(30)
  let left=30
  timer.current=setInterval(()=>{setSeconds(--left);if(left<=0&&timer.current)clearInterval(timer.current)},1000)
 }
 return <div className="xr-record xr-center"><b>{stamp(seconds)}</b><small>{mode==='prep'?'Tayyorgarlik · 30 soniya':mode==='recording'?'Ovoz yozilmoqda · 60 soniyagacha':saved||mode==='saved'?'Ovoz saqlandi':'Javobga tayyorlaning'}</small><AudioLines size={46}/><button disabled={busy} aria-label={mode==='recording'?'Yozishni to‘xtatish':'Ovoz yozish'} onClick={()=>mode==='recording'?recorder.current?.stop():mode==='prep'?(timer.current&&clearInterval(timer.current),void start()):prepare()}>{mode==='recording'?<Square size={19}/>:<Mic size={21}/>}</button>{error&&<p className="xr-error">{error}</p>}<span>{mode==='ready'?'Tayyorgarlikni boshlash':mode==='prep'?'Yozishni boshlash':mode==='recording'?'To‘xtatish uchun bosing':'Qayta yozish'}</span></div>
}
