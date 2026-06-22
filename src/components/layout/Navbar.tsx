"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useCurrency } from "@/context/CurrencyContext";
import { useAuth } from "@/context/AuthContext";
import { supabase, isSupabaseConfigured } from "@/utils/supabase/client";
import LanguageCurrencyModal from "@/components/layout/LanguageCurrencyModal";

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [lcModalOpen, setLcModalOpen] = useState(false);
  const { language, t } = useLanguage();
  const { currency } = useCurrency();
  const { profile, signOut, isPremium, refreshProfile } = useAuth();

  const handleSwitchRole = async (targetRole: "tenant" | "landlord") => {
    if (!profile) return;
    try {
      if (isSupabaseConfigured()) {
        await supabase
          .from("profiles")
          .update({ role: targetRole })
          .eq("id", profile.id);
        
        if (targetRole === "landlord") {
          await supabase
            .from("landlord_profiles")
            .upsert({ user_id: profile.id }, { onConflict: "user_id" });
        } else {
          await supabase
            .from("tenant_profiles")
            .upsert({ user_id: profile.id }, { onConflict: "user_id" });
        }
      }
      await refreshProfile();
      window.location.href = targetRole === "landlord" ? "/dashboard/landlord" : "/dashboard/tenant";
    } catch (err) {
      console.error("Failed to switch role:", err);
    }
  };

  const handleForLandlordsClick = async (e: React.MouseEvent) => {
    if (!profile) return;
    if (profile.role === "tenant") {
      e.preventDefault();
      await handleSwitchRole("landlord");
    }
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setDropdownOpen(false);
  }, [pathname]);


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
    <>
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
            className="hover:opacity-90 transition-opacity whitespace-nowrap flex items-center gap-2.5"
          >
            <img
              src="/logo.jpg"
              alt="Heimstadt"
              className="h-9 sm:h-11 md:h-14 w-auto object-contain flex-shrink-0"
            />
            <div className="flex flex-col leading-none">
              <span className="text-[18px] sm:text-[20px] md:text-[22px] font-black text-primary tracking-tight">
                Heimstadt
              </span>
              <span className="hidden sm:block text-[9px] md:text-[10px] text-on-surface-variant font-semibold uppercase tracking-[0.18em] mt-0.5">
                {language === "de" ? "Exklusive Wohnvermittlung" : "Premium Housing"}
              </span>
            </div>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            {navLink("/suche", t("search"), "search")}
            {navLink("/blogs", t("blogs"), "rate_review")}
            {navLink("/suche?wishlist=true", t("wishlist"), "favorite")}
            <Link
              href={profile ? "/dashboard/landlord" : "/auth/login?role=landlord"}
              onClick={handleForLandlordsClick}
              className={`font-sans text-[14px] font-medium leading-5 transition-colors duration-200 pb-1 flex items-center gap-1.5 ${
                pathname.startsWith("/dashboard/landlord")
                  ? "text-primary font-bold border-b-2 border-primary"
                  : "text-on-surface-variant hover:text-primary"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">real_estate_agent</span>
              <span>{t("forLandlords")}</span>
            </Link>
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
                            title={t("premiumVerified")}
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

                    {profile.role === "landlord" ? (
                      <>
                         <Link
                          href="/dashboard/landlord?tab=bookings"
                          onClick={() => setDropdownOpen(false)}
                          className="px-4 py-2.5 text-[14px] text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-colors flex items-center gap-2"
                        >
                          <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                          <span>{t("bookingRequests")}</span>
                        </Link>

                        <Link
                          href="/dashboard/landlord?tab=properties"
                          onClick={() => setDropdownOpen(false)}
                          className="px-4 py-2.5 text-[14px] text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-colors flex items-center gap-2"
                        >
                          <span className="material-symbols-outlined text-[18px]">home_work</span>
                          <span>{t("myProperties")}</span>
                        </Link>

                        <Link
                          href="/dashboard/landlord?tab=messages"
                          onClick={() => setDropdownOpen(false)}
                          className="px-4 py-2.5 text-[14px] text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-colors flex items-center gap-2"
                        >
                          <span className="material-symbols-outlined text-[18px]">forum</span>
                          <span>{t("messagesSupport")}</span>
                        </Link>

                        <button
                          onClick={async () => {
                            setDropdownOpen(false);
                            await handleSwitchRole("tenant");
                          }}
                          className="w-full text-left px-4 py-2.5 text-[14px] text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-colors flex items-center gap-2 cursor-pointer font-sans"
                        >
                          <span className="material-symbols-outlined text-[18px]">swap_horiz</span>
                          <span>{t("switchToTenant")}</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <Link
                          href="/dashboard/tenant?tab=bookings"
                          onClick={() => setDropdownOpen(false)}
                          className="px-4 py-2.5 text-[14px] text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-colors flex items-center gap-2"
                        >
                          <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                          <span>{t("myBookings")}</span>
                        </Link>

                        <Link
                          href="/dashboard/tenant?tab=favorites"
                          onClick={() => setDropdownOpen(false)}
                          className="px-4 py-2.5 text-[14px] text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-colors flex items-center gap-2"
                        >
                          <span className="material-symbols-outlined text-[18px]">favorite</span>
                          <span>{t("favourites")}</span>
                        </Link>

                        <Link
                          href="/dashboard/tenant?tab=saved-filters"
                          onClick={() => setDropdownOpen(false)}
                          className="px-4 py-2.5 text-[14px] text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-colors flex items-center gap-2"
                        >
                          <span className="material-symbols-outlined text-[18px]">bookmarks</span>
                          <span>{t("savedSearches")}</span>
                        </Link>

                        <button
                          onClick={async () => {
                            setDropdownOpen(false);
                            await handleSwitchRole("landlord");
                          }}
                          className="w-full text-left px-4 py-2.5 text-[14px] text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-colors flex items-center gap-2 cursor-pointer font-sans"
                        >
                          <span className="material-symbols-outlined text-[18px]">swap_horiz</span>
                          <span>{t("switchToLandlord")}</span>
                        </button>
                      </>
                    )}

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
                  href="/auth/login"
                  id="btn-anmelden"
                  className="px-5 py-2 rounded-lg text-[14px] font-semibold text-primary border-2 border-primary hover:bg-surface-container-low transition-all active:scale-95 text-center"
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

          {/* Language & Currency Picker — single globe pill */}
          <button
            id="lang-currency-btn"
            onClick={() => setLcModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 h-9 bg-surface-container-low border border-outline-variant rounded-xl hover:border-primary hover:bg-surface-container hover:text-primary transition-all select-none cursor-pointer text-on-surface-variant text-[12px] font-bold"
            aria-label="Language and Currency"
          >
            <span className="material-symbols-outlined text-[17px]">language</span>
            <span className="uppercase font-extrabold">{language}</span>
            <span className="w-px h-4 bg-outline-variant/60" />
            <span className="font-extrabold">{currency.symbol}</span>
          </button>
        </div>

        {/* Mobile Hamburger */}
        <div className="flex items-center gap-3 md:hidden relative z-50 pointer-events-auto">
          {/* Globe button opens modal */}
          <button
            id="lang-currency-btn-mobile"
            onClick={() => setLcModalOpen(true)}
            className="w-9 h-9 bg-surface-container-low border border-outline-variant rounded-xl hover:border-primary hover:bg-surface-container transition-all flex items-center justify-center select-none cursor-pointer text-on-surface-variant hover:text-primary"
            aria-label="Language and Currency"
          >
            <span className="material-symbols-outlined text-[17px]">language</span>
          </button>

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

          <Link
            href="/suche?wishlist=true"
            id="btn-wishlist-mobile"
            className={`px-4 py-3 rounded-xl text-[14px] font-medium transition-all flex items-center gap-2 ${
              pathname === "/suche" && typeof window !== "undefined" && window.location.search.includes("wishlist=true")
                ? "text-primary bg-surface-container-low font-bold"
                : "text-on-surface-variant hover:bg-surface-container-low"
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">favorite</span>
            <span>{t("wishlist")}</span>
          </Link>

          <Link
            href={profile ? "/dashboard/landlord" : "/auth/login?role=landlord"}
            onClick={handleForLandlordsClick}
            className={`px-4 py-3 rounded-xl text-[14px] font-medium transition-all flex items-center gap-2 ${
              pathname.startsWith("/dashboard/landlord")
                ? "text-primary bg-surface-container-low font-bold"
                : "text-on-surface-variant hover:bg-surface-container-low"
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">real_estate_agent</span>
            <span>{t("forLandlords")}</span>
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
                          title={t("premiumVerified")}
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          verified
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-on-surface-variant capitalize">{profile.role}</div>
                  </div>
                </div>

                {profile.role === "landlord" ? (
                  <>
                    <Link
                      href="/dashboard/landlord?tab=profile"
                      className="block px-4 py-3 rounded-xl text-[14px] font-medium text-on-surface-variant hover:bg-surface-container-low"
                    >
                      {t("myProfile")}
                    </Link>
                    <Link
                      href="/dashboard/landlord?tab=bookings"
                      className="block px-4 py-3 rounded-xl text-[14px] font-medium text-on-surface-variant hover:bg-surface-container-low"
                    >
                      {t("bookingRequests")}
                    </Link>
                    <Link
                      href="/dashboard/landlord?tab=properties"
                      className="block px-4 py-3 rounded-xl text-[14px] font-medium text-on-surface-variant hover:bg-surface-container-low"
                    >
                      {t("myProperties")}
                    </Link>
                    <Link
                      href="/dashboard/landlord?tab=messages"
                      className="block px-4 py-3 rounded-xl text-[14px] font-medium text-on-surface-variant hover:bg-surface-container-low"
                    >
                      {t("messagesSupport")}
                    </Link>
                    <button
                      onClick={async () => {
                        setMobileOpen(false);
                        await handleSwitchRole("tenant");
                      }}
                      className="w-full text-left px-4 py-3 rounded-xl text-[14px] font-medium text-on-surface-variant hover:bg-surface-container-low cursor-pointer font-sans"
                    >
                      {t("switchToTenant")}
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/dashboard/tenant?tab=profile"
                      className="block px-4 py-3 rounded-xl text-[14px] font-medium text-on-surface-variant hover:bg-surface-container-low"
                    >
                      {t("myProfile")}
                    </Link>
                    <Link
                      href="/dashboard/tenant?tab=bookings"
                      className="block px-4 py-3 rounded-xl text-[14px] font-medium text-on-surface-variant hover:bg-surface-container-low"
                    >
                      {t("myBookings")}
                    </Link>
                    <Link
                      href="/dashboard/tenant?tab=favorites"
                      className="block px-4 py-3 rounded-xl text-[14px] font-medium text-on-surface-variant hover:bg-surface-container-low"
                    >
                      {t("favourites")}
                    </Link>
                    <Link
                      href="/dashboard/tenant?tab=saved-filters"
                      className="block px-4 py-3 rounded-xl text-[14px] font-medium text-on-surface-variant hover:bg-surface-container-low"
                    >
                      {t("savedSearches")}
                    </Link>
                    <button
                      onClick={async () => {
                        setMobileOpen(false);
                        await handleSwitchRole("landlord");
                      }}
                      className="w-full text-left px-4 py-3 rounded-xl text-[14px] font-medium text-on-surface-variant hover:bg-surface-container-low cursor-pointer font-sans"
                    >
                      {t("switchToLandlord")}
                    </button>
                  </>
                )}
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
                  href="/auth/login"
                  className="w-full py-3 rounded-xl text-[14px] font-semibold text-primary border-2 border-primary hover:bg-surface-container-low transition-all text-center"
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

    {/* Language & Currency Modal (portal-like, rendered outside header) */}
    <LanguageCurrencyModal
      open={lcModalOpen}
      onClose={() => setLcModalOpen(false)}
    />
    </>
  );
}
