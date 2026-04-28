import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { TopNav } from '@/shared/components/top-nav'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })

export const metadata: Metadata = {
  title: 'Income Factory | Quant PMCC Portfolio',
  description: 'Mathematical cash-flow tracker for PMCC strategies.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className="dark">
      <body className={`${inter.variable} ${mono.variable} font-sans bg-slate-950 text-zinc-100 antialiased min-h-screen selection:bg-emerald-500/30`}>
        <TopNav />
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </body>
    </html>
  )
}
