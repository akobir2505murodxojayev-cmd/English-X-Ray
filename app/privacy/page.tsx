import Link from 'next/link'
export default function Privacy() {
 return <main className="shell legal">
  <h1>Maxfiylik · English X-Ray</h1>
  <p>Sandbox LC diagnostika natijasini tayyorlash uchun Telegram ID, ism, username, yosh toifasi va test javoblaridan foydalanadi. Telefon raqami to‘liq hisobotni ochish bosqichida olinadi. X-Ray Full so‘rovini yuborsangiz, menejer siz bilan shu raqam orqali bog‘lanadi.</p>
  <p>Speaking ixtiyoriy va 18 yoshga to‘lgan foydalanuvchilar uchun ochiq. Yozuvni vakolatli metodist tahlil qiladi. 18 yoshdan kichik foydalanuvchi uchun ota-ona yoki vasiy roziligi kerak.</p>
  <p>Botdan keyingi tavsiyalarni olish ixtiyoriy. Ularni o‘chirish uchun botga <code>/stop</code>, ma’lumotlaringizni o‘chirishni so‘rash uchun <code>/delete_my_data</code> yuboring.</p>
  <p>Avvalgi ilovada AI Mentordan foydalansangiz, xabaringiz va tegishli o‘quv konteksti javob tayyorlash uchun sozlangan AI xizmatiga yuboriladi.</p>
  <Link href="/">English X-Ray’ga qaytish</Link>
 </main>
}
