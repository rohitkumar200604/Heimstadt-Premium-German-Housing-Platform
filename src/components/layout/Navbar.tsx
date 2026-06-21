"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const { language, setLanguage, t } = useLanguage();
  const { profile, signOut, isPremium } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setDropdownOpen(false);
    setLangDropdownOpen(false);
  }, [pathname]);

  // Click outside to close desktop dropdown menu
  useEffect(() => {
    if (!dropdownOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".avatar-dropdown-container")) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [dropdownOpen]);

  // Click outside to close desktop language dropdown
  useEffect(() => {
    if (!langDropdownOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".lang-dropdown-container")) {
        setLangDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [langDropdownOpen]);

  const navLink = (href: string, label: string, icon?: string) => {
    const active = pathname === href || pathname.startsWith(href + "/");
    return (
      <Link
        href={href}
        className={`font-sans text-[14px] font-medium leading-5 transition-colors duration-200 pb-1 flex items-center gap-1.5 ${
          active
            ? "text-primary font-bold border-b-2 border-primary"
            : "text-on-surface-variant hover:text-primary"
        }`}
      >
        {icon && (
          <span className="material-symbols-outlined text-[18px]">
            {icon}
          </span>
        )}
        <span>{label}</span>
      </Link>
    );
  };

  const getDashboardUrl = () => {
    if (!profile) return "/";
    return profile.role === "landlord" ? "/dashboard/landlord" : "/dashboard/tenant";
  };

  return (
    <header
      id="navbar"
      className={`w-full top-0 sticky bg-surface border-b border-outline-variant z-50 transition-shadow duration-300 ${
        scrolled ? "shadow-md" : ""
      }`}
    >
      <nav className="flex justify-between items-center w-full px-5 md:px-[48px] py-4 max-w-[1280px] mx-auto">
        {/* Logo + Links */}
        <div className="flex items-center gap-4 md:gap-12">
          <Link
            href="/"
            className="text-[26px] sm:text-[32px] md:text-[40px] font-bold text-primary leading-none tracking-tight hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            {t("logo")}
          </Link>
          <div className="hidden md:flex items-center gap-8">
            {navLink("/suche", t("search"), "search")}
            {navLink("/blogs", t("blogs"), "rate_review")}
          </div>
        </div>

        {/* Right Nav */}
        <div className="hidden md:flex items-center gap-6">
          {/* Auth Buttons */}
          <div className="flex items-center gap-3">
            {profile ? (
              <div className="relative avatar-dropdown-container">
                {/* Profile Icon button */}
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-[16px] cursor-pointer hover:bg-primary/20 transition-all select-none focus:outline-none"
                  aria-label="User profile menu"
                >
                  {profile.full_name ? profile.full_name.charAt(0).toUpperCase() : "U"}
                </button>

                {/* Dropdown popup */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-outline-variant rounded-2xl shadow-xl py-2 z-[999] animate-[fadeIn_0.15s_ease-out] flex flex-col">
                    {/* User profile card */}
                    <div className="px-4 py-2 border-b border-outline-variant/40 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className="text-[14px] font-bold text-on-surface truncate">{profile.full_name}</p>
                        {isPremium && (
                          <span 
                            className="material-symbols-outlined text-[16px] text-[#f07d00] flex-shrink-0" 
                            title={language === "de" ? "Premium Verifiziert" : "Premium Verified"}
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            verified
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-on-surface-variant capitalize truncate">{profile.role}</p>
                    </div>

                    <Link
                      href={`${getDashboardUrl()}?tab=profile`}
                      onClick={() => setDropdownOpen(false)}
                      className="px-4 py-2.5 text-[14px] text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-colors flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[18px]">account_circle</span>
                      <span>{t("myProfile")}</span>
                    </Link>

                    <Link
                      href={`${getDashboardUrl()}?tab=bookings`}
                      onClick={() => setDropdownOpen(false)}
                      className="px-4 py-2.5 text-[14px] text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-colors flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                      <span>{t("myBookings")}</span>
                    </Link>

                    <Link
                      href={`${getDashboardUrl()}?tab=favorites`}
                      onClick={() => setDropdownOpen(false)}
                      className="px-4 py-2.5 text-[14px] text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-colors flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[18px]">favorite</span>
                      <span>{t("favourites")}</span>
                    </Link>

                    <hr className="border-outline-variant/40 my-1" />

                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        signOut();
                      }}
                      className="w-full text-left px-4 py-2.5 text-[14px] text-error hover:bg-red-50 transition-colors flex items-center gap-2 cursor-pointer font-sans"
                    >
                      <span className="material-symbols-outlined text-[18px]">logout</span>
                      <span>{t("logout")}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link
                  href="/suche?wishlist=true"
                  id="btn-wishlist"
                  className="px-5 py-2 rounded-lg text-[14px] font-semibold text-primary hover:bg-surface-container-low transition-all active:scale-95 text-center flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[18px]">favorite</span>
                  <span>{language === "de" ? "Wunschliste" : "Wishlist"}</span>
                </Link>
                <Link
                  href="/auth/login"
                  id="btn-anmelden"
                  className="px-5 py-2 rounded-lg text-[14px] font-semibold text-primary hover:bg-surface-container-low transition-all active:scale-95 text-center"
                >
                  {t("login")}
                </Link>
                <Link
                  href="/auth/register"
                  id="btn-registrieren"
                  className="px-5 py-2 rounded-lg text-[14px] font-semibold bg-primary text-on-primary hover:opacity-90 transition-all active:scale-95 text-center"
                >
                  {t("register")}
                </Link>
              </>
            )}
          </div>

          {/* Universal Language Selector Dropdown (globe/network icon, full language names in menu) */}
          <div className="relative lang-dropdown-container z-50">
            <button
              id="lang-dropdown-btn"
              onClick={() => setLangDropdownOpen(!langDropdownOpen)}
              className="w-10 h-10 bg-surface-container-low border border-outline-variant rounded-lg hover:bg-surface-container hover:text-primary hover:border-primary transition-all flex items-center justify-center select-none cursor-pointer text-on-surface-variant"
              aria-label="Select Language"
            >
              <span className="material-symbols-outlined text-[20px]">language</span>
            </button>
            {langDropdownOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-white border border-outline-variant rounded-xl shadow-lg py-1 animate-in fade-in slide-in-from-top-1 duration-100 flex flex-col max-h-60 overflow-y-auto custom-scrollbar">
                {[
                  { code: "de", name: "Deutsch" },
                  { code: "en", name: "English" },
                  { code: "fr", name: "Français" },
                  { code: "sv", name: "Svenska" },
                  { code: "es", name: "Español" },
                  { code: "it", name: "Italiano" },
                  { code: "nl", name: "Nederlands" },
                ].map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setLanguage(lang.code as any);
                      setLangDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-label-sm hover:bg-surface-container-low transition-colors font-semibold cursor-pointer ${
                      language === lang.code ? "text-primary bg-primary/5 font-bold" : "text-on-surface-variant"
                    }`}
                  >
                    {lang.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Mobile Hamburger */}
        <div className="flex items-center gap-3 md:hidden relative z-50 pointer-events-auto">
          {/* Mobile Universal Language Selector */}
          <div className="relative flex items-center bg-surface-container-low border border-outline-variant rounded-lg shadow-sm px-2.5 py-1.5 h-10 select-none">
            <span className="material-symbols-outlined text-[16px] text-on-surface-variant mr-1">language</span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
              className="bg-transparent text-[12px] font-bold text-on-surface-variant focus:outline-none pr-1 cursor-pointer font-sans"
              style={{ colorScheme: "light" }}
            >
              <option value="de">Deutsch</option>
              <option value="en">English</option>
              <option value="fr">Français</option>
              <option value="sv">Svenska</option>
              <option value="es">Español</option>
              <option value="it">Italiano</option>
              <option value="nl">Nederlands</option>
            </select>
          </div>

          <button
            id="mobile-menu-btn"
            className="w-12 h-12 text-primary hover:bg-surface-container-low rounded-lg transition-colors flex items-center justify-center relative z-50 cursor-pointer pointer-events-auto active:scale-95"
            onClick={() => {
              console.log("Mobile menu button clicked. Current open state:", mobileOpen);
              setMobileOpen(!mobileOpen);
            }}
            aria-label="Menü öffnen"
          >
            <svg
              className="w-6 h-6 transform transition-transform duration-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              {mobileOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile Menu Dropdown with slide-down max-height/opacity transition */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out border-outline-variant bg-surface shadow-lg ${
          mobileOpen ? "max-h-[500px] opacity-100 py-6 border-t" : "max-h-0 opacity-0 py-0 border-t-0 pointer-events-none"
        }`}
      >
        <div className="px-5 space-y-3 flex flex-col">
          <Link
            href="/suche"
            className={`px-4 py-3 rounded-xl text-[14px] font-medium transition-all flex items-center gap-2 ${
              pathname === "/suche"
                ? "text-primary bg-surface-container-low font-bold"
                : "text-on-surface-variant hover:bg-surface-container-low"
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">search</span>
            <span>{t("search")}</span>
          </Link>

          <Link
            href="/blogs"
            className={`px-4 py-3 rounded-xl text-[14px] font-medium transition-all flex items-center gap-2 ${
              pathname === "/blogs"
                ? "text-primary bg-surface-container-low font-bold"
                : "text-on-surface-variant hover:bg-surface-container-low"
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">rate_review</span>
            <span>{t("blogs")}</span>
          </Link>

          <div className="pt-3 border-t border-outline-variant/50 flex flex-col gap-3">
            {profile ? (
              <>
                {/* Mobile profile card */}
                <div className="flex items-center gap-3 px-4 py-2 border-b border-outline-variant/30 pb-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-[16px]">
                    {profile.full_name ? profile.full_name.charAt(0).toUpperCase() : "U"}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <div className="text-[14px] font-bold text-on-surface">{profile.full_name}</div>
                      {isPremium && (
                        <span 
                          className="material-symbols-outlined text-[16px] text-[#f07d00] flex-shrink-0" 
                          title={language === "de" ? "Premium Verifiziert" : "Premium Verified"}
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          verified
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-on-surface-variant capitalize">{profile.role}</div>
                  </div>
                </div>

                <Link
                  href={`${getDashboardUrl()}?tab=profile`}
                  className="block px-4 py-3 rounded-xl text-[14px] font-medium text-on-surface-variant hover:bg-surface-container-low"
                >
                  {t("myProfile")}
                </Link>
                <Link
                  href={`${getDashboardUrl()}?tab=bookings`}
                  className="block px-4 py-3 rounded-xl text-[14px] font-medium text-on-surface-variant hover:bg-surface-container-low"
                >
                  {t("myBookings")}
                </Link>
                <Link
                  href={`${getDashboardUrl()}?tab=favorites`}
                  className="block px-4 py-3 rounded-xl text-[14px] font-medium text-on-surface-variant hover:bg-surface-container-low"
                >
                  {t("favourites")}
                </Link>
                <button
                  onClick={signOut}
                  className="w-full py-3 mt-2 rounded-xl text-[14px] font-semibold bg-primary text-on-primary hover:opacity-90 transition-all text-center cursor-pointer font-sans"
                >
                  {t("logout")}
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/suche?wishlist=true"
                  className="w-full py-3 rounded-xl text-[14px] font-semibold text-primary border border-outline-variant hover:bg-surface-container-low transition-all text-center flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[18px]">favorite</span>
                  <span>{language === "de" ? "Wunschliste" : "Wishlist"}</span>
                </Link>
                <Link
                  href="/auth/login"
                  className="w-full py-3 rounded-xl text-[14px] font-semibold text-primary border border-outline-variant hover:bg-surface-container-low transition-all text-center"
                >
                  {t("login")}
                </Link>
                <Link
                  href="/auth/register"
                  className="w-full py-3 rounded-xl text-[14px] font-semibold bg-primary text-on-primary hover:opacity-90 transition-all text-center"
                >
                  {t("register")}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
