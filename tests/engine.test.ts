import {createHmac} from 'node:crypto'
import {describe,expect,it} from 'vitest'
import {normalizePhone,verifyInitData} from '../lib/auth'
import {makePlan,scoreTest,selectQuestions,streakLength,studyDay,type Question} from '../lib/engine'
import {advance,type BotInput} from '../lib/registration'
import bank from '../lib/question-bank.json'

describe('Telegram identity and registration',()=>{
 it('accepts signed fresh data and rejects spoofed identities, replay age, or duplicate keys',()=>{
  const token='example-bot-token',now=1794000000
  const params=new URLSearchParams({auth_date:String(now),query_id:'xy',user:JSON.stringify({id:27})})
  params.sort()
  const key=createHmac('sha256','WebAppData').update(token).digest()
  params.set('hash',createHmac('sha256',key).update([...params].map(([k,v])=>k+'='+v).join('\n')).digest('hex'))
  const raw=params.toString()
  expect(verifyInitData(raw,token,now)?.id).toBe(27)
  expect(verifyInitData(raw.replace('27','28'),token,now)).toBeNull()
  expect(verifyInitData(raw,token,now+301)).toBeNull()
  expect(verifyInitData(raw+'&user=%7B%22id%22%3A28%7D',token,now)).toBeNull()
 })
 it('resumes registration, rejects another person’s contact and marks manual input unverified',()=>{
  let state:BotInput={text:'/register',callback:false,sender:10,step:'NOT_STARTED',draft:{},url:'https://example.org'}
  const act=(text:string,callback=false,contact?:BotInput['contact'])=>{
   const result=advance({...state,text,callback,contact})
   state={...state,step:result.step,draft:result.draft}
   return result
  }
  expect(act('/register').step).toBe('NAME')
  expect(act('Akobir O‘g‘li').step).toBe('PHONE')
  expect(act('',false,{user_id:11,phone_number:'+998901234567'}).step).toBe('PHONE')
  expect(act('/start').step).toBe('PHONE')
  expect(act('90 123-45-67').draft).toMatchObject({verified:false})
  act('choose:REGION:0',true);act('choose:DISTRICT:0',true)
  act('choose:EDUCATION:2',true);act('choose:GOAL:0',true)
  act('goal-next',true);act('choose:LEVEL:0',true);act('choose:PREFERENCE:2',true)
  act('privacy-yes',true)
  expect(act('adult',true).step).toBe('GUARDIAN')
  act('guardian',true)
  const done=act('marketing-no',true)
  expect(done.step).toBe('COMPLETED')
  expect(done.marketing).toBe(false)
  expect(done.profile).toMatchObject({phone:'+998901234567',district:'Olmazor',guardian:true,goals:['CEFR sertifikati']})
  expect(normalizePhone('123')).toBeNull()
 })
})
describe('diagnostic and plan',()=>{
 it('scores objective answers, preserves unmeasured skills and builds eight weeks from weaknesses',()=>{
  const questions=selectQuestions(bank as Question[],'quick',3)
  const answers=Object.fromEntries(questions.map(q=>[q.id,q.kind==='multiple'?q.key??[]:q.key?.[0]??'']))
  const perfect=scoreTest(questions,answers,'quick')
  expect(perfect.score).toBe(100)
  expect(perfect.confidence).toBe('cheklangan')
  expect(perfect.level).toBe('B1')
  expect(perfect.skills.speaking.score).toBeNull()
  for(const q of questions.filter(q=>q.skill==='grammar'))answers[q.id]='wrong'
  const result=scoreTest(questions,answers,'quick')
  expect(result.score).toBeLessThan(100)
  expect(result.skills.grammar.score).toBe(0)
  const plan=makePlan(result,[],20)
  expect(plan).toHaveLength(8)
  expect(plan[0]).toMatchObject({skill:'grammar',minutes:20})
 })
 it('honors local midnight, permits an unfinished day today, and resets after a missed day',()=>{
  expect(studyDay('Asia/Tashkent',new Date('2026-11-06T20:30:00Z'))).toBe('2026-11-07')
  expect(streakLength(['2026-11-05','2026-11-06'],'2026-11-07')).toBe(2)
  expect(streakLength(['2026-11-05'],'2026-11-07')).toBe(0)
 })
})
