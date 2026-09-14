import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Compass, Mail, ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const { resetPassword } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      setError('Please enter your email')
      return
    }
    setError(null)
    setLoading(true)

    const { error: resetError } = await resetPassword(email)
    setLoading(false)

    if (resetError) {
      setError(resetError.message)
    } else {
      setSubmitted(true)
    }
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 animate-in fade-in-50 duration-500">
      <Card className="w-full max-w-md shadow-2xl border-border/80 rounded-3xl bg-card/90 backdrop-blur-xl">
        <CardHeader className="space-y-2 text-center pb-6">
          <div className="mx-auto h-14 w-14 rounded-3xl bg-linear-to-tr from-teal-600 via-teal-500 to-emerald-400 flex items-center justify-center text-white shadow-xl shadow-teal-500/30 mb-2">
            <Compass className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl sm:text-3xl font-extrabold tracking-tight">Reset Password</CardTitle>
          <CardDescription className="text-xs sm:text-sm text-muted-foreground">
            Enter your email to receive a password recovery link
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {submitted ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center p-6 text-center bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                <CheckCircle2 className="h-10 w-10 text-emerald-600 dark:text-emerald-400 mb-2" />
                <h4 className="font-bold text-foreground text-base">Check Your Inbox</h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  We sent a recovery email to <strong>{email}</strong>. Follow the instructions to reset your password.
                </p>
              </div>

              <Link to="/login" className="block w-full">
                <Button variant="outline" className="w-full rounded-xl h-11 text-xs font-semibold">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Login
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="alex@example.com"
                    className="pl-10 h-10 rounded-xl"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold h-11 cursor-pointer" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Link...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </Button>

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline"
                >
                  <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                  Back to Login
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
