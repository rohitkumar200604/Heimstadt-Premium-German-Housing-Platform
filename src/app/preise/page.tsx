"use client";

import { useState, useEffect, Suspense } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useCurrency } from "@/context/CurrencyContext";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Footer from "@/components/layout/Footer";

function PreisePageContent() {
  const { t, language } = useLanguage();
  const { formatPrice } = useCurrency();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, profile, upgradeUser } = useAuth();
  const [selectedDuration, setSelectedDuration] = useState<"1month" | "3months" | "12months">("3months");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const planParam = searchParams.get("plan");
    if (planParam === "1month" || planParam === "3months" || planParam === "12months") {
      setSelectedDuration(planParam);
    }
  }, [searchParams]);

  const selectPlan = (plan: "1month" | "3months" | "12months") => {
    setSelectedDuration(plan);
    const params = new URLSearchParams(window.location.search);
    params.set("plan", plan);
    router.replace(`/preise?${params.toString()}`, { scroll: false });
  };

  const handlePayment = async () => {
    if (!user) {
      (alert as any)(
        t("loginForPremium"),
        () => {
          router.push(`/auth/login?redirect=${encodeURIComponent(`/preise?plan=${selectedDuration}`)}`);
        }
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await upgradeUser(selectedDuration);
      setTimeout(() => {
        setIsSubmitting(false);
        (alert as any)(
          `${t("premiumUpgradeSuccess")} (${
            selectedDuration === "1month" ? t("billing1Month").replace('*', '') : selectedDuration === "3months" ? t("billing3Months") : t("billing12Months")
          }).`,
          () => {
            if (profile?.role === "landlord") {
              router.push("/dashboard/landlord");
            } else {
              router.push("/dashboard/tenant");
            }
          }
        );
      }, 1500);
    } catch (err) {
      setIsSubmitting(false);
      alert(t("upgradeError"));
    }
  };

  return (
    <>
      <main className="flex-grow py-12 px-4 max-w-[1200px] mx-auto w-full space-y-10">
        {/* Title */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <h1 className="text-headline-lg font-bold text-primary">
            {t("chooseMembership")}
          </h1>
          <p className="text-on-surface-variant text-body-md">
            {t("chooseMembershipDesc")}
          </p>
        </div>

        {/* Plan container */}
        {profile?.role === "landlord" ? (
          /* Gorgeous Landlord Info Banner */
          <div className="bg-surface-container-lowest border-2 border-primary rounded-3xl p-8 md:p-12 shadow-xl relative overflow-hidden bg-gradient-to-br from-white via-primary/5 to-primary/10 max-w-[800px] mx-auto text-center space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-500">
            {/* Background decorative gradient glow */}
            <div className="absolute top-[-20%] left-[-20%] w-[300px] h-[300px] bg-primary/10 rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-20%] w-[300px] h-[300px] bg-secondary/15 rounded-full blur-[80px] pointer-events-none" />

            <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 border border-primary/20 rounded-full text-primary shadow-sm mx-auto">
              <span className="material-symbols-outlined text-[40px] animate-pulse">workspace_premium</span>
            </div>

            <div className="space-y-4 relative z-10">
              <h2 className="text-headline-md font-bold text-primary">
                {t("premiumLandlordTitle")}
              </h2>
              <p className="text-on-surface-variant text-body-md max-w-xl mx-auto leading-relaxed">
                {t("premiumLandlordDesc")}
              </p>
            </div>

            {/* Premium features list */}
            <div className="bg-white/60 backdrop-blur-sm border border-outline-variant/60 rounded-2xl p-6 md:p-8 max-w-lg mx-auto relative z-10 shadow-sm text-left">
              <h3 className="font-bold text-[16px] text-primary mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">verified</span>
                {t("activePremiumFeatures")}
              </h3>
              <ul className="space-y-3.5 text-left text-[15px] text-on-surface-variant">
                {[
                  { label: t("limitlessListings") },
                  { label: t("accessApplicantPortfolios") },
                  { label: t("whatsappNotifications") },
                  { label: t("directChatApplicants") }
                ].map(({ label }, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-primary text-[20px] select-none mt-0.5">check_circle</span>
                    <span>{label}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => router.push("/dashboard/landlord")}
              className="bg-primary text-on-primary px-8 py-4 rounded-full font-bold text-[16px] hover:opacity-90 active:scale-98 transition-all shadow-lg shadow-primary/20 cursor-pointer relative z-10 inline-flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">space_dashboard</span>
              {t("goLandlordDashboard")}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* ── Column 1: Free Tier (5 cols) ────────────────────── */}
            <div className="lg:col-span-5 bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 md:p-8 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
              <div className="space-y-6">
                <div>
                  <span className="text-[12px] text-on-surface-variant font-bold uppercase tracking-wider bg-surface-container-high px-3 py-1 rounded-full">
                    {t("freeTier")}
                  </span>
                  <div className="flex items-baseline gap-1 mt-4">
                    <span className="text-[36px] font-bold text-primary">{formatPrice(0)}</span>
                    <span className="text-on-surface-variant text-[14px]">/ {t("perMonthLabel")}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-[16px] text-on-surface">
                    {t("standardSearchBasicInfo")}
                  </h3>
                  <p className="text-[14px] text-on-surface-variant">
                    {t("standardSearchDesc")}
                  </p>
                </div>

                <ul className="space-y-4 text-[14px] text-on-surface-variant border-t border-outline-variant/50 pt-6">
                  {[
                    { label: t("freeBrowse"), check: true },
                    { label: t("standardApplicant"), check: true },
                    { label: t("directChat"), check: false },
                    { label: t("priorityRequests"), check: false },
                    { label: t("validatedPortfolio"), check: false },
                  ].map(({ label, check }, i) => (
                    <li key={i} className={`flex items-center gap-3 ${!check ? "text-outline-variant line-through" : ""}`}>
                      <span className={`material-symbols-outlined text-[20px] ${check ? "text-[#137333]" : "text-outline-variant"}`}>
                        {check ? "check_circle" : "cancel"}
                      </span>
                      <span>{label}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button className="w-full border-2 border-primary text-primary py-3.5 rounded-xl font-bold hover:bg-primary/5 active:scale-98 transition-all mt-8 cursor-pointer text-center text-label-md">
                {t("startFree")}
              </button>
            </div>

            {/* ── Column 2: Premium Tier (7 cols) ─────────────────── */}
            <div className="lg:col-span-7 bg-surface-container-lowest border-2 border-[#f07d00] rounded-2xl p-6 md:p-8 flex flex-col justify-between shadow-lg relative bg-gradient-to-b from-white to-[#f07d00]/5">
              <div>
                {/* Stepper progress */}
                <div className="w-full mb-8">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[14px] font-bold text-[#f07d00]">{t("stepReview")}</span>
                    <span className="text-[12px] font-bold text-on-surface-variant/80">45% {t("completed")}</span>
                  </div>
                  {/* Progress bar line */}
                  <div className="w-full h-3 bg-surface-container-high rounded-full overflow-hidden">
                    <div className="h-full bg-[#f07d00] rounded-full transition-all duration-500 w-[45%]" />
                  </div>
                </div>

                {/* Price selector display (reproducing image UI) */}
                <div className="space-y-4 mb-8">
                  {/* 1 Month Option */}
                  <div 
                    onClick={() => selectPlan("1month")}
                    className={`relative border-2 rounded-2xl p-6 cursor-pointer flex items-center justify-between transition-all hover:shadow-md ${
                      selectedDuration === "1month" 
                        ? "border-[#f07d00] bg-[#f07d00]/5 shadow shadow-[#f07d00]/10 scale-[1.01]" 
                        : "border-outline-variant hover:border-on-surface-variant bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        selectedDuration === "1month" ? "border-[#f07d00]" : "border-outline"
                      }`}>
                        {selectedDuration === "1month" && <div className="w-2.5 h-2.5 rounded-full bg-[#f07d00]" />}
                      </div>
                      <span className="text-[18px] font-bold text-on-surface">{t("billing1Month")}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[20px] font-bold text-on-surface">{formatPrice(10.99)}</span>
                    </div>
                  </div>

                  {/* 3 Months Option (Best Seller) */}
                  <div 
                    onClick={() => selectPlan("3months")}
                    className={`relative border-2 rounded-2xl p-6 cursor-pointer flex items-center justify-between transition-all hover:shadow-md ${
                      selectedDuration === "3months" 
                        ? "border-[#f07d00] bg-[#f07d00]/5 shadow shadow-[#f07d00]/10 scale-[1.01]" 
                        : "border-outline-variant hover:border-on-surface-variant bg-white"
                    }`}
                  >
                    {/* Badge top-right */}
                    <div className="absolute top-0 right-6 -translate-y-1/2 bg-[#f07d00] text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-sm">
                      {t("topSellers")}
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        selectedDuration === "3months" ? "border-[#f07d00]" : "border-outline"
                      }`}>
                        {selectedDuration === "3months" && <div className="w-2.5 h-2.5 rounded-full bg-[#f07d00]" />}
                      </div>
                      <span className="text-[18px] font-bold text-on-surface">{t("billing3Months")}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-[20px] font-bold text-on-surface">{formatPrice(9.99)}</div>
                      <div className="text-[12px] text-on-surface-variant font-medium mt-0.5">{t("perMonth")}</div>
                    </div>
                  </div>

                  {/* 12 Months Option */}
                  <div 
                    onClick={() => selectPlan("12months")}
                    className={`relative border-2 rounded-2xl p-6 cursor-pointer flex items-center justify-between transition-all hover:shadow-md ${
                      selectedDuration === "12months" 
                        ? "border-[#f07d00] bg-[#f07d00]/5 shadow shadow-[#f07d00]/10 scale-[1.01]" 
                        : "border-outline-variant hover:border-on-surface-variant bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        selectedDuration === "12months" ? "border-[#f07d00]" : "border-outline"
                      }`}>
                        {selectedDuration === "12months" && <div className="w-2.5 h-2.5 rounded-full bg-[#f07d00]" />}
                      </div>
                      <span className="text-[18px] font-bold text-on-surface">{t("billing12Months")}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-[20px] font-bold text-on-surface">{formatPrice(7.99)}</div>
                      <div className="text-[12px] text-on-surface-variant font-medium mt-0.5">{t("perMonth")}</div>
                    </div>
                  </div>

                  {/* Disclaimer */}
                  <p className="text-[13px] text-on-surface-variant/80 italic mt-2">
                    {t("pricingDisclaimer")}
                  </p>
                </div>

                {/* Premium Features List */}
                <div className="border-t border-outline-variant/60 pt-6 space-y-4">
                  <h4 className="font-bold text-[15px] text-on-surface">
                    {t("premiumBenefitsOverview")}
                  </h4>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[14px] text-on-surface-variant">
                    {[
                      { label: t("directChat") },
                      { label: t("validatedPortfolio") },
                      { label: t("priorityRequests") },
                      { label: t("unlimitedChat") },
                      { label: t("escrowGuarantee") }
                    ].map(({ label }, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#f07d00] text-[18px]">verified</span>
                        <span>{label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Checkout action */}
              <button
                onClick={handlePayment}
                disabled={isSubmitting}
                className="w-full bg-[#f07d00] text-white py-4 rounded-full font-bold text-[18px] hover:opacity-90 active:scale-98 transition-all mt-8 cursor-pointer shadow-md shadow-[#f07d00]/25 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                ) : (
                  t("continueToPayment")
                )}
              </button>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

export default function PreisePage() {
  return (
    <Suspense fallback={
      <div className="flex-grow flex flex-col items-center justify-center min-h-[600px] bg-[#f8f9ff]">
        <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-500">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-[3px] border-[#002046]/15 border-t-[#002046] animate-spin" />
            <div className="absolute w-10 h-10 rounded-full border-[3px] border-[#aec7f7]/20 border-b-[#aec7f7] animate-spin [animation-direction:reverse] [animation-duration:1s]" />
            <div className="absolute w-12 h-12 bg-[#002046]/5 rounded-full blur-md animate-pulse" />
          </div>
          <div className="text-center space-y-1.5">
            <p className="text-[15px] text-[#002046] font-extrabold uppercase tracking-[0.25em] animate-pulse font-sans">
              Heimstadt
            </p>
            <p className="text-[9px] text-[#002046]/60 uppercase tracking-[0.3em] font-bold font-sans">
              Exklusive Wohnungen
            </p>
          </div>
        </div>
      </div>
    }>
      <PreisePageContent />
    </Suspense>
  );
}
