export const goals = ['Milliy sertifikat (CEFR / Multilevel)', 'IELTS', 'Gapirishni yaxshilash', 'Ish uchun ingliz tili', 'Ko‘p o‘qidim, lekin natija yo‘q', 'Farzandim uchun'] as const
export const experience = ['O‘qimaganman', '1 yilgacha', '1–3 yil', '3 yildan ko‘p'] as const
export const deadlines = ['1 oy', '3 oy', '6 oy', 'Aniq muddat yo‘q'] as const
export const selfLevels = ['Boshlang‘ich', 'O‘rta', 'Yuqori'] as const
export const targets = [['B1', 'B2', 'C1', 'Bilmayman'], ['5.0', '5.5', '6.0', '6.5', '7.0', '7.5', '8.0+', 'Bilmayman']] as const
export const skillLabels = {grammar:'Grammatika',vocabulary:'Leksika',reading:'Reading',listening:'Listening',speaking:'Speaking'} as const
export const profiles = {
  balanced:{title:'Muvozanatli o‘rganuvchi',description:'Ko‘nikmalaringiz bir-birini to‘ldiradi. Aniq mashqlar bilan ularni birga rivojlantira olasiz.'},
  listener:{title:'Tinglashda tayanch kerak',description:'Yozma matnni tushunasiz. Tez nutqdagi bog‘lanishlar va asosiy signallarni mashq qilish foydali.'},
  reader:{title:'Matnni yechib boruvchi',description:'Matnda kerakli dalilni tezroq topish keyingi rivojlanish nuqtangiz.'},
  structure:{title:'Qoidalarni tizimlovchi',description:'Gap tuzilishi va grammatik bog‘lanishlarni mashq qilish bilimlaringizni mustahkamlaydi.'},
  words:{title:'Lug‘atini faollashtiruvchi',description:'So‘zlarni kontekst va birikmalar ichida ishlatish keyingi qadam.'}
} as const
export type Profile = keyof typeof profiles
export type Skill = keyof typeof skillLabels
export type Module = 'routing'|'A'|'B'|'C'
export type Item = {id:string;skill:Exclude<Skill,'speaking'>;level:'A2'|'B1'|'B2'|'C1';module:Module;topic:string;topicUz:string;stem:string;options:string[];correct:number;why:string;weight?:number;errors?:string[];group?:string;version?:number}
export type ItemView = Pick<Item,'id'|'stem'|'options'|'skill'>
export type Stimulus = {title:string;text?:string;audio?:string}
export type Answer = {item:string;choice:number|null;ms:number}
export type Context = {experience:number;deadline:number;self:number;target?:string}
export type SkillMap = Record<Skill,{band:string;meter:number|null}>
export type Summary = {skills:SkillMap;weakest:Skill|null;profile:Profile}
export type Report = Summary & {gaps:Array<{topic:string;topicUz:string;stem:string;answer:string;correct:string;why:string}>;reliability:'normal'|'low';distance:string}
export type Config = {routing:[number,number];bands:[number,number,number];retestDays:number;priority:Array<Exclude<Skill,'speaking'>>;profileOrder:Profile[];price:string;fullTerms:string;followups:Array<{day:number;text:string}>}
export const defaultConfig:Config = {
 routing:[3,5],bands:[40,65,85],retestDays:14,priority:['listening','reading','grammar','vocabulary'],
 profileOrder:['listener','reader','structure','words','balanced'],price:'Narxni menejer tasdiqlaydi',fullTerms:'Kursga yozilishda diagnostika to‘lovi bo‘yicha shartlarni menejerdan aniqlang.',
 followups:[
  {day:1,text:'Qaysi ko‘nikma ustida ishlashni bilib oldingizmi? English X-Ray hisobotiga qayting.'},
  {day:3,text:'Tahlildagi bir xatoni tanlang va shu mavzuda 3 ta gap tuzing.'},
  {day:5,text:'Maqsadingizga mos mashqlarni tanlash uchun X-Ray Full so‘rovini yuborishingiz mumkin.'},
  {day:7,text:'Bir hafta o‘tdi. Tahlildagi zaif ko‘nikmaga qisqa mashq ajrating.'},
  {day:30,text:'Diagnostika natijangizni qayta ko‘rib chiqing va keyingi qadamingizni belgilang.'}
 ]
}
export type Stored = {
 step:'goal'|'context'|'test'|'speaking'|'short'|'report'|'booked'
 age:'minor'|'adult';guardian:boolean;marketing:boolean;goal?:number;context?:Context;module?:Exclude<Module,'routing'>;mediaModule?:Exclude<Module,'routing'>
 items:Item[];answers:Answer[];stimuli?:Record<string,Stimulus>;playCount:number;audioFailures:number;report?:Report;contactPending?:boolean;reportSent?:boolean;voicePending?:boolean;voice?:string;voiceType?:'telegram'|'storage';review?:string
}
export type View = {step:Stored['step']|'intro';revision:number;id?:string;goal?:number;context?:Context;question?:ItemView;stimulus?:Stimulus;index?:number;section?:number;playCount?:number;summary?:Summary;report?:Report;contactPending?:boolean;voice?:boolean;review?:string;retestAt?:string;price:string;terms:string;name?:string;staff?:boolean}
