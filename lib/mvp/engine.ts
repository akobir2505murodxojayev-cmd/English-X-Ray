import {defaultConfig, goals, skillLabels, type Answer, type Config, type Item, type Module, type Profile, type Report, type Skill, type Stored} from './model'
export function chooseModule(correct:number,[low,mid]=defaultConfig.routing):Exclude<Module,'routing'>{
 return correct<=low?'A':correct<=mid?'B':'C'
}
export function chooseItems(bank:Item[],module:Module,size:number,self=1,random=Math.random){
 const eligible=bank.filter(q=>q.module===module&&(q.skill==='grammar'||q.skill==='vocabulary'))
 const list=[...eligible]
 for(let i=list.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[list[i],list[j]]=[list[j],list[i]]}
 const distinct=new Set<string>()
 const first=list.filter(q=>{if(distinct.has(q.topic))return false;distinct.add(q.topic);return true})
 const coverage=module==='routing'?Math.min(size,6):6
 const chosen=[...first.slice(0,coverage),...list.filter(q=>!first.slice(0,coverage).includes(q))].slice(0,size)
 if(chosen.length<size||first.length<coverage)throw new Error('Insufficient diagnostic content for '+module)
 return self===0?chosen.sort((a,b)=>a.level.localeCompare(b.level)):chosen
}
export function score(items:Item[],answers:Answer[],state:Pick<Stored,'module'|'mediaModule'|'goal'|'context'|'voice'>,config:Config):Report{
 const map=new Map(answers.map(a=>[a.item,a]))
 const raw:Partial<Record<Skill,number>>={}
 const skills={} as Report['skills']
 for(const skill of Object.keys(skillLabels) as Skill[]){
  const attempted=items.filter(q=>q.skill===skill&&map.has(q.id))
  if(!attempted.length){skills[skill]={band:skill==='speaking'&&state.voice?'Metodist baholaydi':'Baholanmadi',meter:null};continue}
  const hits=attempted.reduce((n,q)=>n+(map.get(q.id)?.choice===q.correct?(q.weight??1):0),0)
  const percent=100*hits/attempted.reduce((n,q)=>n+(q.weight??1),0)
  const assessedModule=skill==='reading'||skill==='listening'?state.mediaModule:state.module
  const ceiling=assessedModule==='C'?3:assessedModule==='B'?2:1
  const position=Math.max(0,config.bands.filter(x=>percent>=x).length+ceiling-2)
  const level=['A2','B1','B2','C1'][Math.min(ceiling,position)]
  raw[skill]=position*100+percent
  skills[skill]={band:level+(percent>=config.bands[1]?'–'+level+'+':''),meter:Math.min(96,25+position*19+(percent>=config.bands[1]?8:0))}
 }
 const weakest=config.priority.filter(s=>raw[s]!==undefined).sort((a,b)=>raw[a]!-raw[b]!)[0]??null
 const match:Record<Profile,boolean>={balanced:true,listener:weakest==='listening',reader:weakest==='reading',structure:weakest==='grammar',words:weakest==='vocabulary'}
 const profile=config.profileOrder.find(p=>match[p])??'balanced'
 const topics=new Map<string,{total:number;wrong:number;examples:Array<{q:Item;a:Answer}>}>()
 for(const q of items){
  const a=map.get(q.id)
  if(!a)continue
  const topic=topics.get(q.topic)??{total:0,wrong:0,examples:[]}
  topic.total+=q.weight??1
  if(a.choice!==q.correct){topic.wrong+=q.weight??1;topic.examples.push({q,a})}
  topics.set(q.topic,topic)
 }
 const priority=(q:Item)=>state.goal===2&&q.skill==='listening'?1.25:state.goal===3&&q.skill==='vocabulary'?1.25:1
 const gaps=[...topics.values()].filter(t=>t.wrong).sort((a,b)=>b.wrong/b.total*priority(b.examples[0].q)-a.wrong/a.total*priority(a.examples[0].q)).slice(0,3).map(t=>{
  const counts=new Map<string,number>()
  const code=({q,a}:typeof t.examples[number])=>a.choice===null?'unknown':q.errors?.[a.choice]||q.id
  for(const e of t.examples)counts.set(code(e),(counts.get(code(e))??0)+1)
  const {q,a}=t.examples.sort((x,y)=>(counts.get(code(y))??0)-(counts.get(code(x))??0)||Number(x.a.choice===null)-Number(y.a.choice===null))[0]
  return {topic:q.topic,topicUz:q.topicUz,stem:q.stem,answer:a.choice===null?'Bilmayman':q.options[a.choice],correct:q.options[q.correct],why:q.why}
 })
 const routes=items.slice(0,8).map(q=>map.get(q.id)).filter(a=>a!==undefined)
 const low=answers.length>0&&(answers.reduce((sum,a)=>sum+a.ms,0)/answers.length<2000||[0,1,2,3].some(i=>routes.filter(a=>a.choice===i).length>=6))
 const target=state.context?.target
 const goal=target&&target!=='Bilmayman'?target:state.goal!==undefined?goals[state.goal]:null
 const distance=weakest?(goal?goal+' maqsadi uchun ':'Keyingi qadam sifatida ')+skillLabels[weakest]+' va hisobotdagi mavzular bo‘yicha dalillarga tayangan holda mashq qiling.':'Aniq tavsiya uchun metodist bilan natijani muhokama qiling.'
 return {skills,weakest,profile,gaps,reliability:low?'low':'normal',distance}
}
