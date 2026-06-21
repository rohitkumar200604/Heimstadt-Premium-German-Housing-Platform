"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

export const CURRENCIES = [
  { code: "EUR", symbol: "€",    name: "Euro",                 region: "Europe",        rate: 1 },
  { code: "USD", symbol: "$",    name: "US Dollar",            region: "United States",  rate: 1.09 },
  { code: "GBP", symbol: "£",    name: "British Pound",        region: "United Kingdom", rate: 0.86 },
  { code: "CHF", symbol: "Fr",   name: "Swiss Franc",          region: "Switzerland",    rate: 0.99 },
  { code: "SEK", symbol: "kr",   name: "Swedish Krona",        region: "Sweden",         rate: 11.3 },
  { code: "NOK", symbol: "kr",   name: "Norwegian Krone",      region: "Norway",         rate: 11.7 },
  { code: "DKK", symbol: "kr",   name: "Danish Krone",         region: "Denmark",        rate: 7.46 },
  { code: "PLN", symbol: "zł",   name: "Polish Złoty",         region: "Poland",         rate: 4.31 },
  { code: "CZK", symbol: "Kč",   name: "Czech Koruna",         region: "Czech Republic", rate: 25.2 },
  { code: "HUF", symbol: "Ft",   name: "Hungarian Forint",     region: "Hungary",        rate: 392 },
  { code: "RON", symbol: "lei",  name: "Romanian Leu",         region: "Romania",        rate: 4.97 },
  { code: "INR", symbol: "₹",    name: "Indian Rupee",         region: "India",          rate: 91.2 },
  { code: "AUD", symbol: "A$",   name: "Australian Dollar",    region: "Australia",      rate: 1.67 },
  { code: "CAD", symbol: "C$",   name: "Canadian Dollar",      region: "Canada",         rate: 1.49 },
  { code: "JPY", symbol: "¥",    name: "Japanese Yen",         region: "Japan",          rate: 160.5 },
  { code: "CNY", symbol: "¥",    name: "Chinese Yuan",         region: "China",          rate: 7.89 },
  { code: "AED", symbol: "د.إ",  name: "UAE Dirham",           region: "UAE",            rate: 4.0 },
  { code: "SGD", symbol: "S$",   name: "Singapore Dollar",     region: "Singapore",      rate: 1.47 },
  { code: "MXN", symbol: "MX$",  name: "Mexican Peso",         region: "Mexico",         rate: 19.4 },
  { code: "BRL", symbol: "R$",   name: "Brazilian Real",       region: "Brazil",         rate: 5.91 },
  { code: "ZAR", symbol: "R",    name: "South African Rand",   region: "South Africa",   rate: 20.2 },
  { code: "TRY", symbol: "₺",    name: "Turkish Lira",         region: "Turkey",         rate: 35.2 },
  { code: "KRW", symbol: "₩",    name: "South Korean Won",     region: "South Korea",    rate: 1445 },
  { code: "NZD", symbol: "NZ$",  name: "New Zealand Dollar",   region: "New Zealand",    rate: 1.83 },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];
export type Currency = (typeof CURRENCIES)[number];

interface CurrencyContextValue {
  currency: Currency;
  setCurrencyCode: (code: string) => void;
  formatPrice: (eurAmount: number) => string;
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: CURRENCIES[0],
  setCurrencyCode: () => {},
  formatPrice: (n) => `€${n}`,
});

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currencyCode, setCurrencyCodeState] = useState<string>("EUR");

  // Hydrate from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("heimat_currency");
    if (saved && CURRENCIES.find((c) => c.code === saved)) {
      setCurrencyCodeState(saved);
    }
  }, []);

  const setCurrencyCode = useCallback((code: string) => {
    setCurrencyCodeState(code);
    localStorage.setItem("heimat_currency", code);
  }, []);

  const currency =
    (CURRENCIES.find((c) => c.code === currencyCode) as Currency) ?? CURRENCIES[0];

  const formatPrice = useCallback(
    (eurAmount: number): string => {
      const converted = Math.round(eurAmount * currency.rate);
      // For large-rate currencies (JPY, KRW, HUF) don't add decimals
      const formatted =
        currency.rate >= 100
          ? converted.toLocaleString()
          : converted.toLocaleString();
      return `${currency.symbol}${formatted}`;
    },
    [currency]
  );

  return (
    <CurrencyContext.Provider value={{ currency, setCurrencyCode, formatPrice }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
