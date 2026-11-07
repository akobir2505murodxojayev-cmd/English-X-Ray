import json
from pathlib import Path

questions=[]
def q(id,skill,difficulty,topic,prompt,options,key,stimulus=None,audio=None,kind='single'):
    questions.append(dict(id=id,skill=skill,difficulty=difficulty,topic=topic,prompt=prompt,options=options,key=key,stimulus=stimulus,audio=audio,kind=kind,active=True))
for i,(d,t,p,o,k) in enumerate([
 (1,'To be','Maya ___ a student.',['am','is','are','be'],['is']),
 (1,'Present Simple','My brother ___ football every Saturday.',['play','plays','playing','is play'],['plays']),
 (2,'Past Simple','I ___ the museum last Sunday.',['visit','visited','have visited','visiting'],['visited']),
 (2,'Countable nouns','Choose TWO sentences with correct quantifiers.',['We need some apples.','There are much books.','How many tickets do you need?','I have a few water.'],['We need some apples.','How many tickets do you need?']),
 (3,'Present Perfect','I have lived in Tashkent ___ 2020.',None,['since']),
 (3,'Conditionals','If it rains tomorrow, we ___ at home.',['stayed','will stay','had stayed','would have stayed'],['will stay']),
 (4,'Past Perfect','By the time the talk began, most people ___.',['left','had left','have left','are leaving'],['had left']),
 (5,'Inversion','Not until the results arrived ___ the scale of the problem.',['we understood','did we understand','we had understood','understood we'],['did we understand']),
]): q(f'g{i+1}','grammar',d,t,p,o,k,kind='blank' if o is None else 'multiple' if len(k)>1 else 'single')
for i,(d,t,p,o,k) in enumerate([
 (1,'Everyday verbs','Which verb means to get something by paying money?',['buy','bring','lend','leave'],'buy'),
 (1,'Daily routine','I usually ___ breakfast at seven.',['make','do','get on','go'],'make'),
 (2,'Travel','Which word means a single trip from one place to another?',['journey','luggage','platform','schedule'],'journey'),
 (2,'Opposites','The opposite of narrow is ___.',['deep','wide','smooth','short'],'wide'),
 (3,'Collocations','We need to ___ a decision by Friday.',['take up','make','do','put'],'make'),
 (3,'Context','The shop is closed temporarily. What does temporarily mean?',['For a limited time','On purpose','Without warning','For good'],'For a limited time'),
 (4,'Word meaning','The plan is feasible. Which word is closest in meaning?',['Practical','Expensive','Unusual','Necessary'],'Practical'),
 (5,'Register','Which word best fits: The findings are preliminary and should be interpreted with ___.',['caution','relief','certainty','indifference'],'caution'),
]): q(f'v{i+1}','vocabulary',d,t,p,o,[k])
texts=[
 ('Sam works at a library. On Wednesdays he starts at ten instead of nine. The library closes at six.','When does Sam start on Wednesdays?',['Nine','Ten','Five','Six'],'Ten',1,'Aniq ma’lumot'),
 ('Train A leaves at 11:20 and arrives at 12:10. Train B leaves later but arrives at 12:05. Both cost the same.','What is true about Train B?',['It costs more.','It arrives first.','It leaves first.','It takes longer.'],'It arrives first.',2,'Taqqoslash'),
 ('The sports club was going to build a larger gym. After a survey showed that most members wanted longer opening hours, the club decided to hire more evening staff instead.','What changed the club’s plan?',['A building delay','Members’ preferences','Higher rent','A staff complaint'],'Members’ preferences',3,'Sabab va natija'),
 ('The new cycle lane was popular during the trial. However, the council will keep it only if winter usage remains high, since maintenance costs increase sharply in cold weather.','What condition must be met?',['Costs must fall in summer.','Winter use must stay high.','The trial must be repeated.','Cyclists must pay for maintenance.'],'Winter use must stay high.',3,'Shartni aniqlash'),
 ('A pilot study found that people remembered more words after short, frequent sessions. The participants chose their own schedules, however, so differences in motivation could account for some of the effect.','Why does the author mention motivation?',['To identify a possible alternative explanation','To prove the sessions work','To report a measured outcome','To describe the researchers’ schedules'],'To identify a possible alternative explanation',4,'Muallif pozitsiyasi'),
 ('Although the archive is promoted as comprehensive, its earliest records largely reflect the views of people who could afford to publish. Digitising those records has widened access while preserving that original imbalance.','What distinction does the writer draw?',['Digital records are less reliable than paper records.','Wider access does not guarantee broader representation.','The oldest documents were written for public use.','The archive needs fewer published sources.'],'Wider access does not guarantee broader representation.',5,'Xulosa chiqarish'),
]
for i,(s,p,o,k,d,t) in enumerate(texts):q(f'r{i+1}','reading',d,t,p,o,[k],s)
listens=[
 ('Hi, this is the English club. Tonight we meet at six in room twelve. Please bring a notebook.','Where will the club meet?',['Room 6','Room 10','Room 12','Room 20'],'Room 12',1),
 ('I thought the tour would start at the museum, but it now starts outside the station. The time is still half past two.','What has changed?',['The price','The meeting point','The day','The time'],'The meeting point',2),
 ('Thank you for coming in. Before we talk about your previous job, could you tell me why you applied for this position? We usually let candidates know by Friday.','You will hear a conversation about a ____.',['A new apartment','A job interview','A language course','A travel plan'],'A job interview',3),
 ('The class itself is free. We ask for a small payment if you need a printed copy of the workbook, but you can download it at no charge.','When is a payment needed?',['When you join the class','When you download the workbook','When you want a printed workbook','When you book an online class'],'When you want a printed workbook',3),
 ('I would have taken the earlier train if I had known the presentation was being moved forward. As it turned out, the organiser recorded it, so I only missed the questions at the end.','What did the speaker miss?',['The questions','The whole presentation','The recording','The train connection'],'The questions',4),
 ('The figures suggest that the scheme improved attendance, although some schools changed their reporting at the same time. Until we can separate those effects, I would be reluctant to attribute the entire rise to the scheme.','What is the speaker’s position?',['The scheme had no effect.','The reporting change had no effect.','The result is promising but causation is uncertain.','The figures were deliberately inaccurate.'],'The result is promising but causation is uncertain.',5),
]
audio=Path('public/audio');audio.mkdir(exist_ok=True)
for i,(s,p,o,k,d) in enumerate(listens):
    n=f'l{i+1}'
    q(n,'listening',d,'Tinglab tushunish',p,o,[k],audio=f'/audio/{n}.mp3')
    (audio/f'{n}.txt').write_text(s)
