export type TelegramMini={
 initData:string;platform:string;version:string;colorScheme?:'light'|'dark';ready():void;expand():void;
 isVersionAtLeast?(version:string):boolean;requestContact?(cb:(shared:boolean)=>void):void;requestWriteAccess?(cb:(allowed:boolean)=>void):void;
 shareToStory?(url:string,params?:{text:string;widget_link?:{url:string;name:string}}):void;openTelegramLink?(url:string):void;
 MainButton?:{setText(text:string):void;show():void;hide():void;enable():void;disable():void;onClick(fn:()=>void):void;offClick(fn:()=>void):void};
 BackButton?:{show():void;hide():void;onClick(fn:()=>void):void;offClick(fn:()=>void):void};
 onEvent?(type:string,fn:()=>void):void;offEvent?(type:string,fn:()=>void):void
}
export function mini():TelegramMini|undefined{return (window as unknown as {Telegram?:{WebApp:TelegramMini}}).Telegram?.WebApp}
export async function mvpRequest(action:string,body:unknown={}){
 const initData=mini()?.initData
 if(!initData)throw new Error('Diagnostikani Telegram bot ichidan oching.')
 const res=await fetch('/api/mvp?action='+encodeURIComponent(action),{method:'POST',
  headers:{'x-telegram-init-data':initData,...(body instanceof FormData?{}:{'content-type':'application/json'})},
  body:body instanceof FormData?body:JSON.stringify(body)})
 if(res.headers.get('content-type')?.startsWith('audio/')&&res.ok)return await res.blob()
 const data=await res.json()
 if(!res.ok)throw new Error(data.error??'So‘rov bajarilmadi.')
 return data
}
