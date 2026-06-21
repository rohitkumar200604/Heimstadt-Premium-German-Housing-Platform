"use client";

import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useCurrency, CURRENCIES } from "@/context/CurrencyContext";
import { Language } from "@/utils/translations";

const LANGUAGES = [
  { code: "de", name: "Deutsch",    region: "Deutschland",        flag: "🇩🇪" },
  { code: "en", name: "English",    region: "United Kingdom",     flag: "🇬🇧" },
  { code: "fr", name: "Français",   region: "France",             flag: "🇫🇷" },
  { code: "sv", name: "Svenska",    region: "Sverige",            flag: "🇸🇪" },
  { code: "es", name: "Español",    region: "España",             flag: "🇪🇸" },
  { code: "it", name: "Italiano",   region: "Italia",             flag: "🇮🇹" },
  { code: "nl", name: "Nederlands", region: "Nederland",          flag: "🇳🇱" },
  { code: "pl", name: "Polski",     region: "Polska",             flag: "🇵🇱" },
  { code: "tr", name: "Türkçe",     region: "Türkiye",            flag: "🇹🇷" },
  { code: "ru", name: "Русский",    region: "Россия",             flag: "🇷🇺" },
  { code: "zh", name: "中文",       region: "中国",               flag: "🇨🇳" },
  { code: "ja", name: "日本語",     region: "日本",               flag: "🇯🇵" },
  { code: "ko", name: "한국어",     region: "대한민국",           flag: "🇰🇷" },
  { code: "ar", name: "العربية",    region: "العالم العربي",      flag: "🇸🇦" },
  { code: "hi", name: "हिन्दी",    region: "भारत",               flag: "🇮🇳" },
  { code: "pt", name: "Português",  region: "Brasil",             flag: "🇧🇷" },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

type Tab = "language" | "currency";

export default function LanguageCurrencyModal({ open, onClose }: Props) {
  const { language, setLanguage } = useLanguage();
  const { currency, setCurrencyCode } = useCurrency();
  const [tab, setTab] = useState<Tab>("language");
  const overlayRef = useRef<HTMLDivElement>(null);

  // Reset tab on open
  useEffect(() => {
    if (open) setTab("language");
  }, [open]);

  // Trap keyboard Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Prevent body scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const handleSelectLanguage = (code: string) => {
    // Only switch if it's one of the supported translation languages
    const supported: Language[] = ["de", "en", "fr", "sv", "es", "it", "nl"];
    if (supported.includes(code as Language)) {
      setLanguage(code as Language);
    }
    onClose();
  };

  const handleSelectCurrency = (code: string) => {
    setCurrencyCode(code);
    onClose();
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />

      {/* Modal panel */}
      <div className="relative z-10 w-full sm:max-w-[680px] max-h-[90dvh] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-[slideUp_0.25s_ease-out]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/60 flex-shrink-0">
          <div className="flex gap-1 p-1 bg-surface-container-low rounded-xl">
            <button
              onClick={() => setTab("language")}
              className={`px-5 py-2 rounded-lg text-[14px] font-bold transition-all cursor-pointer ${
                tab === "language"
                  ? "bg-primary text-on-primary shadow-sm"
                  : "text-on-surface-variant hover:text-primary"
              }`}
            >
              {language === "de" ? "Sprache & Region" : "Language & Region"}
            </button>
            <button
              onClick={() => setTab("currency")}
              className={`px-5 py-2 rounded-lg text-[14px] font-bold transition-all cursor-pointer ${
                tab === "currency"
                  ? "bg-primary text-on-primary shadow-sm"
                  : "text-on-surface-variant hover:text-primary"
              }`}
            >
              {language === "de" ? "Währung" : "Currency"}
            </button>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-surface-container-low flex items-center justify-center text-on-surface-variant hover:text-primary transition-all cursor-pointer"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">

          {/* ── LANGUAGE TAB ── */}
          {tab === "language" && (
            <div>
              <p className="text-[12px] font-bold text-on-surface-variant uppercase tracking-widest mb-4">
                {language === "de" ? "Sprache auswählen" : "Choose a language"}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {LANGUAGES.map((lang) => {
                  const isSelected = language === lang.code;
                  const isSupported = ["de","en","fr","sv","es","it","nl"].includes(lang.code);
                  return (
                    <button
                      key={lang.code}
                      onClick={() => handleSelectLanguage(lang.code)}
                      className={`relative flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-left transition-all cursor-pointer group ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-outline-variant/50 hover:border-primary/40 hover:bg-surface-container-low"
                      } ${!isSupported ? "opacity-50" : ""}`}
                      title={!isSupported ? (language === "de" ? "Bald verfügbar" : "Coming soon") : undefined}
                    >
                      <span className="text-[22px] leading-none flex-shrink-0">{lang.flag}</span>
                      <div className="min-w-0">
                        <div className={`text-[14px] font-bold leading-snug truncate ${isSelected ? "text-primary" : "text-on-surface"}`}>
                          {lang.name}
                        </div>
                        <div className="text-[11px] text-on-surface-variant truncate">{lang.region}</div>
                      </div>
                      {isSelected && (
                        <span className="material-symbols-outlined text-primary text-[16px] absolute top-2 right-2" style={{ fontVariationSettings: "'FILL' 1" }}>
                          check_circle
                        </span>
                      )}
                      {!isSupported && (
                        <span className="text-[9px] font-bold text-on-surface-variant/60 absolute bottom-1.5 right-2 uppercase tracking-wider">
                          {language === "de" ? "Bald" : "Soon"}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── CURRENCY TAB ── */}
          {tab === "currency" && (
            <div>
              <p className="text-[12px] font-bold text-on-surface-variant uppercase tracking-widest mb-4">
                {language === "de" ? "Währung auswählen" : "Choose a currency"}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CURRENCIES.map((cur) => {
                  const isSelected = currency.code === cur.code;
                  return (
                    <button
                      key={cur.code}
                      onClick={() => handleSelectCurrency(cur.code)}
                      className={`relative flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-outline-variant/50 hover:border-primary/40 hover:bg-surface-container-low"
                      }`}
                    >
                      <span className={`text-[16px] font-black w-8 text-center flex-shrink-0 ${isSelected ? "text-primary" : "text-on-surface-variant"}`}>
                        {cur.symbol}
                      </span>
                      <div className="min-w-0">
                        <div className={`text-[13px] font-bold leading-snug truncate ${isSelected ? "text-primary" : "text-on-surface"}`}>
                          {cur.code}
                        </div>
                        <div className="text-[11px] text-on-surface-variant truncate">{cur.name}</div>
                      </div>
                      {isSelected && (
                        <span className="material-symbols-outlined text-primary text-[16px] absolute top-2 right-2" style={{ fontVariationSettings: "'FILL' 1" }}>
                          check_circle
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 p-4 bg-surface-container-low rounded-xl border border-outline-variant/50 flex items-start gap-3">
                <span className="material-symbols-outlined text-[18px] text-on-surface-variant flex-shrink-0 mt-0.5">info</span>
                <p className="text-[12px] text-on-surface-variant leading-relaxed">
                  {language === "de"
                    ? "Preise werden für Anzeigezwecke umgerechnet. Transaktionen werden stets in Euro (€) abgewickelt."
                    : "Prices are converted for display purposes only. All transactions are always processed in Euro (€)."}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-outline-variant/60 flex-shrink-0 bg-surface-container-low/50">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl text-[14px] font-bold bg-primary text-on-primary hover:opacity-90 active:scale-95 transition-all cursor-pointer"
          >
            {language === "de" ? "Speichern & Schließen" : "Save & Close"}
          </button>
        </div>
      </div>
    </div>
  );
}
