import type { Metadata, Viewport } from 'next'
import { Fraunces, Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
})

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['600'],
  variable: '--font-fraunces',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'PlanPilot AI',
  description:
    'An evidence-backed event planning agent: sourced research, budget-aware plans, and consistent re-planning when an input changes.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${inter.variable} ${fraunces.variable}`}>
      <body>{children}</body>
    </html>
  )
}
