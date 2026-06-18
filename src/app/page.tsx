"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Footer from "@/components/layout/Footer";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";

const CITIES = [
  {
    nameDe: "Berlin",
    nameEn: "Berlin",
    count: "2.450",
    img: "https://images.unsplash.com/photo-1528728329032-2972f65dfb3f?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8QmVybGlufGVufDB8fDB8fHww",
  },
  {
    nameDe: "München",
    nameEn: "Munich",
    count: "1.820",
    img: "https://images.unsplash.com/photo-1649609765902-254a227dc960?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OHx8bXVuaWNofGVufDB8fDB8fHww",
  },
  {
    nameDe: "Hamburg",
    nameEn: "Hamburg",
    count: "1.560",
    img: "https://images.unsplash.com/photo-1580674631903-7817e4f8a722?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MjB8fGhhbWJ1cmd8ZW58MHx8MHx8fDA%3D",
  },
  {
    nameDe: "Frankfurt",
    nameEn: "Frankfurt",
    count: "1.240",
    img: "https://plus.unsplash.com/premium_photo-1719843507763-9dcd405f9619?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8ZnJhbmtmdXJ0fGVufDB8fDB8fHww",
  },
  {
    nameDe: "Köln",
    nameEn: "Cologne",
    count: "1.100",
    img: "https://images.unsplash.com/photo-1600081925754-e32c08c14c19?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MjB8fEslQzMlQjZsbnxlbnwwfHwwfHx8MA%3D%3D",
  },
  {
    nameDe: "Düsseldorf",
    nameEn: "Düsseldorf",
    count: "950",
    img: "https://images.unsplash.com/photo-1507608869274-d3177c8bb4c7?auto=format&fit=crop&w=600&q=80",
  },
  {
    nameDe: "Stuttgart",
    nameEn: "Stuttgart",
    count: "880",
    img: "https://images.unsplash.com/photo-1600081926892-4530ddcb3af7?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OHx8RCVDMyVCQ3NzZWxkb3JmfGVufDB8fDB8fHww",
  },
  {
    nameDe: "Leipzig",
    nameEn: "Leipzig",
    count: "720",
    img: "https://images.unsplash.com/photo-1616001029681-ff04e6bfc6c9?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8TGVpcHppZyUyMExlaXB6aWd8ZW58MHx8MHx8fDA%3D",
  },
];

const getTestimonials = (language: string, t: any) => [
  {
    quote: language === "de"
      ? "Der Suchprozess war unglaublich einfach. Innerhalb einer Woche hatte ich meine Traumwohnung in Berlin gefunden."
      : "The search process was incredibly easy. Within a week, I found my dream apartment in Berlin.",
    name: "Maximilian K.",
    role: `${t("testimonialRoleTenant")} Berlin`,
    initials: "MK",
  },
  {
    quote: language === "de"
      ? "Als Vermieter schätze ich besonders die Vorauswahl der Interessenten. Das spart mir extrem viel Zeit und Nerven."
      : "As a landlord, I particularly appreciate the pre-selection of applicants. This saves me a lot of time and hassle.",
    name: "Sabine H.",
    role: `${t("testimonialRoleLandlord")} München`,
    initials: "SH",
  },
  {
    quote: language === "de"
      ? "Kompetent, zuverlässig und sehr modern. Die Besichtigung per 3D-Rundgang war für mich als Pendler ideal."
      : "Competent, reliable, and very modern. The 3D virtual tour viewing was ideal for me as a commuter.",
    name: "Thomas L.",
    role: `${t("testimonialRoleTenant")} Hamburg`,
    initials: "TL",
  },
  {
    quote: language === "de"
      ? "Die Plattform hat uns geholfen, eine tolle Wohnung in der Nähe des Bankenviertels zu mieten. Der Prozess war transparent und schnell."
      : "The platform helped us rent a great apartment near the banking district. The process was transparent and fast.",
    name: "Laura M.",
    role: `${t("testimonialRoleTenant")} Frankfurt`,
    initials: "LM",
  },
  {
    quote: language === "de"
      ? "Sehr benutzerfreundlich! Als Student war es schwer, Wohnungen zu finden, aber hier hatte ich nach drei Bewerbungen Erfolg."
      : "Very user-friendly! As a student, it was hard to find apartments, but here I succeeded after three applications.",
    name: "Andreas B.",
    role: `${t("testimonialRoleTenant")} Köln`,
    initials: "AB",
  },
  {
    quote: language === "de"
      ? "Die Qualität der Inserate ist hervorragend. Keine Betrugsversuche, alles echt und verifiziert. Absolut empfehlenswert."
      : "The quality of the listings is outstanding. No scams, everything real and verified. Highly recommended.",
    name: "Elena R.",
    role: `${t("testimonialRoleLandlord")} Stuttgart`,
    initials: "ER",
  },
];

