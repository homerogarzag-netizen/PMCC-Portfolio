'use client'

import { useState } from 'react'
import { signup } from '@/features/auth/actions/auth-actions'
import Link from 'next/link'

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    const formData = new FormData(e.currentTarget)
    const result = await signup(formData)
    
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8 bg-zinc-900 border border-zinc-800 p-8 rounded-md">
        <div className="space-y-2 text-center">
          <h1 className="text-xl font-bold tracking-tight uppercase text-zinc-100 italic">
            INCOME FACTORY
          </h1>
          <p className="text-xs text-zinc-500 uppercase tracking-widest font-mono">
            Create Portfolio Account
          </p>
        </div>

        {success ? (
          <div className="space-y-4 text-center py-4">
            <div className="text-emerald-500 text-sm font-bold uppercase tracking-wider">
              Verification Sent
            </div>
            <p className="text-[10px] text-zinc-400 font-mono uppercase">
              Please check your email to confirm your access to the terminal.
            </p>
            <Link 
              href="/login" 
              className="inline-block text-[10px] text-zinc-500 uppercase hover:text-zinc-300 transition-colors font-mono underline underline-offset-4 mt-4"
            >
              Return to Login
            </Link>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider">Email</label>
                <input
                  name="email"
                  type="email"
                  required
                  className="w-full bg-slate-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500 transition-colors font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider">Password</label>
                <input
                  name="password"
                  type="password"
                  required
                  className="w-full bg-slate-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500 transition-colors font-mono"
                />
              </div>

              {error && (
                <p className="text-[10px] text-red-500 font-mono text-center uppercase">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-zinc-100 text-zinc-950 text-xs font-bold uppercase py-2.5 rounded-md hover:bg-zinc-300 transition-colors disabled:opacity-50"
              >
                {loading ? 'Creating Account...' : 'Initialize Access'}
              </button>
            </form>

            <div className="text-center">
              <Link 
                href="/login" 
                className="text-[10px] text-zinc-500 uppercase hover:text-zinc-300 transition-colors font-mono underline underline-offset-4"
              >
                Already have access? Sign In
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
