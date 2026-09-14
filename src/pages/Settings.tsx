import React, { useState } from 'react'
import { User, Sparkles, Check, Database, Save, Compass, Coins } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useCurrency, SUPPORTED_CURRENCIES, type CurrencyCode } from '@/context/CurrencyContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const Settings: React.FC = () => {
  const { user, profile, updateProfile, isConfigured } = useAuth()
  const { currency, setCurrency } = useCurrency()

  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '')
  const [pace, setPace] = useState<'relaxed' | 'moderate' | 'fast-paced'>(
    profile?.travel_preferences?.pace || 'moderate'
  )
  const [interests, setInterests] = useState<string[]>(
    profile?.travel_preferences?.interests || ['Culture', 'Photography', 'Food & Wine']
  )
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const interestOptions = [
    'Culture',
    'Photography',
    'Food & Wine',
    'Nature & Wildlife',
    'Beaches',
    'History & Museums',
    'Nightlife',
    'Adventure Sports',
  ]

  const toggleInterest = (interest: string) => {
    setInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    )
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    await updateProfile({
      full_name: fullName,
      avatar_url: avatarUrl,
      travel_preferences: {
        pace,
        interests,
      },
    })

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in-50 duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Account & Travel Preferences</h1>
        <p className="text-sm text-muted-foreground">
          Customize your profile and AI travel recommendation preferences
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Supabase Status Card */}
        <Card className="md:col-span-1 border-border/80 rounded-2xl bg-card/85 backdrop-blur-xs">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                <Database className="h-4 w-4" />
              </div>
              <CardTitle className="text-sm font-bold">Supabase Backend</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Connection & authentication status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Status:</span>
              <Badge variant={isConfigured ? 'success' : 'warning'} className="rounded-full px-2.5">
                {isConfigured ? 'Connected' : 'Demo Mode'}
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              {isConfigured
                ? 'Your app is directly synced with Supabase Auth, PostgreSQL database, and RLS policies.'
                : 'Running in standalone demo mode. Add your Supabase credentials in .env to enable real-time cloud sync.'}
            </p>
          </CardContent>
        </Card>

        {/* Profile & Preferences Form */}
        <Card className="md:col-span-2 border-border/80 rounded-2xl bg-card/85 backdrop-blur-xs">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                <User className="h-4 w-4" />
              </div>
              <CardTitle className="text-sm font-bold">Profile & AI Persona</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Email</label>
                <Input value={user?.email || ''} disabled className="opacity-70 rounded-xl" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Full Name</label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your Name"
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Avatar Image URL</label>
                <Input
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-border/70">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Coins className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                  <span>Display Currency & Budget Unit</span>
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {(Object.keys(SUPPORTED_CURRENCIES) as CurrencyCode[]).map((code) => {
                    const item = SUPPORTED_CURRENCIES[code]
                    const isSelected = currency === code
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() => setCurrency(code)}
                        className={`p-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                          isSelected
                            ? 'bg-teal-600 text-white border-teal-600 shadow-xs scale-102'
                            : 'bg-card border-border text-foreground hover:bg-secondary'
                        }`}
                      >
                        <span className="text-sm font-extrabold">{item.symbol}</span>
                        <span className="text-[10px] opacity-90">{code}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-border/70">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Compass className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                  <span>Travel Pace</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['relaxed', 'moderate', 'fast-paced'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPace(p)}
                      className={`p-2.5 rounded-xl text-xs font-bold capitalize border transition-all cursor-pointer ${
                        pace === p
                          ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                          : 'bg-card border-border text-foreground hover:bg-secondary'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-border/70">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                  <span>Interests & AI Prompt Guidance</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {interestOptions.map((item) => {
                    const isSelected = interests.includes(item)
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleInterest(item)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-teal-500/15 text-teal-900 dark:text-teal-300 border-teal-500/40 shadow-xs'
                            : 'bg-card border-border text-foreground hover:bg-secondary'
                        }`}
                      >
                        {item} {isSelected && '✓'}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border/70">
                {saved ? (
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Check className="h-4 w-4" /> Preferences saved!
                  </span>
                ) : (
                  <span />
                )}

                <Button type="submit" disabled={saving} className="gap-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white">
                  <Save className="h-4 w-4" />
                  <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
