import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Compass, Mail, Lock, Sparkles, ArrowRight, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const Login: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const { signInWithEmail, signInWithGoogle, signInDemo, isConfigured } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/dashboard'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }
    setError(null)
    setLoading(true)
    const { error: signInError } = await signInWithEmail(email, password)
    setLoading(false)

    if (signInError) {
      setError(signInError.message)
    } else {
      navigate(from, { replace: true })
    }
  }

  const handleDemoLogin = () => {
    signInDemo()
    navigate('/dashboard', { replace: true })
  }

  const handleGoogleLogin = async () => {
    setError(null)
    const { error } = await signInWithGoogle()
    if (error) setError(error.message)
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 animate-in fade-in-50 duration-500">
      <Card className="w-full max-w-md shadow-2xl border-border/80 rounded-3xl bg-card/90 backdrop-blur-xl">
        <CardHeader className="space-y-2 text-center pb-6">
          <div className="mx-auto h-14 w-14 rounded-3xl bg-linear-to-tr from-teal-600 via-teal-500 to-emerald-400 flex items-center justify-center text-white shadow-xl shadow-teal-500/30 mb-2">
            <Compass className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl sm:text-3xl font-extrabold tracking-tight">Welcome Back</CardTitle>
          <CardDescription className="text-xs sm:text-sm text-muted-foreground">
            Log in to manage your itineraries, maps, and travel documents
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Demo One-Click Login */}
          <button
            type="button"
            onClick={handleDemoLogin}
            className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-linear-to-r from-teal-500/15 via-emerald-500/10 to-teal-500/15 border border-teal-500/30 text-teal-800 dark:text-teal-300 hover:border-teal-500 transition-all text-xs sm:text-sm font-semibold group cursor-pointer shadow-xs"
          >
            <div className="flex items-center gap-2.5">
              <Sparkles className="h-4 w-4 text-teal-600 dark:text-teal-400 group-hover:scale-110 transition-transform" />
              <span>Explore Instant Demo Mode</span>
            </div>
            <ArrowRight className="h-4 w-4 text-teal-600 dark:text-teal-400 group-hover:translate-x-1 transition-transform" />
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/70" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase tracking-wider font-semibold">
              <span className="bg-card px-2 text-muted-foreground">Or with credentials</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="name@example.com"
                  className="pl-10 h-10 rounded-xl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground">Password</label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-teal-600 dark:text-teal-400 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pl-10 pr-10 h-10 rounded-xl"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold h-11 cursor-pointer" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          {isConfigured && (
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-xl h-11 text-xs font-semibold"
              onClick={handleGoogleLogin}
            >
              <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Continue with Google
            </Button>
          )}

          <div className="text-center text-xs text-muted-foreground pt-2">
            Don't have an account?{' '}
            <Link to="/signup" className="font-bold text-teal-600 dark:text-teal-400 hover:underline">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