q('w1','writing',3,'Fikrni rivojlantirish','Write 90–130 words. A friend is deciding whether to study alone or join an English group. Explain which option you recommend and give two reasons.',None,None,kind='writing')
q('w2','writing',4,'Dalillash','Write 180–240 words. Some schools allow students to use phones during lessons. Discuss one benefit and one drawback, and give your own opinion.',None,None,kind='writing')
q('s1','speaking',3,'Ravonlik','Record 45–90 seconds. Describe a skill you learned. Explain why you chose it, what was difficult, and how you improved.',None,None,kind='speaking')
q('s2','speaking',4,'Fikrni asoslash','Record 60–120 seconds. Do people learn better online or face-to-face? Compare the two approaches and support your view with an example.',None,None,kind='speaking')
Path('lib/question-bank.json').write_text(json.dumps(questions,indent=2,ensure_ascii=False)+'\n')
def sql_json(value):
    return '$seed$'+json.dumps(value,ensure_ascii=False)+'$seed$'
seed='''\ninsert into public.diagnostic_questions(id,skill,kind,difficulty,topic,prompt,options,stimulus,audio,key,active)
select id,skill,kind,difficulty,topic,prompt,options,stimulus,audio,key,active from jsonb_to_recordset('''+sql_json(questions)+'''::jsonb) as q(id text,skill text,kind text,difficulty int,topic text,prompt text,options jsonb,stimulus text,audio text,key jsonb,active bool);\n'''
Path('/tmp/english-xray-seed.sql').write_text(seed)
