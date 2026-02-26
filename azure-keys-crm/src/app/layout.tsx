import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Azure Keys CRM — Luxury Caribbean Real Estate',
  description: 'Premium CRM for Azure Keys real estate operations',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
