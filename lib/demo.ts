import {makePlan,scoreTest,selectQuestions,type Question,type Mode,type Answer} from './engine'
import {defaults,type Attempt,type State} from './ui'
import {previewBank as bank} from './preview-bank'
const full=selectQuestions(bank as Question[],'full')
const demoAnswers=Object.fromEntries(full.filter(q=>q.key?.length).map((q,i)=>[q.id,i%5===0?(q.options?.find(a=>!q.key?.includes(a))??'sample'):q.kind==='multiple'?q.key:q.key?.[0]])) as Record<string,Answer>
const result=scoreTest(full,demoAnswers,'full')
const key='english-xray-preview-v1'
export function demoStart():State{
 const saved=localStorage.getItem(key)
 if(saved)try{return JSON.parse(saved)}catch{}
 const dates=[21,14,7,0].map(d=>new Date(Date.now()-d*86400000).toISOString())
 return {
  profile:{id:'demo',name:'Akobir',role:'student',timezone:'Asia/Tashkent',marketing:false,settings:defaults},active:null,result,resultStatus:'review',
  history:dates.map((date,i)=>({id:'example-'+i,mode:'full' as const,status:'review',created_at:date,submitted_at:date,result:{...result,score:[46,56,66,result.score][i]}})).reverse(),
  tasks:makePlan(result,['CEFR sertifikati']).map((x,i)=>({...x,id:'preview-task-'+i,completed_at:i===0?dates[3]:null})),
  progress:[],badges:['scan'],activeDays:[dates[3].slice(0,10)],streak:1,xp:65,applications:[],chat:[],ai:false
 }
}
export function saveDemo(state:State){localStorage.setItem(key,JSON.stringify(state))}
export function demoAttempt(mode:Mode):Attempt{
 const questions=selectQuestions(bank as Question[],mode)
 const items=questions.map(({key,...q})=>{void key;return q})
 return {id:crypto.randomUUID(),mode,items,answers:{},status:'active'}
}
export function demoScore(attempt:Attempt){
 const items=attempt.items.map(q=>(bank as Question[]).find(x=>x.id===q.id)??q)
 return scoreTest(items,attempt.answers,attempt.mode)
}
