import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Ignite Automations',
  description: 'AI ordering dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
