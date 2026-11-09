import {expect,it} from 'vitest'
import {chooseItems,chooseModule,score} from '../lib/mvp/engine'
import {pilotBank,mediaStimuli} from '../lib/mvp/content'
import {defaultConfig} from '../lib/mvp/model'
import {publicView} from '../lib/mvp/server'
import {csvHeaders,csvItems} from '../lib/mvp/csv'
it('routes 2/5/8 correct answers into distinct modules with covered topics',()=>{
 expect([2,5,8].map(n=>chooseModule(n))).toEqual(['A','B','C'])
 for(const block of ['A','B','C'] as const){
  const q=chooseItems(pilotBank,block,12)
  expect(new Set(q.map(x=>x.id)).size).toBe(12)
  expect(new Set(q.map(x=>x.topic)).size).toBeGreaterThanOrEqual(6)
  for(const skill of ['reading','listening'])expect(pilotBank.filter(x=>x.group===skill+'-'+block)).toHaveLength(5)
 }
})
it('keeps scoring evidence private until the report is unlocked',()=>{
 const items=chooseItems(pilotBank,'routing',8,1,()=>0.25)
 const answers=items.map(q=>({item:q.id,choice:null,ms:900}))
 const report=score(items,answers,{module:'A',mediaModule:'A',goal:0,context:{target:'B2',experience:2,deadline:1,self:1}},defaultConfig)
 const run={id:'test',user_id:'user',revision:2,created_at:new Date().toISOString(),completed_at:null,source:null,
  state:{step:'short' as const,age:'adult' as const,guardian:false,marketing:false,items,answers,report,playCount:0,audioFailures:0,stimuli:mediaStimuli}}
 expect(report.gaps).toHaveLength(3)
 expect(report.reliability).toBe('low')
 expect(report.skills.speaking.band).toBe('Baholanmadi')
 expect(publicView(run,defaultConfig).report).toBeUndefined()
 expect(publicView({...run,state:{...run.state,step:'report'}},defaultConfig).report?.gaps[0].correct).toBeTruthy()
 const question=publicView({...run,state:{...run.state,step:'test',answers:[]}},defaultConfig).question
 expect(question).not.toHaveProperty('correct')
 expect(question).not.toHaveProperty('why')
})
it('imports quoted CSV and supports multiple routing modules',()=>{
 const row=['id','grammar','B1','routing;B','gap_choice','"Hello, world"','Yes','No','Perhaps','Later','A','','','','','phrases','Iboralar','1','','"Sabab, izoh"','active']
 const q=csvItems(csvHeaders.join(',')+'\r\n'+row.join(','))
 expect(q.map(x=>x.id)).toEqual(['id-routing','id-B'])
 expect(q[0]).toMatchObject({stem:'Hello, world',correct:0,why:'Sabab, izoh'})
})
