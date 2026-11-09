import {grammarBank} from './seed'
import media from './media.json'
import type {Item,Module,Stimulus} from './model'

export const mediaStimuli:Record<string,Stimulus>=Object.fromEntries(Object.entries(media).flatMap(([module,pack])=>[
 ['reading-'+module,{title:pack.reading.title,text:pack.reading.text}],
 ['listening-'+module,{title:pack.listening.title,audio:'/audio/mvp-'+module.toLowerCase()+'.mp3'}]
]))
export const pilotBank:Item[]=[...grammarBank,...Object.entries(media).flatMap(([module,pack])=>
 (['reading','listening'] as const).flatMap(skill=>pack[skill].questions.map(([stem,correct,...rest],i)=>({
  id:skill+'-'+module+'-'+i,skill,level:(module==='A'?'A2':module==='B'?'B1':'B2') as Item['level'],module:module as Module,
  topic:skill==='reading'?'Text evidence':'Listening for detail',topicUz:skill==='reading'?'Matndan dalil topish':'Audiodan dalil topish',
  stem:String(stem),correct:Number(correct),options:rest.slice(0,4).map(String).filter(Boolean),why:String(rest[4]),group:skill+'-'+module,version:1
 })))
)]
