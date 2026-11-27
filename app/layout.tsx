import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SME Order Desk',
  description: 'Commandes WhatsApp, paiements MoMo et crédit client pour les PME africaines',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
