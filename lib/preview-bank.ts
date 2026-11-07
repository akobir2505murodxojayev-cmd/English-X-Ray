import type {Question} from './engine'
export const previewBank:Question[]=[
 {id:'pg1',skill:'grammar',kind:'single',difficulty:1,topic:'To be',prompt:'I ___ from Tashkent.',options:['is','are','am','be'],key:['am']},
 {id:'pg2',skill:'grammar',kind:'single',difficulty:2,topic:'Past Simple',prompt:'They ___ home late yesterday.',options:['come','came','comes','coming'],key:['came']},
 {id:'pg3',skill:'grammar',kind:'blank',difficulty:3,topic:'Present Perfect',prompt:'Fill in the blank: We have worked together ___ three months.',key:['for']},
 {id:'pg4',skill:'grammar',kind:'single',difficulty:4,topic:'Wish',prompt:'I wish I ___ more time to practise.',options:['have','will have','had','have had'],key:['had']},
 {id:'pv1',skill:'vocabulary',kind:'single',difficulty:1,topic:'Adjectives',prompt:'Which word is the opposite of easy?',options:['soft','short','difficult','quiet'],key:['difficult']},
 {id:'pv2',skill:'vocabulary',kind:'single',difficulty:2,topic:'Daily life',prompt:'Which word means a person who teaches?',options:['driver','teacher','learner','visitor'],key:['teacher']},
 {id:'pv3',skill:'vocabulary',kind:'single',difficulty:3,topic:'Collocations',prompt:'We need to ___ attention to the details.',options:['take','do','pay','make'],key:['pay']},
 {id:'pv4',skill:'vocabulary',kind:'multiple',difficulty:4,topic:'Word meaning',prompt:'Select TWO words that can mean very large.',options:['enormous','tiny','vast','modest'],key:['enormous','vast']},
 {id:'pr1',skill:'reading',kind:'single',difficulty:3,topic:'Dalil topish',stimulus:'The town planted trees beside the main road. Volunteers water them on Fridays, while the town council checks their growth each month.',prompt:'Who waters the trees?',options:['The council','Volunteers','Drivers','The mayor'],key:['Volunteers']},
 {id:'pl1',skill:'listening',kind:'single',difficulty:3,topic:'Tinglab tushunish',audio:'/audio/practice.mp3',prompt:'When will they send the results?',options:['This evening','On Friday','Next Tuesday','In two months'],key:['Next Tuesday']},
 {id:'pw1',skill:'writing',kind:'writing',difficulty:3,topic:'Fikr bildirish',prompt:'Write a short paragraph explaining how you organise your study time.'},
 {id:'ps1',skill:'speaking',kind:'speaking',difficulty:3,topic:'Ravonlik',prompt:'Speak for one minute about a book or film you enjoyed.'}
]
