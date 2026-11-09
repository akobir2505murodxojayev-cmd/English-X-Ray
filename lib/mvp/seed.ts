import type {Item,Module} from './model'

type Row = [topic:string, topicUz:string, question:string, correct:string, wrong1:string, wrong2:string, wrong3:string, why:string]
const routing:Row[] = [
 ['Past simple','Oddiy o‘tgan zamon','Maya ___ the parcel yesterday.','received','receives','has received','receive','Yesterday tugallangan o‘tgan vaqtni bildiradi.'],
 ['Articles','Artikllar','We found ___ umbrella outside.','an','a','theirs','these','Umbrella unli tovush bilan boshlanadi va ilk bor tilga olinmoqda.'],
 ['Present perfect','Hozirgi tugallangan zamon','I ___ here since 2019.','have lived','live','lived','am living','O‘zbekchadagi “2019-yildan beri yashayman” hozirgi shaklda keladi. Inglizchada davom etayotgan holat uchun Present Perfect ishlatiladi.'],
 ['Quantifiers','Miqdor so‘zlari','There are very ___ chairs left.','few','little','much','any','Chairs sanaladi, shuning uchun few ishlatiladi.'],
 ['Collocations','So‘z birikmalari','Please ___ a decision before noon.','make','do','take up','have on','Make a decision — qaror qabul qilish uchun odatiy birikma.'],
 ['Comparatives','Qiyosiy daraja','This route is ___ than the old one.','shorter','more short','shortest','short','Than bilan bir bo‘g‘inli short so‘ziga -er qo‘shiladi.'],
 ['Conditionals','Shart gaplar','If I had more time, I ___ another language.','would learn','will learn','learned','had learned','Hozirgi farazda if + Past Simple, asosiy gapda would ishlatiladi.'],
 ['Passive voice','Majhul nisbat','The bridge ___ in 2015.','was built','built','has built','is build','Ko‘prik quruvchi emas, qurilgan narsa. Past Simple Passive was + built shaklida.'],
 ['Reported speech','O‘zlashtirma gap','He asked me where I ___.','lived','did live','do live','live in','O‘zlashtirma savolda ega fe’ldan oldin keladi.'],
 ['Phrasal verbs','Frazali fe’llar','We had to ___ the meeting until Friday.','put off','put on','put out','put up','Put off — kechiktirish.']
]
const rowsA:Row[]=[
 ['Prepositions','Vaqt predloglari','The shop opens ___ eight.','at','in','on','to','Aniq soat oldidan at ishlatiladi.'],
 ['Present simple','Oddiy hozirgi zamon','Nora ___ to work by train.','goes','go','going','gone','He, she yoki birlikdagi ism bilan fe’lga -s qo‘shiladi.'],
 ['Past simple','Oddiy o‘tgan zamon','They ___ to Samarkand last week.','went','go','gone','going','Last week bilan go fe’lining o‘tgan shakli went kerak.'],
 ['Present continuous','Davomiy hozirgi zamon','Listen! Someone ___ at the door.','is knocking','knock','has knock','knocked','Ayni paytda bo‘layotgan harakat uchun is + -ing kerak.'],
 ['Countability','Sanaladigan va sanalmaydigan otlar','I need some ___ about the train.','information','informations','an informations','information pieces','Information sanalmaydigan ot va bu yerda ko‘plik olmaydi.'],
 ['Modals','Modal fe’llar','You ___ bring your passport. It is required.','must','might','could','would','Majburiy talabni must ifodalaydi.'],
 ['Pronouns','Olmoshlar','Can you help ___ with this box?','me','I','mine','my','Help fe’lidan keyin to‘ldiruvchi shakl me ishlatiladi.'],
 ['Future plans','Kelasi reja','I have already bought the tickets. We ___ on Saturday.','are leaving','left','have left','leaves','Oldindan aniq rejalashtirilgan kelajak uchun Present Continuous mos.'],
 ['Frequency','Takrorlanish ravishlari','Which sentence has the usual word order?','I usually eat breakfast at home.','I eat usually breakfast at home.','I breakfast usually eat at home.','Usually I breakfast eat at home.','Usually odatda asosiy fe’ldan oldin keladi.'],
 ['Collocations','So‘z birikmalari','Could you ___ me a favour?','do','make','give up','set','Do someone a favour — birovga yaxshilik qilish.'],
 ['Word meaning','So‘z ma’nosi','The bus was crowded. What does crowded mean?','Full of people','Very cheap','Moving quickly','Completely empty','Crowded joy odamga to‘la bo‘ladi.'],
 ['Phrasal verbs','Frazali fe’llar','Please ___ the lights before leaving.','turn off','turn into','turn up','turn over','Turn off qurilma yoki chiroqni o‘chirishni anglatadi.'],
 ['Infinitive','Infinitiv','She wants ___ abroad.','to study','studying','study','studied','Want dan keyin to + infinitive ishlatiladi.'],
 ['Past continuous','Davomiy o‘tgan zamon','I ___ dinner when you called.','was cooking','cook','have cooked','am cooking','Telefon qo‘ng‘irog‘i paytida harakat davom etayotgan edi.']
]
const rowsB:Row[]=[
 ['Present perfect','Hozirgi tugallangan zamon','I ___ that film twice so far.','have seen','saw yesterday','am seeing','had see','So far hozirgacha bo‘lgan davrni anglatadi.'],
 ['Conditionals','Shart gaplar','If she leaves now, she ___ the last train.','will catch','would catch','caught','has catch','Haqiqiy kelajak shartida if + Present Simple va will ishlatiladi.'],
 ['Relative clauses','Aniqlovchi ergash gap','The woman ___ called you is our manager.','who','which','where','whose car','Odamni aniqlovchi ergash gapda who ega bo‘lib keladi.'],
 ['Passive voice','Majhul nisbat','The documents ___ tomorrow.','will be sent','will send','are sending yesterday','have send','Hujjatlar yuboriladi: will + be + past participle.'],
 ['Indirect questions','Bilvosita savollar','Could you tell me when ___?','the office closes','does the office close','closes the office','the office close','Bilvosita savolda darak gap tartibi saqlanadi.'],
 ['Gerunds','Gerundiy','He suggested ___ a different route.','taking','to take','take','took','Suggest dan keyin fe’lning -ing shakli ishlatiladi.'],
 ['Modals of deduction','Taxmin bildiruvchi modal fe’llar','Her coat is here, so she ___ be nearby.','must','cannot','ought','will have','Dalilga asoslangan kuchli hozirgi taxminni must ifodalaydi.'],
 ['Connectors','Bog‘lovchilar','___ the weather was poor, we went hiking.','Although','Because of','Despite of','However of','Although dan keyin ega va fe’l qatnashgan gap keladi.'],
 ['Comparatives','Qiyosiy daraja','The sooner we leave, ___ we will arrive.','the earlier','earlier than','earliest','more early','The sooner ..., the earlier ... parallel qiyosiy tuzilma.'],
 ['Collocations','So‘z birikmalari','We need to ___ the deadline.','meet','arrive','take off','reach out','Meet a deadline muddatga ulgurishni anglatadi.'],
 ['Word meaning','So‘z ma’nosi','The figure rose gradually. What does gradually mean?','Little by little','All at once','Without a reason','In secret','Gradually — asta-sekin, bosqichma-bosqich.'],
 ['Phrasal verbs','Frazali fe’llar','We need to ___ what caused the error.','find out','give away','show up','bring in','Find out — bilib olish yoki aniqlash.'],
 ['Past perfect','O‘tgan tugallangan zamon','When I arrived, the talk ___ already started.','had','has','was','did','Birinchi hodisa boshqa o‘tgan hodisadan oldin bo‘lsa, had ishlatiladi.'],
 ['Word form','So‘z shakli','Please check the figures for ___.','accuracy','accurate','accurately','accuracies are','For dan keyin bu yerda ot accuracy kerak.']
]
const rowsC:Row[]=[
 ['Inversion','Inversiya','Rarely ___ such a clear explanation.','have I heard','I have heard','heard have I','I heard have','Inkor ma’noli rarely boshda kelsa, yordamchi fe’l egadan oldin keladi.'],
 ['Mixed conditionals','Aralash shart gaplar','If she had accepted the offer, she ___ in London now.','would be','would have been yesterday','will be','had been','O‘tgan shartning hozirgi natijasini would + infinitive bildiradi.'],
 ['Modal perfect','O‘tgan holatga modal baho','You ___ told me earlier. I could have helped.','should have','should be','would tell','must be','Should have + past participle o‘tgan paytdagi bajarilmagan tavsiyani bildiradi.'],
 ['Participle clauses','Sifatdoshli qisqartmalar','___ the report, I noticed two errors.','Having read','Have read','Being read','Having been read','Hisobotni o‘qigan shaxs gapning egasi I. Having read avvalgi harakatni bildiradi.'],
 ['Subjunctive','Talab shakli','The committee insisted that every form ___ signed.','be','is being yesterday','has','would have','Rasmiy talabdan keyin be fe’lining asosiy shakli kelishi mumkin.'],
 ['Cleft sentences','Urg‘uli gaplar','It was her patience ___ impressed the team.','that','what','whose','where','It was ... that ... gap bo‘lagini alohida urg‘ulaydi.'],
 ['Preposition phrases','Predlogli birikmalar','The change was made ___ response to feedback.','in','on','at','for','In response to — javoban degan turg‘un birikma.'],
 ['Concession','Yon berish konstruksiyasi','___ well she prepares, the interview may still be difficult.','However','Whatever','Even','Although of','However + ravish “qanchalik ... bo‘lmasin” ma’nosini beradi.'],
 ['Ellipsis','Tushirib qoldirish','I did not expect him to volunteer, but he ___.','did','was','would have yesterday','has volunteered yesterday','Did oldingi Past Simple harakatini takrorlamasdan ifodalaydi.'],
 ['Collocations','So‘z birikmalari','The findings ___ doubt on the earlier theory.','cast','send','throw out','put in','Cast doubt on — ishonchliligiga shubha tug‘dirmoq.'],
 ['Word meaning','So‘z ma’nosi','The proposal is feasible. Which word is closest?','Practicable','Inevitable','Controversial','Superficial','Feasible — amalga oshirish mumkin bo‘lgan.'],
 ['Register','Uslub tanlovi','Which is most suitable for a formal email?','I would appreciate your advice.','Gimme some tips.','What do ya think?','Spill the details.','I would appreciate ... rasmiy va muloyim ifoda.'],
 ['Reported speech','O‘zlashtirma gap','She denied ___ the message.','having sent','to send','that sending','had send','Deny dan keyin gerund keladi. Having sent avval sodir bo‘lgan harakatni bildiradi.'],
 ['Noun phrases','Ot birikmalari','There is a growing ___ for transparent reporting.','demand','requesting','claiming','require','A growing demand — o‘sib borayotgan talab.']
]
const lexical=['Collocations','Word meaning','Phrasal verbs','Word form','Register','Noun phrases']
export const grammarBank:Item[] = (Object.entries({routing,A:rowsA,B:rowsB,C:rowsC}) as [Module,Row[]][]).flatMap(([module,rows])=>rows.map(([topic,topicUz,stem,correct,...rest],i)=>{
 const answer=i%4, options=rest.slice(0,3)
 options.splice(answer,0,correct)
 const level=module==='A'?(i<7?'A2':'B1'):module==='C'?(i<7?'B2':'C1'):i<3?'A2':i<7?'B1':'B2'
 return {id:module+'-'+i,skill:lexical.includes(topic)?'vocabulary':'grammar',level,module,topic,topicUz,stem,options,correct:answer,why:rest[3],version:1}
}))