export default function HomePage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [stadt, setStadt] = useState("");
  const [zimmer, setZimmer] = useState("all");
  const [moveInDate, setMoveInDate] = useState("");
  const [moveOutDate, setMoveOutDate] = useState("");
  const [selectedPremiumPlan, setSelectedPremiumPlan] = useState<"1month" | "3months" | "12months">("3months");
  const citySliderRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logic for city slider (continuous marquee-like) with interaction yield and infinite seamless wrap
  useEffect(() => {
    const slider = citySliderRef.current;
    if (!slider) return;

    let animationFrameId: number;
    let lastTime = performance.now();
    const speed = 60; // Continuous scroll speed in pixels per second
    let isInteracting = false;
    let timeoutId: any = null;
    let scrollPos = slider.scrollLeft;

    const pauseAutoScroll = () => {
      isInteracting = true;
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        isInteracting = false;
        lastTime = performance.now();
      }, 1500); // Resume auto scroll after 1.5 seconds of inactivity
    };

    slider.addEventListener("wheel", pauseAutoScroll, { passive: true });
    slider.addEventListener("touchstart", pauseAutoScroll, { passive: true });
    slider.addEventListener("touchmove", pauseAutoScroll, { passive: true });
    slider.addEventListener("touchend", pauseAutoScroll, { passive: true });

    const leftBtn = slider.parentElement?.querySelector("[aria-label='Scroll left']");
    const rightBtn = slider.parentElement?.querySelector("[aria-label='Scroll right']");
    leftBtn?.addEventListener("click", pauseAutoScroll);
    rightBtn?.addEventListener("click", pauseAutoScroll);

    const animate = (time: number) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;

      const halfWidth = slider.scrollWidth / 2;

      if (!isInteracting) {
        if (halfWidth > 0) {
          scrollPos += speed * delta;
          
          // Wrap around seamlessly without gaps
          if (scrollPos >= halfWidth) {
            scrollPos -= halfWidth;
          } else if (scrollPos <= 5) {
            scrollPos += halfWidth;
          }
          
          slider.scrollLeft = Math.round(scrollPos);
        }
      } else {
        // Keep scrollPos synced with manual actions
        scrollPos = slider.scrollLeft;
        // Even when interacting, handle wrap around so manual scroll feels infinite and gapless
        if (halfWidth > 0) {
          if (slider.scrollLeft >= halfWidth) {
            slider.scrollLeft -= halfWidth;
            scrollPos = slider.scrollLeft;
          } else if (slider.scrollLeft <= 5) {
            slider.scrollLeft += halfWidth;
            scrollPos = slider.scrollLeft;
          }
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
      slider.removeEventListener("wheel", pauseAutoScroll);
      slider.removeEventListener("touchstart", pauseAutoScroll);
      slider.removeEventListener("touchmove", pauseAutoScroll);
      slider.removeEventListener("touchend", pauseAutoScroll);
      leftBtn?.removeEventListener("click", pauseAutoScroll);
      rightBtn?.removeEventListener("click", pauseAutoScroll);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);


  // Self-healing: Detect Google OAuth hash redirect landing on root domain and route to Auth Callback
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash) {
      if (window.location.hash.includes("access_token")) {
        router.replace(`/auth/callback${window.location.hash}`);
      }
    }
  }, [router]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stadt.trim()) return;
    localStorage.setItem("heimat_has_searched", "true");
    const q = new URLSearchParams();
    q.set("stadt", stadt.trim());
    if (zimmer !== "all") q.set("zimmer", zimmer);
    if (moveInDate) q.set("moveIn", moveInDate);
    if (moveOutDate) q.set("moveOut", moveOutDate);
    router.push(`/suche?${q.toString()}`);
  };

  const stars = Array(5).fill(0);

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative h-[870px] min-h-[600px] flex items-center justify-center overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1920&q=80"
          alt="Moderne Architektur in Deutschland"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 hero-gradient" />
        <div className="relative z-10 w-full max-w-[1280px] px-5 md:px-[48px] text-center">
          <h1 className="text-display-lg-mobile md:text-display-lg text-white mb-12 drop-shadow-lg">
            {t("heroTitle")}
          </h1>

          {/* Search Card */}
          <form
            onSubmit={handleSearch}
            className="max-w-4xl mx-auto bg-white/95 backdrop-blur-md p-4 md:p-6 rounded-xl shadow-2xl"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end">
              <div className="text-left">
                <label className="block text-label-sm text-on-surface-variant mb-2 ml-1">
                  {t("searchCityLabel")}
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-xl">
                    location_on
                  </span>
                  <input
                    value={stadt}
                    onChange={(e) => setStadt(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-[16px]"
                    placeholder="Berlin, München..."
                    type="text"
                    id="search-city"
                  />
                </div>
              </div>

              <div className="text-left">
                <label className="block text-label-sm text-on-surface-variant mb-2 ml-1">
                  {t("searchRoomsLabel")}
                </label>
                <select
                  value={zimmer}
                  onChange={(e) => setZimmer(e.target.value)}
                  id="search-rooms"
                  className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-[16px]"
                >
                  <option value="all">{t("all")}</option>
                  <option value="1">1 Room Apartment</option> 
                  <option value="2">2 Room Apartment</option>
                  <option value="3">3 Room Apartment</option>
                  <option value="4">4 Room Apartment</option>
                  <option value="5">5 Room Apartment</option>
                  <option value="house">House</option>
                  <option value="shared">Shared Accomodation</option>
                </select>
              </div>

              <div className="text-left">
                <label className="block text-label-sm text-on-surface-variant mb-2 ml-1">
                  {language === "de" ? "Einzug" : "Move in"}
                </label>
                <input
                  type="date"
                  value={moveInDate}
                  onChange={(e) => setMoveInDate(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-[15px] font-semibold text-on-surface cursor-pointer h-[50px]"
                  style={{ colorScheme: "light" }}
                  id="search-move-in"
                />
              </div>

              <div className="text-left">
                <label className="block text-label-sm text-on-surface-variant mb-2 ml-1">
                  {language === "de" ? "Auszug" : "Move out"}
                </label>
                <input
                  type="date"
                  value={moveOutDate}
                  onChange={(e) => setMoveOutDate(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-[15px] font-semibold text-on-surface cursor-pointer h-[50px]"
                  style={{ colorScheme: "light" }}
                  id="search-move-out"
                />
              </div>

              <button
                type="submit"
                id="btn-search"
                disabled={stadt.trim() === ""}
                className={`h-[50px] rounded-lg text-label-md flex items-center justify-center gap-2 transition-all shadow-lg w-full font-semibold sm:col-span-2 md:col-span-1 ${
                  stadt.trim() === ""
                    ? "bg-outline-variant text-on-surface-variant cursor-not-allowed opacity-50"
                    : "bg-primary text-white hover:opacity-90 active:scale-95 cursor-pointer"
                }`}
              >
                <span className="material-symbols-outlined text-xl">search</span>
                {t("searchBtn")}
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* ── Top-Städte ────────────────────────────────────── */}
      <section className="py-24 max-w-[1280px] mx-auto px-5 md:px-[48px] w-full">
        <div className="flex justify-between items-end mb-12 flex-wrap gap-4">
          <div>
            <h2 className="text-headline-lg-mobile md:text-headline-lg text-primary mb-2">
              {t("topCitiesTitle")}
            </h2>
            <p className="text-body-md text-on-surface-variant">
              {t("topCitiesSubtitle")}
            </p>
          </div>
          <Link
            href="/suche"
            className="text-primary text-label-md border-b border-primary pb-1 hover:opacity-70 transition-opacity"
          >
            {t("viewAllCities")}
          </Link>
        </div>

        {/* Carousel Viewport Container */}
        <div className="relative w-full group/slider">
          {/* Viewport container */}
          <div
            ref={citySliderRef}
            className="flex overflow-x-auto gap-0 py-4 no-scrollbar w-full"
          >
            {[...CITIES, ...CITIES].map((item, idx) => {
              const cityName = language === "de" ? item.nameDe : item.nameEn;
              return (
                <div
                  key={`${item.nameDe}-${idx}`}
                  className="w-[280px] md:w-[320px] flex-shrink-0 px-3"
                >
                  <button
                    id={`city-${item.nameDe.toLowerCase()}-${idx}`}
                    onClick={() => {
                      localStorage.setItem("heimat_has_searched", "true");
                      router.push(`/suche?stadt=${item.nameDe}`);
                    }}
                    className="group relative aspect-[4/5] w-full rounded-xl overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-all text-left block"
                  >
                    <img
                      src={item.img}
                      alt={`${cityName} Stadtbild`}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent" />
                    <div className="absolute bottom-6 left-6 text-white">
                      <h3 className="text-headline-md">{cityName}</h3>
                      <p className="text-label-md opacity-90">{item.count} {t("objectsAvailable")}</p>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Left Arrow Button */}
          <button
            onClick={() => {
              citySliderRef.current?.scrollBy({ left: -320, behavior: "smooth" });
            }}
            aria-label="Scroll left"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white/95 backdrop-blur-md text-primary rounded-full shadow-lg border border-outline-variant hover:bg-primary hover:text-white transition-all active:scale-90 flex items-center justify-center cursor-pointer select-none opacity-0 group-hover/slider:opacity-100 hidden md:flex"
          >
            <span className="material-symbols-outlined text-[24px]">chevron_left</span>
          </button>

          {/* Right Arrow Button */}
          <button
            onClick={() => {
              citySliderRef.current?.scrollBy({ left: 320, behavior: "smooth" });
            }}
            aria-label="Scroll right"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white/95 backdrop-blur-md text-primary rounded-full shadow-lg border border-outline-variant hover:bg-primary hover:text-white transition-all active:scale-90 flex items-center justify-center cursor-pointer select-none opacity-0 group-hover/slider:opacity-100 hidden md:flex"
          >
            <span className="material-symbols-outlined text-[24px]">chevron_right</span>
          </button>
        </div>
      </section>

      {/* ── Für Vermieter ─────────────────────────────────── */}
      <section className="bg-surface-container-low py-24">
        <div className="max-w-[1280px] mx-auto px-5 md:px-[48px] grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          {/* Image side */}
          <div className="relative">
            <div className="absolute -top-4 -left-4 w-24 h-24 bg-secondary-container rounded-full mix-blend-multiply filter blur-2xl opacity-30" />
            <img
              src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80"
              alt="Immobilienmakler übergibt Schlüssel"
              className="rounded-xl shadow-2xl relative z-10 w-full"
            />
            <div className="absolute -bottom-6 -right-6 bg-white p-6 rounded-xl shadow-xl z-20 hidden md:block">
              <p className="text-primary font-bold text-[24px] leading-8">98%</p>
              <p className="text-on-surface-variant text-[12px] font-semibold">{t("satisfiedLandlords")}</p>
            </div>
          </div>

          {/* Text side */}
          <div>
            <span className="text-secondary text-label-md tracking-wider uppercase mb-4 block">
              {t("forLandlords")}
            </span>
            <h2 className="text-headline-lg-mobile md:text-headline-lg text-primary mb-6">
              {t("landlordTitle")}
            </h2>
            <p className="text-body-lg text-on-surface-variant mb-10 leading-relaxed">
              {t("landlordDesc")}
            </p>

            <div className="space-y-6 mb-10">
              {[
                { icon: "verified", title: t("verifiedTenants"), desc: t("verifiedTenantsDesc") },
                { icon: "speed", title: t("fastMarketing"), desc: t("fastMarketingDesc") },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="flex gap-4 items-start">
                  <div className="bg-primary-fixed p-2 rounded-lg flex-shrink-0 flex items-center justify-center">
                    <span
                      className="material-symbols-outlined text-primary text-[24px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      {icon}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-label-md text-primary font-bold">{title}</h4>
                    <p className="text-on-surface-variant text-[14px] mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              id="btn-inserieren-hero"
              onClick={() => router.push(user ? "/inserieren" : "/auth/login?redirect=/inserieren")}
              className="bg-primary text-on-primary px-8 py-4 rounded-lg text-label-md hover:opacity-90 transition-all shadow-lg active:scale-95 font-semibold cursor-pointer"
            >
              {t("listPropertyBtn")}
            </button>
          </div>
        </div>
      </section>

      {/* ── Mitgliedschaften ───────────────────────────────── */}
      <section className="py-24 max-w-[1280px] mx-auto px-5 md:px-[48px] w-full border-t border-outline-variant/30">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <span className="text-secondary text-label-md tracking-wider uppercase block">
            {language === "de" ? "Flexible Tarife" : "Flexible Plans"}
          </span>
          <h2 className="text-headline-lg-mobile md:text-headline-lg text-primary">
            {language === "de" ? "Finde deine neue Heimstadt schneller" : "Find Your New Home Faster"}
          </h2>
          <p className="text-body-md text-on-surface-variant">
            {language === "de"
              ? "Nutze Heimstadt komplett kostenlos oder profitiere von unserem Premium-Paket mit exklusiven Such-Vorteilen."
              : "Use Heimstadt completely free or get our Premium package with exclusive search benefits."}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Free Card */}
          <div className="lg:col-span-5 bg-white border border-outline-variant rounded-2xl p-8 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
            <div className="space-y-6">
              <div>
                <h3 className="text-[20px] font-bold text-primary">{language === "de" ? "Kostenlose Basis-Mitgliedschaft" : "Free Basic Membership"}</h3>
                <p className="text-[14px] text-on-surface-variant mt-2">
                  {language === "de" ? "Kostenlos stöbern und direkt bewerben" : "Browse for free and apply directly"}
                </p>
                <div className="flex items-baseline gap-1 mt-6">
                  <span className="text-[40px] font-bold text-primary">0 €</span>
                  <span className="text-on-surface-variant text-[14px]">/ {language === "de" ? "Monat" : "Month"}</span>
                </div>
              </div>

              <ul className="space-y-4 text-[14px] text-on-surface-variant border-t border-outline-variant/40 pt-6">
                {[
                  { text: language === "de" ? "Unbegrenzt Immobilien durchsuchen" : "Browse unlimited properties", check: true },
                  { text: language === "de" ? "Standard-Bewerberliste für Vermieter" : "Standard applicant list for landlords", check: true },
                  { text: language === "de" ? "Direkter Chat mit Vermietern" : "Direct chat with landlords", check: false },
                  { text: language === "de" ? "Verifiziertes Bewerberportfolio" : "Validated application portfolio", check: false },
                ].map(({ text, check }, i) => (
                  <li key={i} className={`flex items-center gap-3 ${!check ? "text-outline-variant/60 line-through" : ""}`}>
                    <span className={`material-symbols-outlined text-[20px] ${check ? "text-[#137333]" : "text-outline-variant"}`}>
                      {check ? "check_circle" : "cancel"}
                    </span>
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </div>
            <button 
              onClick={() => router.push("/suche")}
              className="w-full border-2 border-primary text-primary py-3.5 rounded-xl font-bold hover:bg-primary/5 active:scale-98 transition-all mt-8 cursor-pointer text-center text-label-md"
            >
              {language === "de" ? "Jetzt kostenlos starten" : "Start Free Now"}
            </button>
          </div>

          {/* Premium Card */}
          <div className="lg:col-span-7 bg-white border-2 border-[#f07d00] rounded-2xl p-8 flex flex-col justify-between shadow-lg relative bg-gradient-to-b from-white to-[#f07d00]/5">
            <div className="absolute top-0 right-8 -translate-y-1/2 bg-[#f07d00] text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-sm">
              {language === "de" ? "Sehr Empfohlen" : "Highly Recommended"}
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-[20px] font-bold text-primary flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#f07d00]">workspace_premium</span>
                  Heimstadt Premium
                </h3>
                <p className="text-[14px] text-on-surface-variant mt-2">
                  {language === "de"
                    ? "Maximale Suchgeschwindigkeit mit bevorzugten Bewerbungen."
                    : "Maximum search speed with priority applications."}
                </p>
              </div>

              {/* Minified Pricing Cards from the reference image */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-outline-variant/40 pt-6">
                {[
                  { key: "1month", duration: language === "de" ? "1 Monat*" : "1 month*", price: "10.99 €", sub: "" },
                  { key: "3months", duration: language === "de" ? "3 Monate" : "3 months", price: "9.99 €", sub: language === "de" ? "/ Monat" : "/per mo", featured: true },
                  { key: "12months", duration: language === "de" ? "12 Monate" : "12 months", price: "7.99 €", sub: language === "de" ? "/ Monat" : "/per mo" },
                ].map(({ key, duration, price, sub, featured }, i) => (
                  <div
                    key={key}
                    onClick={() => setSelectedPremiumPlan(key as any)}
                    className={`p-4 rounded-xl border relative flex flex-col justify-between text-center bg-white cursor-pointer transition-all hover:shadow-md ${
                      selectedPremiumPlan === key ? "border-[#f07d00] ring-1 ring-[#f07d00]" : "border-outline-variant hover:border-on-surface-variant"
                    }`}
                  >
                    {featured && (
                      <span className="absolute top-0 left-1/2 -translate-y-1/2 -translate-x-1/2 bg-[#f07d00] text-white text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm whitespace-nowrap">
                        {language === "de" ? "Beliebt" : "Top Seller"}
                      </span>
                    )}
                    <span className="text-[12px] font-bold text-on-surface-variant block mb-2">{duration}</span>
                    <div>
                      <span className="text-[18px] font-bold text-primary block">{price}</span>
                      {sub && <span className="text-[10px] text-on-surface-variant/80 font-medium block mt-0.5">{sub}</span>}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-on-surface-variant/80 italic">
                {language === "de" ? "*ohne validiertes Bewerberportfolio" : "*without a validated application portfolio"}
              </p>

              {/* Premium Feature Checklist */}
              <div className="border-t border-outline-variant/40 pt-4 mt-4 space-y-3">
                <span className="text-[12px] font-bold text-primary uppercase tracking-wider block">
                  {language === "de" ? "Das ist enthalten:" : "What's included:"}
                </span>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[13px] text-on-surface-variant">
                  {[
                    { label: language === "de" ? "Direkter Chat mit Vermietern" : "Direct chat with landlords" },
                    { label: language === "de" ? "Verifiziertes Bewerberportfolio" : "Validated applicant portfolio" },
                    { label: language === "de" ? "Priorisierte Bewerber-Anfragen" : "Priority applicant requests" },
                    { label: language === "de" ? "Unbegrenzte Chat-Vorgänge" : "Unlimited chat sessions" },
                    { label: language === "de" ? "Escrow-Treuhandgarantie" : "Secure escrow guarantee" }
                  ].map(({ label }, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#f07d00] text-[16px]">verified</span>
                      <span>{label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <button
              onClick={() => router.push(`/preise?plan=${selectedPremiumPlan}`)}
              className="w-full bg-[#f07d00] text-white py-4 rounded-full font-bold text-label-md hover:opacity-90 active:scale-98 transition-all mt-8 cursor-pointer shadow-md shadow-[#f07d00]/20 text-center block"
            >
              {language === "de" ? "Premium-Vorteile sichern" : "Get Premium Membership"}
            </button>
          </div>
        </div>
      </section>

      {/* ── Testimonials ──────────────────────────────────── */}
      <section className="py-24 max-w-[1280px] mx-auto px-5 md:px-[48px] w-full">
        <h2 className="text-headline-lg-mobile md:text-headline-lg text-primary text-center mb-16">
          {t("testimonialsTitle")}
        </h2>

        {/* Carousel Viewport Container */}
        <div className="relative w-full overflow-hidden">
          {/* Track */}
          <div className="flex w-max animate-marquee-reviews pause-on-hover py-4">
            {[...getTestimonials(language, t), ...getTestimonials(language, t)].map(({ quote, name, role, initials }, idx) => (
              <div
                key={`${name}-${idx}`}
                className="w-[320px] md:w-[400px] flex-shrink-0 px-3 flex"
              >
                <div
                  className="bg-white p-8 rounded-xl shadow-md border border-outline-variant hover:shadow-xl transition-all duration-300 w-full flex flex-col justify-between"
                >
                  <div>
                    <div className="flex gap-0.5 mb-4">
                      {stars.map((_, i) => (
                        <span
                          key={i}
                          className="material-symbols-outlined text-secondary-fixed-dim text-[22px]"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          star
                        </span>
                      ))}
                    </div>
                    <p className="text-body-md text-on-surface italic mb-8">
                      &ldquo;{quote}&rdquo;
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center font-bold text-primary text-[14px] flex-shrink-0">
                      {initials}
                    </div>
                    <div>
                      <p className="text-label-md text-primary font-bold">{name}</p>
                      <p className="text-on-surface-variant text-[12px]">{role}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />

      {/* Mobile FAB */}
      <button
        id="fab-search"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-primary text-on-primary rounded-full shadow-2xl flex items-center justify-center z-50 active:scale-90 transition-transform cursor-pointer"
        aria-label="Suchen"
      >
        <span className="material-symbols-outlined text-[24px]">search</span>
      </button>
    </>
  );
}
