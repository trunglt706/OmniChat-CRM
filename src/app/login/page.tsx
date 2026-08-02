'use client'

import { signIn } from 'next-auth/react'
import { Headphones, Mail, Loader2, Eye, EyeOff, Shield } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { useT } from '@/i18n/useT'

export default function LoginPage() {
  const { t } = useT()
  const [loading, setLoading] = useState(false)
  const { theme, setTheme } = useTheme()
  const isGoogleAuth = !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

  // Email/password form state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    setError('')
    setLoading(true)
    try {
      // In mock mode, any credentials work
      // In Google mode, redirect to OAuth
      await signIn(isGoogleAuth ? 'google' : 'mock', {
        callbackUrl: '/',
        redirect: true,
      })
    } catch (e) {
      setError(t('login.error'))
      setLoading(false)
    }
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      setError(t('login.emailRequired'))
      return
    }
    if (!password.trim()) {
      setError(t('login.passwordRequired'))
      return
    }
    await handleLogin()
  }

  return (
    <div className="min-h-screen flex items-center justify-center login-mesh p-4">
      <div className="w-full max-w-sm space-y-8 animate-slide-up">
        {/* Logo */}
        <div className="flex flex-col items-center gap-4">
          <div className="login-logo h-16 w-16 rounded-2xl flex items-center justify-center">
            <Headphones className="h-8 w-8 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text">OmniChat</h1>
            <p className="text-sm text-muted-foreground/60 mt-1.5 font-medium">
              {t('login.subtitle')}
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="login-card rounded-2xl p-7 space-y-5">
          <div className="text-center space-y-1">
            <h2 className="text-lg font-bold tracking-tight">{t('login.title')}</h2>
            <p className="text-xs text-muted-foreground/50 font-medium">
              {isGoogleAuth
                ? t('login.googleDesc')
                : t('login.demoDesc')}
            </p>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-medium text-muted-foreground/70">
                {t('login.email')}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@omnichat.vn"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError('') }}
                className="h-10 text-sm rounded-xl bg-foreground/[0.03] border-border/40 focus:border-primary/40"
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-medium text-muted-foreground/70">
                {t('login.password')}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError('') }}
                  className="h-10 text-sm rounded-xl bg-foreground/[0.03] border-border/40 focus:border-primary/40 pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-xs text-destructive/80 font-medium flex items-center gap-1.5">
                <Shield className="h-3 w-3" /> {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 text-sm font-semibold gap-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/30 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              {t('login.loginBtn')}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/40" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase font-medium">
              <span className="bg-card/80 backdrop-blur-sm px-3 text-muted-foreground/40 rounded-full">{t('login.or')}</span>
            </div>
          </div>

          {/* Quick demo login */}
          <Button
            variant="outline"
            onClick={handleLogin}
            disabled={loading}
            className="w-full h-11 text-sm font-medium gap-2 rounded-xl border-border/40 hover:border-primary/30 hover:bg-primary/5 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Headphones className="h-4 w-4" />
            )}
            {t('login.demoBtn')}
          </Button>

          {isGoogleAuth && (
            <Button
              variant="outline"
              onClick={() => signIn('google', { callbackUrl: '/', redirect: true })}
              disabled={loading}
              className="w-full h-11 text-sm font-medium gap-2 rounded-xl border-border/40 hover:border-primary/30 hover:bg-primary/5 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {t('login.googleBtn')}
            </Button>
          )}
        </div>

        {/* Theme toggle */}
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl text-muted-foreground/40 hover:text-foreground hover:bg-foreground/5 transition-all duration-200"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>

        <p className="text-center text-[11px] text-muted-foreground/30 font-medium">
          {t('login.footer')}
        </p>
      </div>
    </div>
  )
}
