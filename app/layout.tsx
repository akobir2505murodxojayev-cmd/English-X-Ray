import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import './style.css'

export const metadata: Metadata = { title: 'English X-Ray · Sandbox LC', description: 'Ingliz tilingizni skaner qiling va shaxsiy o‘quv rejangizni oling.' }
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#faf9fd' }
export default function Layout({children}: {children: React.ReactNode}) {
  return <html lang="uz"><body><Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" />{children}</body></html>
}
