# English X-Ray · diagnostika MVP

Kirish manzili `/`. Telegram botda `/start` Mini App’ni ochadi. Ilova rozilik, yosh, maqsad va kontekstdan keyin testni boshlaydi. 8 ta yo‘naltiruvchi savol natijasi A/B/C modulini tanlaydi, keyingi 12 ta javob esa Reading va Listening paketiga ta’sir qiladi. Ovoz faqat katta yoshli foydalanuvchi uchun ixtiyoriy. Telefon so‘rovi qisqa natijadan keyin chiqadi. Avvalgi ilova `/classic` orqali ochiladi.

## Ishga tushirish

1. Supabase’da eski migratsiyadan keyin `20261109140303_diagnostic_mvp.sql` faylini qo‘llang. Yangi jadvallar RLS bilan yopilgan va API orqali server roli ishlatadi.
2. Vercel Production muhitida `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `SESSION_SECRET` va `CRON_SECRET` ni sozlang. Agar BotFather’dagi Mini App qisqa nomiga ega bo‘lsa, `NEXT_PUBLIC_TELEGRAM_APP_NAME` ni kiriting. Keyin deploy qiling.
3. [Telegram ulanishi](../README.md#vercel-and-telegram) bo‘yicha webhook va bot menyusini sozlang. BotFather’da Main Mini App manzili sifatida Production URL’ni ko‘rsating. Profil skrinshotlari va demo videosini bot egasi yuklaydi.
4. Admin yoki metodist Telegram orqali Mini App’ni ochadi va yuqoridagi **Admin** tugmasidan kiradi. Rollar avvalgi Supabase ro‘yxati va mentor biriktirmalaridan olinadi. Lead holati, CSV import/eksport, media yangilash, savol versiyalari, kalibrlash va qayta hisoblash shu panelda mavjud.
5. Avval pilot bilan ichki tekshiruv qiling. Katta yoshli va 18 yoshdan kichik hisoblarda Mini App’ni yopib oching, kontakt berish va qo‘lda kiritish, audio, hisobot va X-Ray Full so‘rovini tekshiring. Bot xabarlarini faqat ruxsat bergan hisoblarda tekshiring.

## Kontent va cheklovlar

- Kodda 52 ta boshlang‘ich grammatika/leksika savoli, 3 ta matn va 3 ta sintez qilingan audio mavjud. Audio va savollar namuna kontent. Sandbox LC metodistlari 150 savollik bankni, xato modellari va yakuniy kalibrlashni tayyorlashi kerak. Hozir A/B/C guruhlari uchun bittadan media to‘plami bor.
- Savollar CSV formatida import qilinadi. `passage_id` media bo‘limidagi `reading-A` yoki `listening-B` kabi guruh nomiga teng bo‘lishi kerak. Savol yoki media yangilansa, boshlangan sessiya o‘z nusxasidan foydalanadi.
- Follow-up kontakt ochilgandan so‘ng rozilik bergan foydalanuvchi uchun Toshkent vaqti bilan 10:00 dagi cron orqali ishlaydi. Xabar shablonlari admin sozlamalarida. `/stop`, Full so‘rov va lead’ning kontakt holatidan chiqishi ketma-ketlikni to‘xtatadi.
- Kartalar PNG ko‘rinishida generatsiya qilinadi. Rasmda shaxsiy ma’lumot, ball yoki daraja yo‘q. Bot orqali yuborilgan shaxsiy ko‘nikmalar xulosasi bot chatidagi rasm izohida keladi.
- X-Ray Full ism, format va qulay vaqt oralig‘i bilan so‘rov oladi. Aniq slot band qilish, tashqi CRM, XLSX import, alohida xodim login/paroli va 2FA, to‘liq tahrirlanadigan i18n matnlari, QR generatsiyasi, ovozning avtomatik 90 kunlik tozalovi va Sentry monitoringi ushbu yangilanishga kirmagan. Qabul sinovidan oldin buyurtmachi maxfiylik matnini va ovoz saqlash tartibini tasdiqlaydi.
