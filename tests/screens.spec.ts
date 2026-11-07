import {expect,test,type Page} from '@playwright/test'
import {mkdirSync} from 'node:fs'
const shots=process.env.XRAY_SCREENSHOTS
async function capture(page:Page,name:string){
 if(!shots)return
 mkdirSync(shots,{recursive:true})
 await page.screenshot({path:shots+'/'+name+'.png',fullPage:true,animations:'disabled'})
}
test('walks through all fourteen mobile screens and submits a preview test and enrollment',async({page})=>{
 const errors:string[]=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.goto('/')
 await expect(page.getByRole('button',{name:'Namoyishni boshlash'})).toBeEnabled()
 await capture(page,'01-welcome')
 await page.getByRole('button',{name:'Namoyishni boshlash'}).click()
 await expect(page.getByRole('heading',{name:/Salom/})).toBeVisible()
 await capture(page,'02-home')
 await page.getByRole('button',{name:'Testni boshlash'}).click()
 await expect(page.getByRole('heading',{name:/Qaysi tahlilni/})).toBeVisible()
 await capture(page,'03-choice')
 await page.getByRole('button',{name:/Tezkor skan/}).click()
 await page.getByRole('button',{name:'Davom etish'}).click()
 const replies=['for','came','had','pay','teacher',['enormous','vast'],'Volunteers','Next Tuesday']
 for(let i=0;i<replies.length;i++){
  const ans=replies[i]
  await expect(page.getByText((i+1)+' / 8',{exact:true})).toBeVisible()
  if(i===7){
   await expect(page.getByRole('button',{name:'Audioni tinglash'})).toBeVisible()
   await capture(page,'04-test')
  }
  if(ans==='for') await page.getByRole('textbox',{name:'Javob'}).fill(ans)
  else for(const option of Array.isArray(ans)?ans:[ans])await page.getByRole('button',{name:option,exact:true}).click()
  if(i===7){
   page.once('dialog',d=>d.accept())
   await page.getByRole('button',{name:'Testni yakunlash'}).click()
   await expect(page.getByRole('heading',{name:'Tahlil qilinmoqda...'})).toBeVisible()
   await capture(page,'05-scan')
  }else await page.getByRole('button',{name:'Keyingi savol'}).click()
 }
 await expect(page.getByRole('heading',{name:/X-Ray natijangiz/})).toBeVisible()
 await expect(page.getByText('100% · Taxminiy daraja')).toBeVisible()
 await capture(page,'06-result')
 await page.getByRole('button',{name:'Batafsil tahlil'}).click()
 await expect(page.getByRole('heading',{name:'Ko‘nikmalar bo‘yicha natija'})).toBeVisible()
 await capture(page,'07-details')
 await page.getByRole('button',{name:'Shaxsiy rejam'}).click()
 await expect(page.getByRole('heading',{name:/shaxsiy rejangiz/})).toBeVisible()
 await capture(page,'08-plan')
 await page.getByRole('button',{name:/1-hafta/}).click()
 await page.getByRole('button',{name:'Bajarildi deb belgilash'}).click()
 await expect(page.getByRole('button',{name:'Bajarildi',exact:true})).toBeDisabled()
 await page.getByRole('button',{name:'Kursga yozilish'}).click()
 await expect(page.getByRole('heading',{name:/Natijani real hayotda/})).toBeVisible()
 await capture(page,'14-enroll')
 await page.getByRole('button',{name:'Kursga yozilish'}).click()
 await page.getByLabel('Telefon raqami').fill('+998901234567')
 await page.getByRole('checkbox').check()
 await page.getByRole('button',{name:'Arizani yuborish'}).click()
 await expect(page.getByText('Sinov arizasi saqlandi.')).toBeVisible()
 const go=async(screen:string,heading:RegExp)=>{
  await page.goto('/?screen='+screen)
  await page.getByRole('button',{name:'Namoyishni boshlash'}).click()
  await expect(page.getByRole('heading',{name:heading})).toBeVisible()
 }
 await go('materials',/tayyor materiallar/)
 await expect(page.getByText('Writing templates')).toBeVisible()
 await capture(page,'09-materials')
 await page.getByRole('button',{name:'Materialni saqlash'}).first().click()
 await page.getByRole('button',{name:'Saqlangan',exact:true}).click()
 await expect(page.getByText('Writing templates')).toBeVisible()
 await go('mentor',/X-Ray AI Mentor/)
 await capture(page,'10-mentor')
 await go('progress',/O‘sish dinamikasi/)
 await page.getByRole('button',{name:'Oy',exact:true}).click()
 await capture(page,'11-progress')
 await page.getByRole('button',{name:'Yutuqlarim'}).click()
 await expect(page.getByRole('heading',{name:'Yutuqlarim'})).toBeVisible()
 await capture(page,'12-badges')
 await go('profile',/Mening profilim/)
 await capture(page,'13-profile')
 expect(errors).toEqual([])
})
test('320px viewport fits and anonymous access cannot call protected APIs',async({page,request})=>{
 await page.setViewportSize({width:320,height:700})
 await page.goto('/')
 await page.getByRole('button',{name:'Namoyishni boshlash'}).click()
 await expect(page.getByRole('heading',{name:/Salom/})).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(320)
 expect((await request.get('/api/xray?action=admin')).status()).toBe(401)
 expect((await request.get('/api/health')).status()).toBe(200)
})
