'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from '@/features/auth/actions/auth-actions'

export function TopNav() {
  const pathname = usePathname()

  const navLinks = [
    { href: '/', label: 'El Búnker' },
    { href: '/radar', label: 'El Radar' },
    { href: '/laboratorio', label: 'El Laboratorio' },
    { href: '/log', label: 'La Bitácora' },
    { href: '/performance', label: 'Analítica' },
  ]

  return (
    <nav className="h-12 border-b border-zinc-800 bg-slate-950 px-6 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold tracking-tighter italic uppercase text-zinc-100">
            Income Factory
          </span>
        </div>
        
        <div className="flex items-center gap-6">
          {navLinks.map((link) => {
            const isActive = pathname === link.href
            return (
              <Link 
                key={link.href}
                href={link.href} 
                className={`text-[10px] font-bold uppercase tracking-wider transition-colors pb-0.5 ${
                  isActive 
                    ? 'text-zinc-100 border-b border-zinc-100' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {link.label}
              </Link>
            )
          })}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-[10px] font-mono text-zinc-500 uppercase">
          Institutional Access
        </span>
        <form action={signOut}>
          <button 
            type="submit"
            className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 hover:text-red-400 transition-colors border border-zinc-800 px-2 py-1 rounded bg-zinc-900"
          >
            Logout
          </button>
        </form>
      </div>
    </nav>
  )
}
