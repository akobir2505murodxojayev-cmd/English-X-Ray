export function readCsv(source:string):string[][]{
 const result:string[][]=[]
 let row:string[]=[],cell='',quoted=false
 const value=source.replace(/^\uFEFF/,'')
 for(let i=0;i<value.length;i++){
  const c=value[i]
  if(c==='"'){
   if(quoted&&value[i+1]==='"'){cell+='"';i++}
   else if(quoted||!cell)quoted=!quoted
   else throw new Error('CSV ichidagi qo‘shtirnoqni tekshiring.')
  }else if(c===','&&!quoted){row.push(cell);cell=''}
  else if((c==='\n'||c==='\r')&&!quoted){
   if(c==='\r'&&value[i+1]==='\n')i++
   row.push(cell);if(row.some(Boolean))result.push(row);row=[];cell=''
  }else cell+=c
 }
 if(quoted)throw new Error('CSV ichida yopilmagan qo‘shtirnoq bor.')
 row.push(cell);if(row.some(Boolean))result.push(row)
 return result
}
export const csvHeaders=['id','skill','level','module','type','stem','option_a','option_b','option_c','option_d','correct','error_a','error_b','error_c','error_d','topic_tags','topic_uz','weight','passage_id','explanation_uz','status']
export function csvItems(source:string){
 const [header,...rows]=readCsv(source)
 if(!header||!rows.length||!['id','skill','level','module','stem','correct','topic_tags','explanation_uz'].every(key=>header.includes(key)))throw new Error('CSV ustunlari shablonga mos bo‘lishi kerak.')
 return rows.flatMap(values=>{
  const obj=Object.fromEntries(header.map((key,i)=>[key,values[i]?.trim()??'']))
  if(obj.status==='draft')return []
  const modules=[...new Set(obj.module.split(';').map(x=>x.trim()))]
  return modules.map((module)=>({id:modules.length>1?obj.id+'-'+module:obj.id,skill:obj.skill,level:obj.level,module,stem:obj.stem,
   options:['a','b','c','d'].map(k=>obj['option_'+k]).filter(Boolean),correct:/^[A-D]$/i.test(obj.correct)?'ABCD'.indexOf(obj.correct.toUpperCase()):-1,
   errors:['a','b','c','d'].map(k=>obj['error_'+k]??''),topic:obj.topic_tags.split(';')[0],topicUz:obj.topic_uz||obj.topic_tags.split(';')[0],
   weight:Number(obj.weight||1),group:obj.passage_id||undefined,why:obj.explanation_uz,active:obj.status!=='archived'}))
 })
}
export function csvRow(values:unknown[]){return values.map(x=>{const text=String(x??'');return '"'+(/^[=+@\-\t\r]/.test(text)?"'":'')+text.replaceAll('"','""')+'"'}).join(',')}
