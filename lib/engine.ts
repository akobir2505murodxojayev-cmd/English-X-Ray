export const skillNames = { speaking:'Speaking', listening:'Listening', reading:'Reading', writing:'Writing', grammar:'Grammar', vocabulary:'Vocabulary' } as const
export type Skill = keyof typeof skillNames
export const skills = Object.keys(skillNames) as Skill[]
export type Mode = 'quick'|'full'|'certificate'
export type Question = {
 id:string; skill:Skill; kind:'single'|'multiple'|'blank'|'writing'|'speaking'; difficulty:number; topic:string;
 prompt:string; options?:string[]|null; stimulus?:string|null; audio?:string|null; key?:string[]|null
}
export type Answer = string|string[]|{recording:string}
export type Evidence = {id:string;topic:string;prompt:string;answer?:string|string[];key?:string[];correct?:boolean;difficulty:number}
export type SkillResult = {score:number|null;items:Evidence[];confidence:'cheklangan'|'o‘rtacha';feedback?:string}
export type Result = {version:string;score:number|null;level:string|null;confidence:'cheklangan'|'o‘rtacha';skills:Record<Skill,SkillResult>}
export const VERSION='xray-1.0'
export const rubrics = {
 writing:['Topshiriq bajarilishi','Mantiq va bog‘lanish','Lug‘at','Grammatika'],
 speaking:['Ravonlik','Lug‘at','Grammatika','Talaffuz']
} as const
const norm=(s:string)=>s.normalize('NFKC').toLowerCase().replace(/[‘’ʻ]/g,"'").trim().replace(/\s+/g,' ')
export function validAnswer(q: Question, answer: Answer) {
 if(q.kind==='speaking') return typeof answer==='object' && !Array.isArray(answer) && Boolean(answer.recording)
 if(q.kind==='multiple') return Array.isArray(answer) && answer.length>0 && new Set(answer).size===answer.length && answer.every(x=>q.options?.includes(x))
 if(typeof answer!=='string') return false
 if(q.kind==='single') return Boolean(q.options?.includes(answer))
 return answer.trim().length >= (q.kind==='writing'?30:1) && answer.length <= (q.kind==='writing'?5000:160)
}
export function selectQuestions(bank:Question[],mode:Mode,target=3) {
 const chosen=mode==='quick'?['grammar','vocabulary','reading','listening'] as Skill[]:['grammar','vocabulary','reading','listening','writing','speaking'] as Skill[]
 return chosen.flatMap(skill=>{
  const items=bank.filter(q=>q.skill===skill && (skill==='writing'||skill==='speaking'||q.key?.length))
  const count=skill==='writing'||skill==='speaking'?1:mode==='quick'?(skill==='grammar'||skill==='vocabulary'?3:1):mode==='full'?5:4
  if(mode==='quick') return items.sort((a,b)=>Math.abs(a.difficulty-target)-Math.abs(b.difficulty-target)||a.id.localeCompare(b.id)).slice(0,count)
  const ordered=items.sort((a,b)=>a.difficulty-b.difficulty||a.id.localeCompare(b.id))
  if(count===1) return ordered.length?[ordered[Math.max(0, Math.min(ordered.length-1,mode==='certificate'?ordered.length-1:0))]]:[]
  if(ordered.length<=count) return ordered
  return Array.from({length:count},(_,i)=>ordered[Math.round(i*(ordered.length-1)/(count-1))])
 })
}
export function summarize(details:Record<Skill,SkillResult>,mode:Mode):Result {
 const measured=skills.filter(s=>details[s].score!==null)
 const weight=(s:Skill)=>s==='grammar'||s==='vocabulary'?1:2
 const denominator=measured.reduce((n,s)=>n+weight(s),0)
 const score=denominator?Math.round(measured.reduce((n,s)=>n+(details[s].score??0)*weight(s),0)/denominator):null
 const ceiling=Math.max(1,...measured.flatMap(s=>details[s].items.filter(i=>i.correct===true).map(i=>i.difficulty)))
 const band=score===null?null:Math.min(mode==='quick'?3:5,ceiling,score>=92?5:score>=78?4:score>=60?3:score>=40?2:1)
 return {version:VERSION,score,level:band===null?null:['A1','A2','B1','B2','C1'][band-1],confidence:mode==='quick'||measured.length<6?'cheklangan':'o‘rtacha',skills:details}
}
export function scoreTest(items:Question[],answers:Record<string,Answer>,mode:Mode) {
 const details=Object.fromEntries(skills.map(skill=>{
  const evidence=items.filter(q=>q.skill===skill).map(q=>{
   const answer=answers[q.id]
   const item:Evidence={id:q.id,topic:q.topic,prompt:q.prompt,difficulty:q.difficulty}
   if(typeof answer==='string'||Array.isArray(answer)) item.answer=answer
   if(q.key?.length){
    item.key=q.key
    const values=Array.isArray(answer)?answer.map(norm):typeof answer==='string'?[norm(answer)]:[]
    const keys=q.key.map(norm)
    item.correct=q.kind==='multiple'?values.length===keys.length&&keys.every(k=>values.includes(k)):values.length===1&&keys.includes(values[0])
   }
   return item
  })
  const objective=evidence.filter(i=>i.correct!==undefined)
  const weights=objective.reduce((n,i)=>n+i.difficulty+2,0)
  const score=weights?Math.round(100*objective.reduce((n,i)=>n+(i.correct?i.difficulty+2:0),0)/weights):null
  return [skill,{score,items:evidence,confidence:objective.length>=4?'o‘rtacha':'cheklangan'}]
 })) as Record<Skill,SkillResult>
 return summarize(details,mode)
}
export function makePlan(result:Result,goals:string[],minutes=25,deadline?:string) {
 const emphasis=(skill:Skill)=>goals.includes('Speaking')&&skill==='speaking'?20:goals.some(g=>g.includes('sertifikati'))&&['writing','reading','listening','speaking'].includes(skill)?8:0
 const order=[...skills].sort((a,b)=>{
  const priority=(s:Skill)=>100-(result.skills[s].score??62)+emphasis(s)+(result.skills[s].confidence==='o‘rtacha'?4:0)
  return priority(b)-priority(a)
 })
 const practice:Record<Skill,string>={grammar:'5 ta gapni tahlil qiling, keyin mavzu bo‘yicha 5 ta yangi gap yozing.',vocabulary:'6 ta yangi so‘z birikmasini kontekstda ishlating va ertasi kuni takrorlang.',reading:'Bitta matnni o‘qing. Har javob uchun matndan dalil toping.',listening:'Audioni ikki marta tinglang va asosiy fikr hamda 3 ta detalni qayd eting.',writing:'Javob yozing va uni mazmun, bog‘lanish, lug‘at va grammatika bo‘yicha tahrirlang.',speaking:'60 soniya gapirib, ovozingizni yozing. Pauza va takrorlarni belgilang.'}
 const date=deadline?Date.parse(deadline):NaN
 const days=Number.isFinite(date)?Math.ceil((date-Date.now())/86400000):56
 const work=Math.min(90,Math.max(10,minutes+(days<28?5:0)))
 return Array.from({length:8},(_,i)=>{
  const skill=order[[0,1,0,2,1,3,4,5][i]]
  const detail=result.skills[skill]
  const topic=detail.items.find(x=>x.correct===false)?.topic
  return {week:i+1,skill,title:i===7?'Yakuniy mashq va natija':topic??skillNames[skill]+' amaliyoti',instruction:practice[skill]+(i===7?' Yakunda yangi diagnostika bilan taqqoslang.':''),minutes:work,difficulty:Math.min(5,Math.max(1,Math.ceil((detail.score??45)/22)+(i>3?1:0)))}
 })
}
export function studyDay(timezone:string, date=new Date()){
 return new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(date)
}
export function streakLength(days:string[],today:string) {
 const set=new Set(days)
 const date=new Date(today+'T00:00:00Z')
 if(!set.has(today)) date.setUTCDate(date.getUTCDate()-1)
 let count=0
 while(set.has(date.toISOString().slice(0,10))) {count++; date.setUTCDate(date.getUTCDate()-1)}
 return count
}
