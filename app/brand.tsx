import Image from 'next/image'
import {motion} from 'motion/react'
export function Logo(){return <div className="logo" aria-label="Sandbox Learning Center"><div>sandb<span>o</span>x</div><small>learning center</small></div>}
export function Fox({variant='plain',className=''}:{variant?:'plain'|'scan'|'graduation'|'encourage';className?:string}){
 return <motion.div className={'fox '+variant+' '+className} initial={{opacity:0,scale:.88,y:8}} animate={{opacity:1,scale:1,y:0}} transition={{type:'spring',stiffness:220,damping:18}}>
  <Image src="/fox.svg" width={220} height={220} alt="English X-Ray tulkisi" draggable={false}/>
  {variant==='scan'&&<Image className="prop glass" src="/magnifier.svg" width={106} height={127} alt="" draggable={false}/>}
  {variant==='graduation'&&<Image className="prop cap" src="/cap.svg" width={110} height={59} alt="" draggable={false}/>}
 </motion.div>
}
