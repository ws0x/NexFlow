'use client'

import { useState, useTransition } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Zap, Loader2, AlertCircle } from 'lucide-react'
import type { Metadata } from 'next'

export default function LoginPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ email: '', password: '' })

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
    setError('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    startTransition(async () => {
      const res = await signIn('credentials', {
        email: form.email,
        password: form.password,
        redirect: false,
      })

      if (res?.error) {
        setError('Invalid email or password. Please try again.')
        return
      }

      router.push('/') // middleware redirects to role-appropriate page
      router.refresh()
    })
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #06B6D410 0%, #0F172A 60%)' }}>

      {/* Card */}
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 animate-glow"
            style={{ background: 'linear-gradient(135deg, #06B6D4, #6366F1)' }}>
            <Zap className="w-6 h-6 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--nf-text)' }}>
            NexFlow
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--nf-muted)' }}>
            Leads Pipeline Management
          </p>
        </div>

        {/* Form card */}
        <div className="card p-6 space-y-5">
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--nf-text)' }}>
              Sign in to your account
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--nf-muted)' }}>
              Enter your credentials to continue
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm"
              style={{ background: 'rgb(239 68 68 / 0.1)', color: '#FCA5A5', border: '1px solid rgb(239 68 68 / 0.3)' }}>
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--nf-muted)' }}>
                Email address
              </label>
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={handleChange}
                placeholder="you@company.com"
                className="input-base text-sm h-10"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--nf-muted)' }}>
                Password
              </label>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="input-base text-sm h-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--nf-subtle)' }}>
                  {showPassword
                    ? <EyeOff className="w-4 h-4" />
                    : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isPending}
              className="btn-primary w-full h-10 text-sm mt-2">
              {isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</>
                : 'Sign in'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs mt-6" style={{ color: 'var(--nf-subtle)' }}>
          Powered by{' '}
          <span className="font-semibold" style={{ color: 'var(--nf-muted)' }}>Makka Corp</span>
          {' '}· Contact your admin for access
        </p>
      </div>
    </div>
  )
}
