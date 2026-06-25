"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/utils/supabase/client";
import Link from "next/link";
import Footer from "@/components/layout/Footer";

function LandlordLoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect");
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  useEffect(() => {
    sessionStorage.setItem("auth_role", "landlord");
    const loginErrorRole = sessionStorage.getItem("login_error");
    if (loginErrorRole) {
      setErrorMsg(t("login_thisAccountIsRegisteredAsALogi"));
      sessionStorage.removeItem("login_error");
    }
  }, [t]);

  useEffect(() => {
    if (profile) {
      if (!profile.role) {
        const autoAssignRole = async () => {
          try {
            await supabase
              .from("profiles")
              .update({ role: "landlord" })
              .eq("id", profile.id);
            await supabase
              .from("landlord_profiles")
              .upsert({ user_id: profile.id }, { onConflict: "user_id" });
            sessionStorage.removeItem("auth_role");
            window.location.reload();
          } catch (err) {
            console.error("Auto assigning role failed:", err);
            const selectRoleUrl = redirectUrl 
              ? `/auth/select-role?redirect=${encodeURIComponent(redirectUrl)}`
              : "/auth/select-role";
            router.push(selectRoleUrl);
          }
        };
        autoAssignRole();
      } else {
        if (profile.role !== "landlord") {
          const handleMismatch = async () => {
            await supabase.auth.signOut();
            setErrorMsg(t("login_thisAccountIsRegisteredAsAProf"));
          };
          handleMismatch();
          return;
        }
        const destination = redirectUrl || "/dashboard/landlord";
        router.push(destination);
      }
    }
  }, [profile, router, redirectUrl, t]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash) {
      if (window.location.hash.includes("access_token")) {
        router.replace(`/auth/callback${window.location.hash}`);
      }
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setLoadingSubmit(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user?.id)
        .single();

      if (profileData) {
        if (!profileData.role) {
          try {
            await supabase
              .from("profiles")
              .update({ role: "landlord" })
              .eq("id", data.user?.id);
            await supabase
              .from("landlord_profiles")
              .upsert({ user_id: data.user?.id }, { onConflict: "user_id" });
            sessionStorage.removeItem("auth_role");
            router.push(redirectUrl || "/dashboard/landlord");
            return;
          } catch (err) {
            console.error("Auto assigning role failed:", err);
          }
          const selectRoleUrl = redirectUrl 
            ? `/auth/select-role?redirect=${encodeURIComponent(redirectUrl)}`
            : "/auth/select-role";
          router.push(selectRoleUrl);
        } else {
          if (profileData.role !== "landlord") {
            await supabase.auth.signOut();
            setErrorMsg(t("login_thisAccountIsRegisteredAsAProf"));
            return;
          }
          router.push(redirectUrl || "/dashboard/landlord");
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred");
    } finally {
      setLoadingSubmit(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred during Google sign-in");
    }
  };

  const handleForgotPassword = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg(t("login_pleaseEnterYourEmailAddressInT"));
      return;
    }
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const isConfigured =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://mock-project.supabase.co";

      if (!isConfigured) {
        setSuccessMsg(t("login_mockModePasswordResetEmailSent"));
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback`,
      });

      if (error) throw error;
      setSuccessMsg(t("login_passwordResetEmailHasBeenSent"));
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to send password reset email.");
    }
  };

  const registerLink = redirectUrl 
    ? `/auth/register/landlord?redirect=${encodeURIComponent(redirectUrl)}`
    : "/auth/register/landlord";

  return (
    <>
      <div className="flex-grow flex items-center justify-center py-16 px-5 bg-gradient-to-br from-[#0c1b2b] via-[#002046] to-[#0a192f]">
        <div className="w-full max-w-md bg-white border border-[#005fb8]/20 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
          {/* Subtle design element */}
          <div className="absolute top-0 left-0 w-full h-[6px] bg-gradient-to-r from-[#005fb8] to-[#00a2ff]" />
          
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-[#002046]/10 text-[#002046] border border-[#002046]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-[32px]">real_estate_agent</span>
            </div>
            <span className="inline-block px-3 py-1 rounded-full text-[10px] font-extrabold bg-[#002046]/5 text-[#002046] uppercase tracking-wider mb-2">
              {language === "de" ? "Vermieter Portal" : "Landlord Portal"}
            </span>
            <h1 className="text-[24px] md:text-[26px] text-[#002046] font-black tracking-tight leading-none mb-2">
              {t("loginLandlordTitle")}
            </h1>
            <p className="text-on-surface-variant text-[14px]">
              {t("loginLandlordSubtitle")}
            </p>
          </div>

          {errorMsg && (
            <div className="p-4 mb-6 text-[13px] text-error bg-error-container/30 border border-error/20 rounded-xl flex items-start gap-2">
              <span className="material-symbols-outlined text-[18px] flex-shrink-0 mt-0.5">warning</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-4 mb-6 text-[13px] text-primary bg-primary-fixed/30 border border-primary/20 rounded-xl flex items-start gap-2">
              <span className="material-symbols-outlined text-[18px] flex-shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-label-md text-on-surface font-semibold">
                {t("emailLabel")}
              </label>
              <input
                id="login-email"
                type="email"
                required
                placeholder="beispiel@domain.de"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 px-4 bg-surface border border-outline-variant rounded-xl focus:ring-2 focus:ring-[#002046] focus:border-transparent outline-none transition-all text-[15px]"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-label-md text-on-surface font-semibold">
                  {t("passwordLabel")}
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-[12px] text-[#005fb8] hover:underline font-semibold bg-transparent border-none p-0 cursor-pointer outline-none focus:outline-none"
                >
                  {t("login_forgotPassword")}
                </button>
              </div>
              <input
                id="login-password"
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 px-4 bg-surface border border-outline-variant rounded-xl focus:ring-2 focus:ring-[#002046] focus:border-transparent outline-none transition-all text-[15px]"
              />
            </div>

            <button
              id="btn-login-submit"
              type="submit"
              disabled={loadingSubmit}
              className="w-full h-11 bg-[#002046] text-white rounded-xl font-bold hover:bg-[#0c2e55] active:scale-98 transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 text-[14px]"
            >
              {loadingSubmit && (
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              )}
              {t("login")}
            </button>
          </form>

          {/* Social Logins */}
          <div className="mt-6 pt-5 border-t border-outline-variant/60">
            <p className="text-center text-[11px] text-on-surface-variant font-bold mb-3.5 uppercase tracking-wider">
              {t("login_orContinueWith")}
            </p>
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 h-11 border border-outline-variant rounded-xl hover:bg-surface-container-low transition-colors cursor-pointer text-label-sm font-semibold"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.57 15.02 1 12 1 7.24 1 3.21 3.73 1.24 7.72l3.87 3a7.16 7.16 0 0 1 6.89-5.68z" />
                <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46a5.5 5.5 0 0 1-2.4 3.6l3.73 2.9c2.18-2 3.7-5.07 3.7-8.65z" />
                <path fill="#FBBC05" d="M5.11 14.78a7.12 7.12 0 0 1 0-4.56L1.24 7.22a11.96 11.96 0 0 0 0 9.56l3.87-3z" />
                <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.9l-3.73-2.9a7.12 7.12 0 0 1-10.9-4.42l-3.87 3A11.96 11.96 0 0 0 12 23z" />
              </svg>
              <span>{t("login_continueWithGoogle")}</span>
            </button>
          </div>

          <div className="mt-6 text-center text-[13px]">
            <Link
              href={registerLink}
              className="text-[#005fb8] font-bold hover:underline"
            >
              {language === "de" ? "Als Vermieter registrieren" : "Register as Landlord"}
            </Link>
            <div className="mt-2 text-[11px] text-on-surface-variant/80">
              {language === "de" ? "Sie sind Mieter?" : "Are you a tenant?"}{" "}
              <Link href="/auth/login/tenant" className="text-[#005fb8] font-bold hover:underline">
                {language === "de" ? "Zum Mieter-Login" : "Go to Tenant Login"}
              </Link>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

export default function LandlordLoginPage() {
  return (
    <Suspense fallback={
      <div className="flex-grow flex items-center justify-center min-h-[600px] bg-[#f0f4f8]">
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-[3px] border-[#002046]/15 border-t-[#002046] animate-spin" />
          <div className="absolute w-10 h-10 rounded-full border-[3px] border-[#aec7f7]/20 border-b-[#aec7f7] animate-spin [animation-direction:reverse] [animation-duration:1s]" />
        </div>
      </div>
    }>
      <LandlordLoginPageContent />
    </Suspense>
  );
}
