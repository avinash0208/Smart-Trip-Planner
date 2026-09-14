import React, { createContext, useContext, useState, useEffect } from 'react'

export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED' | 'JPY'

export interface CurrencyConfig {
  code: CurrencyCode
  symbol: string
  label: string
  rateFromINR: number // 1 INR in target currency
}

export const SUPPORTED_CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  INR: { code: 'INR', symbol: '₹', label: 'INR (₹)', rateFromINR: 1 },
  USD: { code: 'USD', symbol: '$', label: 'USD ($)', rateFromINR: 0.012 },
  EUR: { code: 'EUR', symbol: '€', label: 'EUR (€)', rateFromINR: 0.011 },
  GBP: { code: 'GBP', symbol: '£', label: 'GBP (£)', rateFromINR: 0.0095 },
  AED: { code: 'AED', symbol: 'AED', label: 'AED (د.إ)', rateFromINR: 0.044 },
  JPY: { code: 'JPY', symbol: '¥', label: 'JPY (¥)', rateFromINR: 1.82 },
}

interface CurrencyContextType {
  currency: CurrencyCode
  setCurrency: (currency: CurrencyCode) => void
  format: (amountInINR: number) => string
  symbol: string
  currentConfig: CurrencyConfig
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined)

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    const saved = localStorage.getItem('smartplanner_currency') as CurrencyCode | null
    return saved && SUPPORTED_CURRENCIES[saved] ? saved : 'INR'
  })

  useEffect(() => {
    localStorage.setItem('smartplanner_currency', currency)
  }, [currency])

  const setCurrency = (newCurrency: CurrencyCode) => {
    setCurrencyState(newCurrency)
  }

  const currentConfig = SUPPORTED_CURRENCIES[currency] || SUPPORTED_CURRENCIES.INR

  const format = (amountInINR: number): string => {
    if (isNaN(amountInINR) || amountInINR === null || amountInINR === undefined) {
      amountInINR = 0
    }

    if (currency === 'INR') {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(amountInINR)
    }

    // Convert from INR to target currency
    const converted = amountInINR * currentConfig.rateFromINR
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currentConfig.code,
      maximumFractionDigits: 0,
    }).format(converted)
  }

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        format,
        symbol: currentConfig.symbol,
        currentConfig,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  )
}

export const useCurrency = () => {
  const context = useContext(CurrencyContext)
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider')
  }
  return context
}
