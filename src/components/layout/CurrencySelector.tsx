import React, { useState } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { useCurrency, SUPPORTED_CURRENCIES, type CurrencyCode } from '@/context/CurrencyContext'

export const CurrencySelector: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { currency, setCurrency, currentConfig } = useCurrency()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 rounded-full border border-border transition-all focus:outline-hidden cursor-pointer ${
          compact
            ? 'px-2 py-1 text-xs bg-secondary/70 hover:bg-secondary'
            : 'px-3 py-1.5 text-xs font-bold bg-secondary/60 hover:bg-secondary text-foreground shadow-xs'
        }`}
        aria-label="Change currency"
      >
        <span className="flex items-center justify-center h-4 w-4 rounded-full bg-teal-500/15 text-teal-700 dark:text-teal-300 font-extrabold text-[10px]">
          {currentConfig.symbol}
        </span>
        <span className="font-bold text-xs">{currency}</span>
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-44 rounded-2xl border border-border bg-card backdrop-blur-xl p-1.5 shadow-xl z-50 animate-in fade-in-50 zoom-in-95">
            <div className="px-2.5 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Select Currency
            </div>
            <div className="space-y-0.5">
              {(Object.keys(SUPPORTED_CURRENCIES) as CurrencyCode[]).map((code) => {
                const item = SUPPORTED_CURRENCIES[code]
                const isSelected = currency === code

                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => {
                      setCurrency(code)
                      setIsOpen(false)
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-teal-500/15 text-teal-800 dark:text-teal-300 font-bold'
                        : 'text-foreground hover:bg-secondary'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 text-center font-bold text-teal-600 dark:text-teal-400">
                        {item.symbol}
                      </span>
                      <span>{code}</span>
                    </div>
                    {isSelected && <Check className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />}
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
