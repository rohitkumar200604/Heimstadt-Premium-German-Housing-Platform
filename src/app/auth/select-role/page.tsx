"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/utils/supabase/client";
import Footer from "@/components/layout/Footer";

function SelectRolePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect");
  const { user, profile, loading, refreshProfile } = useAuth();
  const { language, t } = useLanguage();

  const [selectedRole, setSelectedRole] = useState<"tenant" | "landlord" | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  // If user is already loaded and has a role, redirect them to their dashboard immediately
  useEffect(() => {
    if (!loading) {
      if (!user) {
        const loginUrl = redirectUrl 
          ? `/auth/login?redirect=${encodeURIComponent(redirectUrl)}`
          : "/auth/login";
        router.push(loginUrl);
      } else if (profile && profile.role) {
        const defaultUrl = profile.role === "landlord" ? "/dashboard/landlord" : "/dashboard/tenant";
        const destination = redirectUrl || defaultUrl;
        router.push(destination);
      } else if (user) {
        const cachedRole = (typeof window !== "undefined" ? sessionStorage.getItem("auth_role") : null) as "tenant" | "landlord" | null;
        if (cachedRole) {
          const autoAssign = async () => {
            try {
              const fullName = user.user_metadata?.full_name || user.user_metadata?.name || "";
              await supabase
                .from("profiles")
                .upsert({
                  id: user.id,
                  email: user.email,
                  full_name: fullName,
                  role: cachedRole
                }, { onConflict: "id" });
              if (cachedRole === "landlord") {
                await supabase.from("landlord_profiles").upsert({ user_id: user.id }, { onConflict: "user_id" });
              } else {
                await supabase.from("tenant_profiles").upsert({ user_id: user.id }, { onConflict: "user_id" });
              }
              sessionStorage.removeItem("auth_role");
              await refreshProfile();
              const defaultUrl = cachedRole === "landlord" ? "/dashboard/landlord" : "/dashboard/tenant";
              const destination = redirectUrl || defaultUrl;
              router.push(destination);
            } catch (err) {
              console.error("Auto assignment on select-role failed:", err);
            }
          };
          autoAssign();
        }
      }
    }
  }, [user, profile, loading, router, redirectUrl, refreshProfile]);

  const handleRoleSelectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) {
      setErrorMsg(
        t("selectRole_pleaseSelectARoleToContinue")
      );
      return;
    }

    setErrorMsg("");
    setSuccessMsg("");
    setLoadingSubmit(true);

    try {
      if (!user) throw new Error("No authenticated session found");

      // 1. Upsert Core Profile role to ensure the profile exists and has the selected role set
      const fullName = user.user_metadata?.full_name || user.user_metadata?.name || "";
      const { error: profileErr } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          email: user.email,
          full_name: fullName,
          role: selectedRole
        }, { onConflict: "id" });
      
      if (profileErr) throw profileErr;

      // 2. Initialize role-specific profile in the database
      if (selectedRole === "landlord") {
        const { error: lpErr } = await supabase
          .from("landlord_profiles")
          .upsert({ user_id: user.id }, { onConflict: "user_id" });
        if (lpErr) throw lpErr;
      } else {
        const { error: tpErr } = await supabase
          .from("tenant_profiles")
          .upsert({ user_id: user.id }, { onConflict: "user_id" });
        if (tpErr) throw tpErr;
      }

      setSuccessMsg(
        t("selectRole_setupCompletedRedirecting")
      );

      // Refresh authentication profile state in context
      await refreshProfile();

      // Redirect role specifically after a short pause
      setTimeout(() => {
        const defaultUrl = selectedRole === "landlord" ? "/dashboard/landlord" : "/dashboard/tenant";
        const destination = redirectUrl || defaultUrl;
        router.push(destination);
      }, 1500);

    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred during onboarding");
    } finally {
      setLoadingSubmit(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[600px] bg-[#f8f9ff]">
        {/* Premium Navy Blue & Light Blue Dual-Ring Spinner */}
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-[3px] border-[#002046]/15 border-t-[#002046] animate-spin" />
          <div className="absolute w-10 h-10 rounded-full border-[3px] border-[#aec7f7]/20 border-b-[#aec7f7] animate-spin [animation-direction:reverse] [animation-duration:1s]" />
          <div className="absolute w-12 h-12 bg-[#002046]/5 rounded-full blur-md animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex-grow flex items-center justify-center py-16 px-5 bg-gradient-to-br from-surface-container-low via-background to-surface-container">
        <div className="w-full max-w-2xl bg-white/90 backdrop-blur-md border border-outline-variant p-8 md:p-12 rounded-3xl shadow-xl text-center">
          <div className="mb-10">
            <span className="bg-primary/10 text-primary border border-primary/20 px-4 py-1.5 rounded-full text-[12px] font-bold uppercase tracking-wider">
              Onboarding
            </span>
            <h1 className="text-display-lg-mobile md:text-headline-lg font-bold text-primary mt-4">
              {t("selectRole_selectYourRole")}
            </h1>
            <p className="text-on-surface-variant text-body-md mt-2 max-w-md mx-auto">
              {t("selectRole_toFinalizeYourRegistrationPlea")}
            </p>
          </div>

          {errorMsg && (
            <div className="p-4 mb-6 text-[14px] text-error bg-error-container/30 border border-error/20 rounded-xl flex items-center gap-2 text-left">
              <span className="material-symbols-outlined text-[20px]">warning</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-4 mb-6 text-[14px] text-primary bg-primary-fixed/30 border border-primary/20 rounded-xl flex items-center gap-2 text-left">
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleRoleSelectionSubmit} className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Tenant selection card */}
              <button
                type="button"
                onClick={() => setSelectedRole("tenant")}
                className={`border-2 rounded-2xl p-6 flex flex-col items-center gap-4 text-center cursor-pointer transition-all ${
                  selectedRole === "tenant"
                    ? "border-primary bg-primary-fixed/15 shadow-md scale-[1.02]"
                    : "border-outline-variant hover:border-primary/50 bg-surface-container-low hover:shadow"
                }`}
              >
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center border shadow-sm ${
                  selectedRole === "tenant" ? "bg-primary text-on-primary border-primary" : "bg-white text-primary border-outline-variant"
                }`}>
                  <span className="material-symbols-outlined text-[32px]">directions_walk</span>
                </div>
                <div>
                  <h3 className="text-headline-md font-bold text-primary">
                    {t("selectRole_iAmATenant")}
                  </h3>
                  <p className="text-[12px] text-on-surface-variant leading-relaxed mt-2">
                    {t("selectRole_iAmSearchingForAPremiumFlatToR")}
                  </p>
                </div>
              </button>

              {/* Landlord selection card */}
              <button
                type="button"
                onClick={() => setSelectedRole("landlord")}
                className={`border-2 rounded-2xl p-6 flex flex-col items-center gap-4 text-center cursor-pointer transition-all ${
                  selectedRole === "landlord"
                    ? "border-primary bg-primary-fixed/15 shadow-md scale-[1.02]"
                    : "border-outline-variant hover:border-primary/50 bg-surface-container-low hover:shadow"
                }`}
              >
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center border shadow-sm ${
                  selectedRole === "landlord" ? "bg-primary text-on-primary border-primary" : "bg-white text-primary border-outline-variant"
                }`}>
                  <span className="material-symbols-outlined text-[32px]">real_estate_agent</span>
                </div>
                <div>
                  <h3 className="text-headline-md font-bold text-primary">
                    {t("selectRole_iAmALandlord")}
                  </h3>
                  <p className="text-[12px] text-on-surface-variant leading-relaxed mt-2">
                    {t("selectRole_iWantToListMyRealEstatePropert")}
                  </p>
                </div>
              </button>
            </div>

            <button
              type="submit"
              disabled={loadingSubmit || !selectedRole}
              className="w-full h-12 bg-primary text-on-primary rounded-xl font-bold hover:opacity-90 active:scale-95 transition-all shadow-md mt-6 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loadingSubmit && (
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              )}
              <span>{t("selectRole_completeRegistration")}</span>
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </button>
          </form>
        </div>
      </div>
      <Footer />
    </>
  );
}

export default function SelectRolePage() {
  return (
    <Suspense fallback={
      <div className="flex-grow flex items-center justify-center min-h-[600px] bg-[#f8f9ff]">
        {/* Premium Navy Blue & Light Blue Dual-Ring Spinner */}
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-[3px] border-[#002046]/15 border-t-[#002046] animate-spin" />
          <div className="absolute w-10 h-10 rounded-full border-[3px] border-[#aec7f7]/20 border-b-[#aec7f7] animate-spin [animation-direction:reverse] [animation-duration:1s]" />
          <div className="absolute w-12 h-12 bg-[#002046]/5 rounded-full blur-md animate-pulse" />
        </div>
      </div>
    }>
      <SelectRolePageContent />
    </Suspense>
  );
}
