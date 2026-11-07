'use client'
import {useCallback,useEffect,useRef,useState,type FormEvent,type ReactNode} from 'react'
import {AnimatePresence,motion,MotionConfig} from 'motion/react'
import {Activity,ArrowLeft,ArrowRight,AudioLines,Bell,BookOpen,Bookmark,Bot,CalendarCheck,CalendarDays,ChartNoAxesColumnIncreasing,Check,ChevronRight,ClipboardList,Download,Flame,Headphones,House,LockKeyhole,Mic,Play,Search,Send,Settings2,Shield,Star,Target,Trophy,UserRound,Zap,Pencil,BookA,Pause,Square,RotateCcw,LayoutDashboard} from 'lucide-react'
import {Fox,Logo} from './brand'
import {demoAttempt,demoScore,demoStart,saveDemo} from '../lib/demo'
import materialsSeed from '../lib/materials.json'
import {makePlan,skills,skillNames,validAnswer,type Answer,type Mode,type Result,type Skill} from '../lib/engine'
import {defaults,labels,request,type Attempt,type Material,type Settings,type State} from '../lib/ui'

const pages=['welcome','home','choose','test','scan','result','details','plan','materials','mentor','progress','badges','profile','enroll','settings','notifications','registration'] as const
type Page=typeof pages[number]
const iconFor={speaking:Mic,listening:Headphones,reading:BookOpen,writing:Pencil,grammar:Settings2,vocabulary:BookA}
const modes=[{id:'full',title:'To‘liq diagnostika',time:'20–30 daqiqa',icon:ChartNoAxesColumnIncreasing},{id:'quick',title:'Tezkor skan',time:'5–7 daqiqa',icon:Zap},{id:'certificate',title:'CEFR / IELTS yo‘nalishi',time:'10–15 daqiqa',icon:Trophy}] as const
const badgeList=[['scan','1-test'],['plan','Reja'],['streak','7 kun'],['material','Material'],['mentor','Mentor'],['course','Kurs']]
const mainPages=['home','materials','progress','profile'] as Page[]
type TWA={initData:string;ready:()=>void;expand:()=>void;openTelegramLink?:(url:string)=>void;setHeaderColor?:(color:string)=>void;setBackgroundColor?:(color:string)=>void;safeAreaInset?:{top:number;bottom:number};contentSafeAreaInset?:{top:number;bottom:number};onEvent?:(name:string,fn:()=>void)=>void;offEvent?:(name:string,fn:()=>void)=>void;BackButton?:{show:()=>void;hide:()=>void;onClick:(fn:()=>void)=>void;offClick:(fn:()=>void)=>void};HapticFeedback?:{impactOccurred:(type:'light')=>void}}
declare global{interface Window{Telegram?:{WebApp?:TWA}}}
const botUser=process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME
const botLink=botUser?'https://t.me/'+botUser:''
const buttonClass='cta'
const fmt=(x:number|null|undefined)=>x==null?'—':x+'%'
function Button({children,onClick,disabled=false,type='button'}:{children:ReactNode;onClick?:()=>void;disabled?:boolean;type?:'button'|'submit'}){
 return <motion.button whileTap={{scale:.975}} className={buttonClass} onClick={onClick} type={type} disabled={disabled}>{children}<ArrowRight size={19}/></motion.button>
}
function Meter({value}:{value:number}){return <div className="meter"><motion.div initial={{width:0}} animate={{width:Math.max(0,Math.min(100,value))+'%'}}/></div>}
function Empty({children,action,label}:{children:ReactNode;action?:()=>void;label?:string}){return <div className="empty"><Search size={28}/><p>{children}</p>{action&&<button className="pill" onClick={action}>{label}</button>}</div>}
function AudioPlayer({src}:{src:string}){
 const ref=useRef<HTMLAudioElement>(null)
 const [playing,setPlaying]=useState(false),[time,setTime]=useState(0),[duration,setDuration]=useState(0),[broken,setBroken]=useState(false)
 const stamp=(t:number)=>Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0')
 return <div className="audio-box"><audio ref={ref} src={src} preload="metadata" onTimeUpdate={()=>setTime(ref.current?.currentTime??0)} onLoadedMetadata={()=>setDuration(ref.current?.duration??0)} onEnded={()=>setPlaying(false)} onPause={()=>setPlaying(false)} onPlay={()=>setPlaying(true)} onError={()=>setBroken(true)}/>
 <button type="button" className="round orange" aria-label={playing?'Audioni pauza qilish':'Audioni tinglash'} onClick={()=>{const a=ref.current;if(!a)return;if(playing)a.pause();else void a.play().catch(()=>setBroken(true))}}>{playing?<Pause size={17}/>:<Play size={17} fill="currentColor"/>}</button>
 <label className="audio-wave"><AudioLines size={22}/><input aria-label="Audio pozitsiyasi" type="range" min={0} max={duration||1} step=".1" value={time} onChange={e=>{if(ref.current)ref.current.currentTime=Number(e.target.value);setTime(Number(e.target.value))}}/></label><strong>{broken?'Audio ochilmadi':stamp(playing?time:duration)}</strong></div>
}
function Recorder({save,busy,saved}:{save:(blob:Blob)=>Promise<void>;busy:boolean;saved:boolean}){
 const [recording,setRecording]=useState(false),[clip,setClip]=useState<Blob|null>(null),[url,setUrl]=useState(''),[error,setError]=useState('')
 const rec=useRef<MediaRecorder|null>(null),stream=useRef<MediaStream|null>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null)
 useEffect(()=>()=>{stream.current?.getTracks().forEach(t=>t.stop());if(timer.current)clearTimeout(timer.current)},[])
 useEffect(()=>{if(!clip)return;const link=URL.createObjectURL(clip);const frame=requestAnimationFrame(()=>setUrl(link));return()=>{cancelAnimationFrame(frame);URL.revokeObjectURL(link)}},[clip])
 async function start(){
  setError('');setClip(null);setUrl('')
  try{
   if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined')throw new Error()
   const s=await navigator.mediaDevices.getUserMedia({audio:true})
   stream.current=s
   const mime=['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus'].find(t=>MediaRecorder.isTypeSupported(t))
   const m=new MediaRecorder(s,mime?{mimeType:mime,audioBitsPerSecond:32000}:undefined),chunks:Blob[]=[]
   rec.current=m
   m.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)}
   m.onstop=()=>{if(timer.current)clearTimeout(timer.current);setClip(new Blob(chunks,{type:m.mimeType.split(';')[0]}));s.getTracks().forEach(t=>t.stop());setRecording(false)}
   m.start();setRecording(true);timer.current=setTimeout(()=>{if(m.state==='recording')m.stop()},120000)
  }catch{stream.current?.getTracks().forEach(t=>t.stop());setError('Mikrofonga ruxsat bering yoki Telegram’ning boshqa qurilmasidan urinib ko‘ring.')}
 }
 return <div className="card recorder"><p>Ovozingizni faqat baholash uchun yozing.</p><button className="pill" onClick={()=>recording?rec.current?.stop():void start()} disabled={busy}>{recording?<Square size={17}/>:<Mic size={17}/>} {recording?'Yozuvni to‘xtatish':'Ovoz yozish'}</button>{error&&<p className="error">{error}</p>}{clip&&url&&<><audio controls src={url}/><button className="pill active" disabled={busy} onClick={()=>void save(clip).then(()=>setClip(null)).catch(()=>setError('Yozuv saqlanmadi. Qayta urinib ko‘ring.'))}>Yozuvni saqlash</button></>}{saved&&<p className="green-text"><Check size={17}/> Ovozli javob saqlangan</p>}</div>
}
export default function Xray(){
 const [page,setPage]=useState<Page>('welcome'),[demo,setDemo]=useState(false),[loaded,setLoaded]=useState(false),[inTelegram,setInTelegram]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false)
 const [data,setData]=useState<State|null>(null),[mode,setMode]=useState<Mode>('full'),[track,setTrack]=useState<'CEFR'|'IELTS'>('CEFR'),[attempt,setAttempt]=useState<Attempt|null>(null),[index,setIndex]=useState(0),[draft,setDraft]=useState<Answer>(''),[scanResult,setScanResult]=useState<Result|null>(null),[inspect,setInspect]=useState<Result|null>(null),[photo,setPhoto]=useState('')
 const [materialList,setMaterialList]=useState<Material[]>([]),[filter,setFilter]=useState('all'),[search,setSearch]=useState(''),[material,setMaterial]=useState<Material|null>(null),[asset,setAsset]=useState<string|null>(null)
 const [period,setPeriod]=useState<'Hafta'|'Oy'|'Umumiy'>('Hafta'),[chartSkill,setChartSkill]=useState<Skill|'overall'>('overall'),[expandedSkill,setExpandedSkill]=useState<Skill|null>(null),[expandedWeek,setExpandedWeek]=useState(0),[enrollForm,setEnrollForm]=useState(false),[chatInput,setChatInput]=useState(''),[chatConsent,setChatConsent]=useState(false)
 const booted=useRef(false),revision=useRef(0),inputId=useRef(''),sessionId=useRef(''),chatEnd=useRef<HTMLDivElement>(null),scanTime=useRef<ReturnType<typeof setTimeout>|null>(null)
 const go=useCallback((next:Page,replace=false)=>{
  setError('');setNotice('');setPage(next)
  if(typeof window!=='undefined'){
   if(replace)history.replaceState(null,'','#'+next);else if(location.hash!=='#'+next)history.pushState(null,'','#'+next)
   window.scrollTo({top:0,behavior:'instant'})
   window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light')
  }
 },[])
 const refresh=useCallback(async()=>{
  const seq=++revision.current
  const value=await request<State>()
  if(seq===revision.current)setData(value)
  return value
 },[])
 const fail=(e:unknown)=>setError(e instanceof Error?e.message:'Xatolik yuz berdi.')
 const back=useCallback(()=>{
  const from:Partial<Record<Page,Page>>={choose:'home',test:'choose',scan:'test',result:'home',details:'result',plan:'home',mentor:'profile',badges:'progress',enroll:'plan',settings:'profile',notifications:'home',registration:'welcome'}
  if(page==='materials'&&material){setMaterial(null);return}
  go(from[page]??'home')
 },[page,go,material])
 useEffect(()=>{
  if(booted.current)return
  booted.current=true
  const timer=setInterval(async()=>{
   const app=window.Telegram?.WebApp
   if(!app?.initData)return
   clearInterval(timer)
   setInTelegram(true)
   app.ready();app.expand()
   app.setHeaderColor?.('#faf9fd');app.setBackgroundColor?.('#faf9fd')
   try{
    const identity=await request<{photo?:string}>('login',{initData:app.initData})
    if(identity.photo)setPhoto(identity.photo)
    await refresh()
    go(localStorage.getItem('xray-welcomed')?'home':'welcome',true)
   }catch(e){go('registration',true);fail(e)}
   finally{setLoaded(true)}
  },100)
  const stop=setTimeout(()=>{clearInterval(timer);if(!window.Telegram?.WebApp?.initData)setLoaded(true)},1800)
  return()=>{clearInterval(timer);clearTimeout(stop);booted.current=false}
 },[go,refresh])
 useEffect(()=>{
  const h=()=>{const name=location.hash.slice(1) as Page;if(pages.includes(name)&&(data||name==='welcome'||name==='registration')){setPage(name);setError('');setNotice('')}}
  window.addEventListener('popstate',h);return()=>window.removeEventListener('popstate',h)
 },[data])
 useEffect(()=>{
  const app=window.Telegram?.WebApp
  if(!app)return
  const update=()=>{
   const top=Math.max(app.safeAreaInset?.top??0,app.contentSafeAreaInset?.top??0)
   const bottom=Math.max(app.safeAreaInset?.bottom??0,app.contentSafeAreaInset?.bottom??0)
   document.documentElement.style.setProperty('--tg-top',top+'px');document.documentElement.style.setProperty('--tg-bottom',bottom+'px')
  }
  update();app.onEvent?.('safeAreaChanged',update);app.onEvent?.('contentSafeAreaChanged',update)
  const button=app.BackButton
  if(!mainPages.includes(page)&&page!=='welcome')button?.show();else button?.hide()
  button?.onClick(back)
  return()=>{button?.offClick(back);app.offEvent?.('safeAreaChanged',update);app.offEvent?.('contentSafeAreaChanged',update)}
 },[page,back,inTelegram])
 useEffect(()=>{
  if(page!=='materials')return
  if(demo){const frame=requestAnimationFrame(()=>setMaterialList(materialsSeed));return()=>cancelAnimationFrame(frame)}
  if(data)request<Material[]>('materials').then(setMaterialList).catch(fail)
 },[page,demo,data])
 const pending=Boolean(data?.chat.some(x=>x.status==='queued'||x.status==='running'))
 useEffect(()=>{
  if(page!=='mentor'||demo||!pending)return
  const interval=setInterval(()=>{void refresh().catch(()=>{})},1800)
  return()=>clearInterval(interval)
 },[page,demo,pending,refresh])
 useEffect(()=>{if(page==='mentor')chatEnd.current?.scrollIntoView({block:'nearest',behavior:'smooth'})},[page,data?.chat.length])
 useEffect(()=>()=>{if(scanTime.current)clearTimeout(scanTime.current)},[])
 function beginDemo(){
  const value=demoStart();setDemo(true);setData(value)
  const route=new URLSearchParams(location.search).get('screen') as Page|null
  if(route&&pages.includes(route)&&!['test','scan','registration','welcome'].includes(route))go(route)
  else go('home')
 }
 function changeDemo(fn:(current:State)=>State){
  setData(current=>{if(!current)return current;const updated=fn(current);saveDemo(updated);return updated})
 }
 async function action(name:string,body:unknown){
  setBusy(true);setError('')
  try{await request(name,body);await refresh();return true}
  catch(e){fail(e);return false}
  finally{setBusy(false)}
 }
 function openAttempt(a:Attempt){
  const next=Math.max(0,a.items.findIndex(x=>a.answers[x.id]===undefined))
  setAttempt(a);setIndex(next);setDraft(a.answers[a.items[next]?.id]??'');go('test')
 }
 async function start(){
  if(!data)return
  setBusy(true);setError('')
  try{
   const a=demo?(attempt?.status==='active'?attempt:demoAttempt(mode)):data.active?await request<Attempt>('attempt',undefined,data.active):await request<Attempt>('start',{mode,track})
   if(!demo)void refresh().catch(()=>{})
   openAttempt(a)
  }catch(e){fail(e)}finally{setBusy(false)}
 }
 const q=attempt?.items[index]
 function changeIndex(n:number,a:Attempt){setIndex(n);setDraft(a.answers[a.items[n]?.id]??'');setError('');window.scrollTo({top:0,behavior:'instant'})}
 async function saveRecord(blob:Blob){
  if(!q||!attempt)return
  setBusy(true)
  try{
   if(!demo){const form=new FormData();form.append('audio',blob,'answer');form.append('session',attempt.id);form.append('question',q.id);await request('record',form)}
   const a={recording:'saved'};setDraft(a);setAttempt({...attempt,answers:{...attempt.answers,[q.id]:a}})
  }finally{setBusy(false)}
 }
 async function submit(a:Attempt){
  go('scan')
  setScanResult(null)
  setBusy(true)
  try{
   const result=demo?demoScore(a):(await request<{result:Result}>('submit',{id:a.id})).result
   if(demo){
    const date=new Date().toISOString(),status=a.items.some(x=>x.skill==='writing'||x.skill==='speaking')?'review':'complete'
    changeDemo(s=>({...s,result,resultStatus:status,active:null,history:[{id:a.id,mode:a.mode,status,created_at:date,submitted_at:date,result},...s.history],tasks:makePlan(result,['CEFR sertifikati']).map((t,i)=>({...t,id:a.id+'-'+i})),xp:s.xp+50,badges:[...new Set([...s.badges,'scan'])]}))
   }else await refresh()
   setAttempt({...a,status:'complete'});setScanResult(result);setInspect(null)
   scanTime.current=setTimeout(()=>go('result'),900)
  }catch(e){fail(e)}finally{setBusy(false)}
 }
 async function next(){
  if(!attempt||!q||!validAnswer(q,draft))return
  setBusy(true);setError('')
  try{
   if(q.kind!=='speaking'&&!demo) await request('answer',{session:attempt.id,question:q.id,answer:draft})
   const updated={...attempt,answers:{...attempt.answers,[q.id]:draft}}
   setAttempt(updated)
   if(index+1<attempt.items.length)changeIndex(index+1,updated)
   else {
    const missing=updated.items.findIndex(x=>updated.answers[x.id]===undefined)
    if(missing>=0)changeIndex(missing,updated)
    else if(window.confirm('Testni yakunlaysizmi?'))await submit(updated)
   }
  }catch(e){fail(e)}finally{setBusy(false)}
 }
 async function openMaterial(row:Material){
  setMaterial(row);setAsset(null);setError('')
  try{if(row.asset_path)setAsset(demo?row.asset_path:(await request<{url:string|null}>('material',undefined,row.id)).url)}
  catch(e){fail(e)}
 }
 async function download(row:Material){
  try{
   const url=row.asset_path?(demo?row.asset_path:(await request<{url:string}>('material',undefined,row.id,true)).url):URL.createObjectURL(new Blob([row.title+'\n\n'+(row.content??'')],{type:'text/plain;charset=utf-8'}))
   const a=document.createElement('a');a.href=url;a.download=row.id+(row.asset_path?.startsWith('/audio/')?'.mp3':row.asset_path?'':'.txt');a.target='_blank';a.rel='noopener';a.click()
   if(!row.asset_path)setTimeout(()=>URL.revokeObjectURL(url),2000)
  }catch(e){fail(e)}
 }
 function materialAction(id:string,bookmark?:boolean,complete?:true){
  if(!demo){void action('material',{id,bookmark,complete});return}
  changeDemo(s=>{
   const previous=s.progress.find(p=>p.material_id===id),fresh=complete&&!previous?.completed_at
   return {...s,progress:[...s.progress.filter(p=>p.material_id!==id),{material_id:id,bookmarked:bookmark??previous?.bookmarked??false,completed_at:fresh?new Date().toISOString():previous?.completed_at}],xp:s.xp+(fresh?10:0),badges:fresh?[...new Set([...s.badges,'material'])]:s.badges}
  })
 }
 async function enroll(e:FormEvent<HTMLFormElement>){
  e.preventDefault()
  const f=new FormData(e.currentTarget)
  const name=String(f.get('name')).trim(),phone=String(f.get('phone')).trim(),method=f.get('method'),consent=f.get('consent')==='on'
  if(name.length<2||!/^\+?[\d ().-]{9,22}$/.test(phone)||!consent){setError('Ism, telefon va rozilikni tekshiring.');return}
  sessionId.current||=crypto.randomUUID()
  const ok=demo?true:await action('enroll',{id:sessionId.current,name,phone,method,consent})
  if(ok){if(demo)changeDemo(s=>({...s,applications:[{id:sessionId.current,status:'new',created_at:new Date().toISOString()},...s.applications]}));setEnrollForm(false);setNotice(demo?'Sinov arizasi saqlandi.':'Arizangiz qabul qilindi.')}
 }
 async function sendChat(e:FormEvent){
  e.preventDefault()
  const value=chatInput.trim()
  if(!value||!data?.ai||!chatConsent)return
  inputId.current||=crypto.randomUUID()
  if(await action('chat',{id:inputId.current,message:value})){setChatInput('');inputId.current=''}
 }
 const current=inspect??data?.result??scanResult
 const skillRows=current?skills.map(s=>({skill:s,...current.skills[s]})):[]
 const focus=[...skillRows].filter(s=>s.score!==null).sort((a,b)=>(a.score??0)-(b.score??0)).slice(0,2)
 const materialRows=materialList.filter(m=>(filter==='all'||filter==='saved'&&data?.progress.some(p=>p.material_id===m.id&&p.bookmarked)||m.category===filter)&&((m.title+' '+m.description).toLowerCase().includes(search.toLowerCase())))
 const name=data?.profile.name.split(' ')[0]
 const webBot=()=>{if(botLink){if(window.Telegram?.WebApp?.openTelegramLink)window.Telegram.WebApp.openTelegramLink(botLink);else location.href=botLink}}
 const bottom=mainPages.includes(page)
 function render(){
  if(page==='welcome')return <section className="welcome screen"><div className="welcome-title"><h1>English</h1><b>X-Ray</b></div><p className="welcome-copy">Ingliz tilingizni to‘liq skaner qiling va shaxsiy o‘sish rejangizni oling!</p><div className="hero-art"><div className="hills"/><i className="sparks"/><Fox variant="scan"/></div><div className="bottom-action">{inTelegram&&data?<Button onClick={()=>{localStorage.setItem('xray-welcomed','1');go('home')}}>Boshlash</Button>:botLink?<><Button disabled={!loaded} onClick={webBot}>Telegram’da ochish</Button><button className="text-button" onClick={beginDemo}>Namoyishni ko‘rish</button></>:<><Button disabled={!loaded} onClick={beginDemo}>Namoyishni boshlash</Button><p className="small center">English X-Ray Telegram Mini App</p></>}</div></section>
  if(page==='registration')return <section className="screen"><h1>English X-Ray’ga kirish</h1><Fox className="medium-fox"/><p>Botda ro‘yxatdan o‘ting va Mini App tugmasi orqali qayta kiring.</p>{botLink&&<Button onClick={webBot}>Telegram botga o‘tish</Button>}<button className="text-button" onClick={beginDemo}>Namoyishni ko‘rish</button></section>
  if(!data)return <section className="screen"><Empty action={()=>go('welcome')} label="Boshiga qaytish">Ilovani Telegram botidan oching.</Empty></section>
  switch(page){
   case 'home':return <section className="screen home"><h2>Salom, {name}! 👋</h2><p className="lede">Bugun English X-Ray kuni!</p><div className="card diagnostic"><Target className="target" size={55}/><h2>X-Ray Test</h2><p>Darajangiz va zaif tomonlaringizni aniqlang</p><Button onClick={()=>data.active?void start():go('choose')}>{data.active?'Testni davom ettirish':'Testni boshlash'}</Button></div><div className="shortcuts">{([[BookOpen,'Materiallar','materials','green'],[ChartNoAxesColumnIncreasing,'Natijalar','result','purple'],[Shield,'Reja','plan','yellow']] as const).map(([Icon,label,to,tone])=><button key={to} className={'card shortcut '+tone} onClick={()=>{setInspect(null);go(to)}}><Icon size={34}/><span>{label}</span></button>)}</div>{data.result&&<button className="card list-item home-note" onClick={()=>go('plan')}><Zap size={20}/><div><b>Bugungi tavsiya</b><small>{data.tasks.find(t=>!t.completed_at)?.title??'Yangi diagnostika topshiring'}</small></div><ChevronRight size={18}/></button>}</section>
   case 'choose':return <section className="screen choose"><h1>Qaysi tahlilni<br/>boshlaysiz?</h1><div className="stack">{modes.map(m=><button className={'card choice '+(mode===m.id?'selected':'')} aria-pressed={mode===m.id} onClick={()=>setMode(m.id)} key={m.id}><m.icon className="gold-icon" size={32}/><span><b>{m.title}</b><small>({m.time})</small></span><span className="radio">{mode===m.id&&<Check size={14}/>}</span></button>)}</div>{mode==='certificate'&&<div className="pills">{(['CEFR','IELTS'] as const).map(t=><button className={'pill '+(track===t?'active':'')} key={t} onClick={()=>setTrack(t)}>{t}</button>)}</div>}<div className="bottom-action"><Button disabled={busy} onClick={()=>void start()}>Davom etish</Button></div></section>
   case 'test':{
    if(!attempt||!q)return <section className="screen"><Empty action={()=>void start()} label="Testni yuklash">Savollarni oching.</Empty></section>
    const Icon=iconFor[q.skill]
    return <section className="screen test"><div className="test-progress"><Meter value={100*(index+1)/attempt.items.length}/><b>{index+1} / {attempt.items.length}</b></div><h2 className="skill-heading"><Icon className="gold-icon"/> {skillNames[q.skill]}</h2>{q.audio&&<AudioPlayer key={q.audio} src={q.audio}/>} {q.stimulus&&<div className="card passage">{q.stimulus}</div>}<h3 className="question">{q.prompt}</h3>
    {q.options&&<div className="stack options">{q.options.map(o=>{
     const yes=Array.isArray(draft)?draft.includes(o):draft===o
     return <button key={o} className={'card choice answer '+(yes?'selected':'')} aria-pressed={yes} onClick={()=>setDraft(q.kind==='multiple'?(Array.isArray(draft)?yes?draft.filter(x=>x!==o):[...draft,o]:[o]):o)}><span className="radio">{yes&&<Check size={12}/>}</span><span>{o}</span>{yes&&<Check size={16}/>}</button>
    })}</div>}
    {q.kind==='blank'&&<input aria-label="Javob" placeholder="Javobingizni yozing" maxLength={160} value={String(draft)} onChange={e=>setDraft(e.target.value)}/>}
    {q.kind==='writing'&&<><textarea aria-label="Writing javobi" rows={8} maxLength={5000} value={String(draft)} onChange={e=>setDraft(e.target.value)} placeholder="Javobingizni yozing…"/><p className="small">{String(draft).trim().split(/\s+/).filter(Boolean).length} so‘z</p></>}
    {q.kind==='speaking'&&<Recorder key={q.id} save={saveRecord} saved={typeof draft==='object'&&!Array.isArray(draft)} busy={busy}/>}
    <div className="bottom-action next-row"><button className="round" aria-label="Oldingi savol" disabled={busy} onClick={()=>index>0?changeIndex(index-1,attempt):go('choose')}><ArrowLeft size={21}/></button><Button disabled={busy||!validAnswer(q,draft)} onClick={()=>void next()}>{index===attempt.items.length-1?'Testni yakunlash':'Keyingi savol'}</Button></div></section>
   }
   case 'scan':return <section className="screen scan"><h1 className="center">Tahlil qilinmoqda...</h1><div className={'scanner '+(scanResult?'finished':'')}><div/><Fox/></div><div className="card scan-list">{(['listening','reading','writing','speaking','grammar','vocabulary'] as const).map(s=><div key={s}>{skillNames[s]}<span>{scanResult?.skills[s].score!=null?<Check size={18}/>:scanResult?.skills[s].items.length?'Baholanadi':'⋯'}</span></div>)}</div>{error&&attempt&&<Button disabled={busy} onClick={()=>void submit(attempt)}>Qayta urinish</Button>}</section>
   case 'result':return <section className="screen result"><h1 className="center">Sizning <em>X-Ray</em> natijangiz</h1>{!current?<Empty action={()=>go('choose')} label="Testni boshlash">Natijangiz testdan keyin shu yerda ko‘rinadi.</Empty>:<><div className="seal"><div><strong>{current.level??'—'}</strong><small>{fmt(current.score)} · Taxminiy daraja</small></div></div><div className="skill-grid">{(['speaking','listening','reading','writing'] as const).map(s=>{const Icon=iconFor[s];return <button className="card skill-card" key={s} onClick={()=>{setExpandedSkill(s);go('details')}}><Icon size={25}/><span>{skillNames[s]}<b>{fmt(current.skills[s].score)}</b></span></button>})}</div><p className="small center">Ishonch darajasi {current.confidence}. {data.resultStatus==='review'?'Ochiq javoblar baholanishi kutilmoqda.':''} Bu rasmiy sertifikat bahosi emas.</p><div className="bottom-action"><Button onClick={()=>go('details')}>Batafsil tahlil</Button></div></>}</section>
   case 'details':return <section className="screen"><h1>Ko‘nikmalar bo‘yicha natija</h1>{!current?<Empty action={()=>go('choose')} label="Testni boshlash">Hozircha tahlil yo‘q.</Empty>:<><div className="detail-bars">{skillRows.map(row=>{const Icon=iconFor[row.skill];return <div key={row.skill}><button className="bar-row" onClick={()=>setExpandedSkill(expandedSkill===row.skill?null:row.skill)} aria-expanded={expandedSkill===row.skill}><Icon className="gold-icon" size={26}/><span><span><b>{skillNames[row.skill]}</b><b>{fmt(row.score)}</b></span><Meter value={row.score??0}/></span></button>{expandedSkill===row.skill&&<div className="card evidence"><b>{row.feedback??(row.score===null?(row.items.length?'Baholash kutilmoqda':'Bu testda o‘lchanmagan'):'Javoblar va dalillar')}</b>{row.items.map(i=><div key={i.id}><span>{i.correct===undefined?'•':i.correct?'✓':'×'} {i.topic}</span><p>{i.prompt}</p>{i.answer&&<small>Sizning javobingiz · {Array.isArray(i.answer)?i.answer.join(', '):i.answer}</small>}{i.key&&<small>Kalit · {i.key.join(', ')}</small>}</div>)}<button className="pill" onClick={()=>{setFilter(row.skill);go('materials')}}>Mos mashqlarni ko‘rish</button></div>}</div>})}</div><div className="card focus"><Trophy size={30}/><div><b>Asosiy e’tibor</b><p>{focus.length?focus.map(x=>skillNames[x.skill]).join(' va ')+' ko‘nikmalarini kuchaytiring.':'Mavjud ko‘nikmalarni mashq qiling.'}</p></div></div><Button onClick={()=>go('plan')}>Shaxsiy rejam</Button></>}</section>
   case 'plan':return <section className="screen plan"><h1>Sizning<br/>shaxsiy rejangiz</h1>{!data.tasks.length?<Empty action={()=>go('choose')} label="Testni boshlash">Reja diagnostika natijangizdan tuziladi.</Empty>:<><div className="plan-tag"><CalendarDays size={19}/> 8 hafta</div><div className="timeline">{data.tasks.map(t=><div key={t.id} className="timeline-item"><span className={'point '+(t.completed_at?'done':'')}>{t.completed_at?<Check size={15}/>:t.week}</span><div><button className="task-title" onClick={()=>setExpandedWeek(expandedWeek===t.week?0:t.week)}><b>{t.week}-hafta</b><span>{t.title}</span><small>{skillNames[t.skill]} · {t.minutes} daqiqa</small></button>{expandedWeek===t.week&&<div className="task-body"><p>{t.instruction}</p><div className="pills"><button className="pill" onClick={()=>{setFilter(t.skill);go('materials')}}>Materiallar</button><button disabled={busy||!!t.completed_at} className="pill active" onClick={()=>demo?changeDemo(s=>({...s,xp:s.xp+15,tasks:s.tasks.map(x=>x.id===t.id?{...x,completed_at:new Date().toISOString()}:x)})):void action('task',{id:t.id})}>{t.completed_at?'Bajarildi':'Bajarildi deb belgilash'}</button></div></div>}</div></div>)}</div></>}<div className="bottom-action"><Button onClick={()=>go('enroll')}>Kursga yozilish</Button></div></section>
   case 'materials':return <section className="screen materials"><h1>{material?material.title:<>Siz uchun<br/>tayyor materiallar</>}</h1>{material?<div className="card material-detail"><p>{material.content}</p>{asset&&material.kind==='audio'&&<AudioPlayer src={asset}/ >}{asset&&material.kind==='video'&&<video controls src={asset}/>}<div className="pills"><button className="pill" onClick={()=>void download(material)}><Download size={17}/> Yuklab olish</button><button className="pill active" disabled={busy||Boolean(data.progress.find(x=>x.material_id===material.id)?.completed_at)} onClick={()=>materialAction(material.id,undefined,true)}>Bajarildi</button></div></div>:<><div className="pills filters">{['all','writing','speaking','listening','reading','grammar','vocabulary','saved'].map(k=><button className={'pill '+(filter===k?'active':'')} key={k} onClick={()=>setFilter(k)}>{k==='all'?'Barchasi':k==='saved'?'Saqlangan':skillNames[k as Skill]}</button>)}</div><label className="search"><Search size={17}/><input placeholder="Material qidirish" value={search} onChange={e=>setSearch(e.target.value)}/></label><div className="stack">{materialRows.map((m,i)=>{const Icon=iconFor[m.category as Skill]??BookOpen;const saved=data.progress.some(p=>p.material_id===m.id&&p.bookmarked);return <div className="card material-row" key={m.id}><button className="material-open" onClick={()=>void openMaterial(m)}><span className={'file-icon tone-'+i%4}><Icon size={21}/></span><span><b>{m.title}</b><small>{m.description}</small></span></button><button className="round tiny" aria-label={saved?'Saqlangandan olib tashlash':'Materialni saqlash'} onClick={()=>materialAction(m.id,!saved)} disabled={busy}><Bookmark fill={saved?'currentColor':'none'} size={17}/></button><button className="round tiny" aria-label="Materialni yuklab olish" onClick={()=>void download(m)}><Download size={18}/></button></div>})}</div>{!materialRows.length&&<Empty>Material topilmadi.</Empty>}</>}</section>
   case 'mentor':return <section className="screen mentor"><h1><Bot className="gold-icon" size={29}/> X-Ray AI Mentor</h1><div className="bubble bot">Salom! Men — Sandbox AI Mentor. Natijalaringiz asosida mavzu, mashq va maslahat bera olaman. Nimadan boshlaymiz?</div><div className="stack chips">{['Writing bo‘yicha maslahat','Speaking amaliyoti','Grammar muammolarim','Umumiy o‘quv rejasi'].map(x=><button className="pill" key={x} onClick={()=>setChatInput(x)}>{x}</button>)}</div>{!data.ai&&<p className="small">AI Mentor xizmatini ulash kutilmoqda.</p>}{data.ai&&!chatConsent&&<label className="check"><input type="checkbox" checked={chatConsent} onChange={e=>setChatConsent(e.target.checked)}/> Xabarim va o‘quv konteksti AI xizmatiga yuborilishiga roziman.</label>}<div className="messages">{data.chat.map(m=><div key={m.id}><div className="bubble self">{m.input}</div><div className="bubble bot">{m.status==='done'?m.output:m.status==='failed'?<>Javob olinmadi. {m.tries<4&&<button className="text-button" onClick={()=>void action('chat',{id:m.id,retry:true})}>Qayta urinish</button>}</>:'Javob tayyorlanmoqda…'}</div></div>)}<div ref={chatEnd}/></div><form className="composer bottom-action" onSubmit={sendChat}><input aria-label="Mentorga xabar" placeholder="Xabar yozing…" maxLength={1500} value={chatInput} onChange={e=>setChatInput(e.target.value)}/><button className="round orange" aria-label="Xabar yuborish" disabled={busy||!data.ai||!chatInput.trim()||!chatConsent}><Send size={19}/></button></form></section>
   case 'progress':return <section className="screen"><h1 className="center">O‘sish dinamikasi</h1><div className="pills spread">{(['Hafta','Oy','Umumiy'] as const).map(p=><button className={'pill '+(p===period?'active':'')} key={p} onClick={()=>setPeriod(p)}>{p}</button>)}</div><label className="chart-selector"><span>Ko‘nikma</span><select value={chartSkill} onChange={e=>setChartSkill(e.target.value as Skill|'overall')}><option value="overall">Umumiy natija</option>{skills.map(s=><option key={s} value={s}>{skillNames[s]}</option>)}</select></label><ProgressChart history={data.history} period={period} skill={chartSkill}/><div className="skill-grid"><div className="card metric"><Activity/><span><b>{data.tasks.filter(t=>t.completed_at).length} ta</b><small>Bajarilgan vazifa</small></span></div><div className="card metric"><CalendarCheck/><span><b>{data.activeDays.length} kun</b><small>Faol o‘qish</small></span></div></div><div className="card cheer"><Fox/><div><b>{data.streak? 'A’lo!':'Boshlashga tayyormisiz?'}</b><p>{data.streak?data.streak+' kunlik faollik seriyasi.':'Birinchi faollik testdan boshlanadi.'}</p></div></div><button className="card list-item" onClick={()=>go('badges')}><Trophy size={21}/><b>Yutuqlarim</b><ChevronRight size={17}/></button></section>
   case 'badges':return <section className="screen badges"><h1 className="center">Yutuqlarim</h1><div className="trophy-seal"><Flame size={73} fill="#ffdc4a"/></div><h2 className="center">Progress Badge</h2><div className="test-progress"><Meter value={100*data.badges.length/badgeList.length}/><b>{data.badges.length} / {badgeList.length}</b></div><div className="badge-grid">{badgeList.map(([id,label],i)=>{const unlocked=data.badges.includes(id);const Icon=unlocked?i===2?Star:Check:LockKeyhole;return <div className={'card badge '+(unlocked?'unlocked tone-'+i%4:'locked')} key={id}><Icon size={34}/><b>{label}</b></div>})}</div><div className="card focus"><Zap size={28}/><div><b>{data.xp} XP · {data.streak} kun</b><p>Bugungi vazifa uchun shaxsiy rejangizni oching.</p></div></div><Button onClick={()=>go('plan')}>Bugungi vazifa</Button></section>
   case 'profile':return <section className="screen"><h1 className="center">Mening profilim</h1><div className="profile-hero">{photo?<div className="profile-photo" style={{backgroundImage:'url('+JSON.stringify(photo)+')'}} aria-label="Telegram profil rasmi"/>:<Fox/>}<div><h2>{data.profile.name}</h2><span className="level-pill">{data.result?data.result.level+' · '+fmt(data.result.score):'Test kutilmoqda'}</span></div></div><div className="card menu">{([[ChartNoAxesColumnIncreasing,'Mening natijalarim',()=>{setInspect(null);go('result')}],[CalendarCheck,'O‘quv rejam',()=>go('plan')],[Bookmark,'Saqlangan materiallar',()=>{setFilter('saved');go('materials')}],[Bot,'AI Mentor chat',()=>go('mentor')],[Settings2,'Sozlamalar',()=>go('settings')],[Trophy,'Yutuqlarim',()=>go('badges')],[Target,'Kursga yozilish',()=>go('enroll')]] as const).map(([Icon,label,cb])=><button key={label} className="list-item" onClick={cb}><Icon size={20}/><b>{label}</b><ChevronRight size={17}/></button>)}{data.profile.role!=='student'&&<a className="list-item" href="/admin"><LayoutDashboard size={20}/><b>Admin paneli</b><ChevronRight size={17}/></a>}</div>{data.history.length>0&&<details className="card history"><summary>Natijalar tarixi</summary>{data.history.map(h=><button className="list-item" key={h.id} onClick={()=>{setInspect(h.result);go('result')}}><ClipboardList size={18}/><b>{new Date(h.created_at).toLocaleDateString('uz-UZ')} · {h.result.level} · {fmt(h.result.score)}</b><ChevronRight size={17}/></button>)}</details>}</section>
   case 'settings':return <section className="screen"><h1>Sozlamalar</h1><SettingsForm state={data} busy={busy} save={async v=>{if(demo){changeDemo(s=>({...s,profile:{...s.profile,settings:v,timezone:v.timezone,marketing:v.marketing}}));setNotice('Sozlamalar saqlandi.')}else if(await action('settings',v))setNotice('Sozlamalar saqlandi.')}} remove={async()=>{if(!window.confirm('Hisobni o‘chirish bo‘yicha so‘rov yuborasizmi?'))return;if(demo){localStorage.removeItem('english-xray-preview-v1');setData(null);setDemo(false);go('welcome')}else {try{await request('delete',{confirm:true});setData(null);go('registration');setNotice('Hisobni o‘chirish so‘rovi yuborildi.')}catch(e){fail(e)}}}}/></section>
   case 'enroll':return <section className="screen enroll"><h1 className="center">Natijani real hayotda<br/>ko‘rishga tayyormisiz?</h1>{!enrollForm?<><div className="hero-art enrollment-art"><div className="hills"/><i className="sparks"/><Fox variant="graduation"/></div><div className="card benefits">{['Individual yondashuv','Aniq o‘sish rejasi','Mentor nazorati','CEFR / IELTS ga tayyorlov'].map(x=><p key={x}><Check size={17}/>{x}</p>)}</div>{data.applications[0]&&<div className="card status"><b>Ariza holati</b><p>{labels[data.applications[0].status]}</p></div>}<div className="bottom-action"><Button onClick={()=>setEnrollForm(true)}>Kursga yozilish</Button></div></>:<form className="card form" onSubmit={enroll}><label>Ism va familiya<input name="name" required maxLength={80} defaultValue={data.profile.name}/></label><label>Telefon raqami<input name="phone" type="tel" required maxLength={30} defaultValue={data.profile.phone??''} placeholder="+998"/></label><label>Bog‘lanish usuli<select name="method"><option>Telefon</option><option>Telegram</option></select></label><label className="check"><input type="checkbox" name="consent" required/> Sandbox LC kurs arizasi bo‘yicha bog‘lanishiga roziman.</label><Button disabled={busy} type="submit">Arizani yuborish</Button></form>}</section>
   case 'notifications':return <section className="screen"><h1>Bildirishnomalar</h1>{data.applications.length||data.badges.length?<div className="card menu">{data.applications.slice(0,4).map(a=><button className="list-item" key={a.id} onClick={()=>go('enroll')}><Bell size={18}/><b>Kurs arizasi · {labels[a.status]}</b><ChevronRight size={17}/></button>)}{data.badges.map(id=><button className="list-item" key={id} onClick={()=>go('badges')}><Trophy size={18}/><b>Yutuq · {badgeList.find(b=>b[0]===id)?.[1]??id}</b><ChevronRight size={17}/></button>)}</div>:<Empty>Hozircha bildirishnomalar yo‘q.</Empty>}</section>
  }
 }
 return <MotionConfig reducedMotion="user"><main className={'shell '+(page==='welcome'?'splash':'')+(inTelegram?' telegram':'')}>
  <header className="top"><span>{!mainPages.includes(page)&&page!=='welcome'&&<button className="header-button" aria-label="Orqaga" onClick={back}><ArrowLeft size={23}/></button>}</span><Logo/><span>{page==='home'&&<button className="header-button bell" aria-label="Bildirishnomalar" onClick={()=>go('notifications')}><Bell size={22}/></button>}</span></header>
  {demo&&<div className="demo-label">NAMOYISH <span>·</span> Sinov ma’lumotlari</div>}
  {error&&<div role="alert" className="banner error">{error}</div>}
  {notice&&<div role="status" className="banner success">{notice}</div>}
  <AnimatePresence mode="wait" initial={false}><motion.div className="content" key={page} initial={{opacity:0,y:7}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{duration:.14}}>{render()}</motion.div></AnimatePresence>
  {bottom&&<nav className="tabs" aria-label="Asosiy bo‘limlar">{([[House,'Asosiy','home'],[BookOpen,'O‘qish','materials'],[CalendarCheck,'Jarayon','progress'],[UserRound,'Profil','profile']] as const).map(([Icon,label,target])=><button key={target} aria-current={page===target?'page':undefined} onClick={()=>{if(target==='materials'){setFilter('all');setMaterial(null)}go(target)}}><Icon size={23}/><span>{label}</span></button>)}</nav>}
 </main></MotionConfig>
}
function ProgressChart({history,period,skill}:{history:State['history'];period:string;skill:Skill|'overall'}){
 const [now]=useState(()=>Date.now())
 const cutoff=now-(period==='Hafta'?7:period==='Oy'?30:36500)*86400000
 const series=history.filter(a=>Date.parse(a.submitted_at??a.created_at)>=cutoff).reverse().flatMap(a=>{
  const value=skill==='overall'?a.result.score:a.result.skills[skill].score
  return value===null?[]:[{value,date:a.submitted_at??a.created_at}]
 }).slice(-12)
 if(!series.length)return <Empty>Bu davrda baholangan natija yo‘q.</Empty>
 const points=series.map((s,i)=>({x:series.length===1?175:34+i*274/(series.length-1),y:152-s.value*1.25,...s}))
 const line=points.map(p=>p.x+','+p.y).join(' ')
 return <div className="chart"><svg viewBox="0 0 330 187" role="img" aria-label={'Natijalar '+points.map(p=>p.value+'%').join(', ')}><defs><linearGradient id="plot" x2="0" y2="1"><stop stopColor="#ffb36c" stopOpacity=".38"/><stop offset="1" stopColor="#ffe4c9" stopOpacity=".15"/></linearGradient></defs>{[0,25,50,75,100].map(n=><g key={n}><text x="1" y={155-n*1.25}>{n}</text><line x1="34" y1={152-n*1.25} x2="312" y2={152-n*1.25} stroke="#eae7ed"/></g>)}{points.length>1&&<polygon points={points[0].x+',152 '+line+' '+points.at(-1)?.x+',152'} fill="url(#plot)"/>}<motion.polyline key={line} points={line} fill="none" stroke="#ff7900" strokeWidth="3" initial={{pathLength:0}} animate={{pathLength:1}}/>{points.map((p,i)=><g key={i}><circle cx={p.x} cy={p.y} r="5" fill="#ff7900" stroke="#ff5b00"/>{(i===0||i===points.length-1||points.length<6)&&<text x={p.x} y="171" textAnchor="middle">{new Date(p.date).toLocaleDateString('uz-UZ',{day:'numeric',month:'numeric'})}</text>}</g>)}</svg><span className="chart-value">{fmt(points.at(-1)?.value)}</span></div>
}
function SettingsForm({state,busy,save,remove}:{state:State;busy:boolean;save:(value:Settings)=>Promise<void>;remove:()=>Promise<void>}){
 const [form,setForm]=useState<Settings>({...defaults,...state.profile.settings,timezone:state.profile.timezone,marketing:state.profile.marketing})
 return <form className="card form" onSubmit={e=>{e.preventDefault();void save(form)}}><label>Material tili<select value={form.language} onChange={e=>setForm({...form,language:e.target.value as 'uz'|'en'})}><option value="uz">O‘zbekcha</option><option value="en">Inglizcha</option></select></label><label>Kunlik o‘qish (daqiqa)<input type="number" min={10} max={90} required value={form.minutes} onChange={e=>setForm({...form,minutes:Number(e.target.value)})}/></label><label>Imtihon sanasi (ixtiyoriy)<input type="date" value={form.deadline??''} onChange={e=>setForm({...form,deadline:e.target.value})}/></label><label>Vaqt mintaqasi<select value={form.timezone} onChange={e=>setForm({...form,timezone:e.target.value})}>{[...new Set([form.timezone,'Asia/Tashkent','Asia/Samarkand','Europe/London','America/New_York','UTC'])].map(x=><option key={x}>{x}</option>)}</select></label>{([['notifications','Bildirishnomalar'],['reminders','O‘qish eslatmasi'],['marketing','Kurs xabarlarini olish']] as const).map(([k,text])=><label key={k} className="check"><input type="checkbox" checked={form[k]} onChange={e=>setForm({...form,[k]:e.target.checked})}/>{text}</label>)}<Button type="submit" disabled={busy}>Saqlash</Button><a href="/privacy">Maxfiylik siyosati</a><button type="button" className="text-button danger" onClick={()=>void remove()}>Hisobni o‘chirish so‘rovi</button></form>
}
