'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Headphones, Mail, Loader2, Eye, EyeOff, Shield } from 'lucide-react'
import { useState, useCallback, useEffect, Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { useT } from '@/i18n/useT'
import { signIn } from 'next-auth/react'

function LoginForm() {
  const { t } = useT()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const doLogin = useCallback(async (loginEmail?: string, loginPassword?: string) => {
    setError('')
    setLoading(true)
    try {
      const callbackUrl = searchParams.get('callbackUrl') || '/'
      const res = await signIn('credentials', {
        redirect: false,
        email: loginEmail || email,
        password: loginPassword || password,
        callbackUrl,
      })
      
      if (res?.error) {
        setError(res.error)
        setLoading(false)
        return
      }
      
      if (res?.url) {
        router.push(res.url)
      } else {
        router.push(callbackUrl)
      }
      router.refresh()
    } catch {
      setError(t('login.error'))
      setLoading(false)
    }
  }, [email, password, searchParams, router, t])

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
    await doLogin()
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
              Đăng nhập bằng tài khoản quản trị
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
            onClick={() => doLogin('admin@omnichat.vn', 'password123')}
            disabled={loading}
            className="w-full h-11 text-sm font-medium gap-2 rounded-xl border-border/40 hover:border-primary/30 hover:bg-primary/5 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Headphones className="h-4 w-4" />
            )}
            Demo (admin@omnichat.vn / password123)
          </Button>
        </div>

        {/* Theme toggle */}
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl text-muted-foreground/40 hover:text-foreground hover:bg-foreground/5 transition-all duration-200"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {mounted && (theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />)}
          </Button>
        </div>

        <p className="text-center text-[11px] text-muted-foreground/30 font-medium">
          {t('login.footer')}
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}