import {expect,test} from '@playwright/test'
import {defaultConfig,type View,type Report} from '../lib/mvp/model'

test('new Telegram interface resumes, locks analysis until contact, and books a call',async({page})=>{
 const skills={grammar:{band:'B1',meter:48},vocabulary:{band:'B1',meter:48},reading:{band:'B1',meter:48},listening:{band:'A2',meter:26},speaking:{band:'Baholanmadi',meter:null}}
 const summary={skills,weakest:'listening' as const,profile:'listener' as const}
 const report:Report={...summary,gaps:[{topic:'Linking',topicUz:'Bog‘lanish',stem:'Test savoli',answer:'Noto‘g‘ri',correct:'To‘g‘ri',why:'Sinov izohi'}],distance:'Listening ustida ishlang.',reliability:'normal'}
 let state:View={step:'intro',price:defaultConfig.price,terms:defaultConfig.fullTerms,revision:0,name:'Aziza'}
 await page.route('https://telegram.org/js/telegram-web-app.js',route=>route.fulfill({contentType:'text/javascript',body:''}))
 await page.addInitScript(()=>Object.defineProperty(window,'Telegram',{value:{WebApp:{
  initData:'e2e-preview',platform:'android',version:'8.0',ready(){},expand(){},isVersionAtLeast(){return true},
  requestContact(cb:(shared:boolean)=>void){cb(false)}
 }}}))
 await page.route('**/api/mvp?action=*',async route=>{
  const action=new URL(route.request().url()).searchParams.get('action')
  const body=route.request().postDataJSON()
  if(action==='event')return route.fulfill({json:{ok:true}})
  if(action==='consent')state={...state,step:'goal',id:'preview',revision:1}
  if(action==='goal')state={...state,step:'context',goal:body.goal,revision:2}
  if(action==='context')state={...state,step:'test',revision:3,index:0,section:1,question:{id:'q1',stem:'Maya ___ the parcel yesterday.',options:['received','receives','receive','received it'],skill:'grammar'}}
  if(action==='answer'&&body.item==='q1')state={...state,revision:4,index:20,section:2,question:{id:'q2',stem:'Where was the notice?',options:['Library','Bus','Office','Park'],skill:'reading'},stimulus:{title:'The Library',text:'Lena found the notice in the library.'}}
  if(action==='answer'&&body.item==='q2')state={...state,revision:5,index:25,section:3,question:{id:'q3',stem:'Where should they meet?',options:['Library','Bus','Office','Park'],skill:'listening'},stimulus:{title:'Audio',audio:'/audio/mvp-a.mp3'}}
  if(action==='answer'&&body.item==='q3')state={...state,step:'speaking',revision:6,question:undefined,stimulus:undefined}
  if(action==='speaking-done')state={...state,step:'short',revision:7,summary}
  if(action==='contact-request')state={...state,contactPending:true,revision:8}
  if(action==='contact-manual')state={...state,step:'report',contactPending:false,revision:9,report}
  if(action==='booking')state={...state,step:'booked',revision:10}
  return route.fulfill({json:state})
 })
 await page.goto('/')
 await page.getByRole('button',{name:'Boshlash',exact:true}).click()
 await page.getByRole('button',{name:'18 va undan katta'}).click()
 await page.getByLabel('Shaxsiy ma’lumotlarimni qayta ishlashga roziman.').check()
 await page.getByRole('button',{name:'Roziman, davom etish'}).click()
 await page.getByRole('button',{name:'IELTS',exact:true}).click()
 await page.getByRole('button',{name:'Davom etish',exact:true}).click()
 await page.getByRole('button',{name:'1–3 yil',exact:true}).click()
 await page.getByRole('button',{name:'3 oy',exact:true}).click()
 await page.getByRole('button',{name:'6.5',exact:true}).click()
 await page.getByRole('button',{name:'O‘rta',exact:true}).click()
 await page.getByRole('button',{name:'Diagnostikani boshlash'}).click()
 await expect(page.getByText('Maya ___ the parcel yesterday.')).toBeVisible()
 await page.getByRole('button',{name:'Bilmayman'}).click()
 await expect(page.getByText('Where was the notice?')).toBeVisible()
 await page.reload()
 await expect(page.getByText('Where was the notice?')).toBeVisible()
 await page.getByRole('button',{name:'A Library'}).click()
 await page.getByRole('button',{name:'Javob berish'}).click()
 await expect(page.getByRole('button',{name:'Audioni tinglash'})).toBeVisible()
 await page.getByRole('button',{name:'Bilmayman'}).click()
 await page.getByRole('button',{name:'O‘tkazib yuborish'}).click()
 await expect(page.getByText('Xatolaringiz tahlili yopiq')).toBeVisible()
 await expect(page.getByText('Bog‘lanish',{exact:true})).toHaveCount(0)
 await page.getByRole('button',{name:'To‘liq tahlilni ochish'}).click()
 await page.getByLabel('Telefon raqami').fill('+998901234567')
 await page.getByRole('button',{name:'Raqamni saqlash'}).click()
 await expect(page.getByText('Bog‘lanish',{exact:true})).toBeVisible()
 await page.getByRole('button',{name:'Profil kartasini ochish'}).click()
 await expect(page.getByRole('heading',{name:'Tinglashda tayanch kerak'})).toBeVisible()
 await page.getByRole('button',{name:'Orqaga'}).click()
 await page.getByRole('button',{name:'X-Ray Full’ga yozilish'}).click()
 await page.getByRole('button',{name:'Kunduzi'}).click()
 await page.getByRole('button',{name:'So‘rov yuborish'}).click()
 await expect(page.getByText('So‘rov qabul qilindi')).toBeVisible()
})
