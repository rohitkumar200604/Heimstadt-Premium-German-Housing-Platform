"use client";

import { useState, useEffect, Suspense } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/utils/supabase/client";
import Link from "next/link";
import Footer from "@/components/layout/Footer";

function LandlordRegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect");
  const { t, language } = useLanguage();
  
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [isRegistered, setIsRegistered] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  useEffect(() => {
    sessionStorage.setItem("auth_role", "landlord");
  }, []);

  // Self-healing: Detect Google OAuth hash redirect landing on register page and route to Auth Callback
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

    // Frontend validations
    if (!form.name.trim()) {
      setErrorMsg(t("register_pleaseEnterYourFullName"));
      setLoadingSubmit(false);
      return;
    }
    if (!form.email.trim() || !form.email.includes("@")) {
      setErrorMsg(t("register_pleaseEnterAValidEmailAddress"));
      setLoadingSubmit(false);
      return;
    }

    if (form.password.length < 6) {
      setErrorMsg(t("register_passwordMustBeAtLeast6Characte"));
      setLoadingSubmit(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            full_name: form.name,
            phone: "",
            role: "landlord",
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        }
      });

      if (error) throw error;
      
      if (!data.user) {
        throw new Error(t("register_registrationFailedPleaseCheckY"));
      }

      setShowVerificationModal(true);

    } catch (err: any) {
      const errMsg = err.message || "";
      const errCode = err.code || "";

      if (errCode === "weak_password" || errMsg.toLowerCase().includes("password")) {
        setErrorMsg(t("register_thePasswordIsTooWeakItMustBeAt"));
      } else if (errCode === "email_taken" || errMsg.toLowerCase().includes("already registered") || errMsg.toLowerCase().includes("already exists")) {
        setErrorMsg(t("register_thisEmailAddressIsAlreadyInUse"));
      } else if (errCode === "invalid_email" || errMsg.toLowerCase().includes("email")) {
        setErrorMsg(t("register_pleaseEnterAValidEmailAddress"));
      } else if (errMsg.toLowerCase().includes("rate limit") || errMsg.toLowerCase().includes("once every 60 seconds") || errCode === "over_email_send_rate_limit") {
        setErrorMsg(t("register_signupRateLimitExceededPleaseT"));
      } else {
        setErrorMsg(t("register_registrationFailedErrmsg"));
      }
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

  const loginLink = redirectUrl 
    ? `/auth/login/landlord?redirect=${encodeURIComponent(redirectUrl)}`
    : "/auth/login/landlord";

  if (isRegistered) {
    return (
      <>
        <div className="flex-grow flex items-center justify-center py-16 px-5 bg-gradient-to-br from-surface-container-low via-background to-surface-container">
          <div className="w-full max-w-lg bg-white/90 backdrop-blur-md border-2 border-primary p-10 rounded-2xl shadow-xl text-center">
            <div className="w-20 h-20 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse">
              <span className="material-symbols-outlined text-[48px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                mail
              </span>
            </div>
            
            <h1 className="text-headline-lg text-primary font-bold mb-4">
              {t("register_verifyYourEmail")}
            </h1>
            
            <p className="text-on-surface text-body-lg mb-6 leading-relaxed">
              {t("register_weHaveSentAVerificationEmailTo")}
              <strong className="text-primary">{form.email}</strong>
              {t("register_AsConfirmationPleaseClickTheLi")}
            </p>
            
            <div className="p-5 mb-8 text-[14px] text-on-surface-variant bg-surface-container-low border border-outline-variant rounded-xl flex items-start gap-3 text-left">
              <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">info</span>
              <div>
                <p className="font-semibold text-primary mb-1">
                  {t("register_whatHappensNext")}
                </p>
                <p className="leading-relaxed text-[13px]">
                  {t("register_onceYouHaveVerifiedYourEmailYo")}
                </p>
              </div>
            </div>
            
            <Link
              href={loginLink}
              className="inline-flex items-center justify-center w-full h-12 bg-primary text-on-primary rounded-xl font-bold hover:opacity-90 active:scale-95 transition-all shadow-md gap-2"
            >
              <span>{t("register_goToLogin")}</span>
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </Link>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <div className="flex-grow flex items-center justify-center py-16 px-5 bg-gradient-to-br from-surface-container-low via-background to-surface-container">
        <div className="w-full max-w-lg bg-white/90 backdrop-blur-md border-2 border-primary p-8 rounded-2xl shadow-xl">
          <div className="text-center mb-8">
            <h1 className="text-headline-lg text-primary font-bold mb-2">
              {t("registerLandlordTitle")}
            </h1>
            <p className="text-on-surface-variant text-body-md">
              {t("registerLandlordSubtitle")}
            </p>
          </div>

          {errorMsg && (
            <div className="p-4 mb-6 text-[14px] text-error bg-error-container/30 border border-error/20 rounded-xl flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">warning</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-4 mb-6 text-[14px] text-primary bg-primary-fixed/30 border border-primary/20 rounded-xl flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="block text-label-md text-on-surface font-semibold">
                  {t("fullNameLabel")}
                </label>
                <input
                  id="reg-name"
                  type="text"
                  required
                  placeholder="Max Mustermann"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full h-12 px-4 bg-surface-container-low border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-[16px]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-label-md text-on-surface font-semibold">
                  {t("emailLabel")}
                </label>
                <input
                  id="reg-email"
                  type="email"
                  required
                  placeholder="max@mustermann.de"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full h-12 px-4 bg-surface-container-low border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-[16px]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-label-md text-on-surface font-semibold">
                  {t("passwordLabel")}
                </label>
                <input
                  id="reg-password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full h-12 px-4 bg-surface-container-low border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-[16px]"
                />
              </div>
            </div>

            <button
              id="btn-register-submit"
              type="submit"
              disabled={loadingSubmit}
              className="w-full h-12 bg-primary text-on-primary rounded-xl font-bold hover:opacity-90 active:scale-95 transition-all shadow-md mt-6 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loadingSubmit && (
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              )}
              {t("register")}
            </button>
          </form>

          {/* Social Logins */}
          <div className="mt-8 pt-6 border-t border-outline-variant">
            <p className="text-center text-[12px] text-on-surface-variant font-semibold mb-4 uppercase tracking-wider">
              {t("register_orContinueWith")}
            </p>
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 h-12 border border-outline-variant rounded-xl hover:bg-surface-container-low transition-colors cursor-pointer text-label-md font-semibold"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.57 15.02 1 12 1 7.24 1 3.21 3.73 1.24 7.72l3.87 3a7.16 7.16 0 0 1 6.89-5.68z" />
                <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46a5.5 5.5 0 0 1-2.4 3.6l3.73 2.9c2.18-2 3.7-5.07 3.7-8.65z" />
                <path fill="#FBBC05" d="M5.11 14.78a7.12 7.12 0 0 1 0-4.56L1.24 7.22a11.96 11.96 0 0 0 0 9.56l3.87-3z" />
                <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.9l-3.73-2.9a7.12 7.12 0 0 1-10.9-4.42l-3.87 3A11.96 11.96 0 0 0 12 23z" />
              </svg>
              <span>{t("register_continueWithGoogle")}</span>
            </button>
          </div>

          <div className="mt-8 text-center text-body-md">
            <Link
              href={loginLink}
              className="text-primary font-bold hover:underline"
            >
              {t("alreadyHaveAccount")}
            </Link>
          </div>
        </div>
      </div>

      {/* Verification instructions modal */}
      {showVerificationModal && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-[#002046]/50 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
          onClick={(e) => { if (e.target === e.currentTarget) { setShowVerificationModal(false); setIsRegistered(true); } }}
        >
          <div className="flex min-h-full items-center justify-center p-4 py-8">
            <div className="w-full max-w-md bg-white border border-outline-variant p-6 sm:p-8 rounded-3xl shadow-2xl text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#f07d00]/10 border border-[#f07d00]/20 rounded-full flex items-center justify-center mx-auto mb-5">
                <span className="material-symbols-outlined text-[28px] sm:text-[36px] text-[#f07d00]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  mark_email_unread
                </span>
              </div>
              <h2 className="text-[20px] sm:text-headline-md font-bold text-primary mb-3 leading-snug">
                {t("register_activationRequired")}
              </h2>
              <p className="text-on-surface-variant text-[13px] sm:text-[14px] leading-relaxed mb-4">
                {t("register_inOrderToAccessYourProfileAndD")}
              </p>
              <div className="flex items-center justify-center gap-2 bg-surface-container-low border border-outline-variant rounded-xl px-4 py-3 mb-6 text-[13px]">
                <span className="material-symbols-outlined text-primary text-[16px]">mail</span>
                <span className="text-on-surface font-semibold break-all">{form.email}</span>
              </div>
              <button
                onClick={() => {
                  setShowVerificationModal(false);
                  setIsRegistered(true);
                }}
                className="w-full h-12 bg-primary text-on-primary rounded-xl font-bold hover:opacity-90 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{t("register_checkEmailInbox")}</span>
                <span className="material-symbols-outlined text-[18px]">open_in_new</span>
              </button>
              <button
                onClick={() => { setShowVerificationModal(false); setIsRegistered(true); }}
                className="mt-4 text-[12px] text-on-surface-variant hover:text-primary transition-colors cursor-pointer underline underline-offset-2"
              >
                {t("register_dismiss")}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}

export default function LandlordRegisterPage() {
  return (
    <Suspense fallback={
      <div className="flex-grow flex items-center justify-center min-h-[600px] bg-[#f8f9ff]">
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-[3px] border-[#002046]/15 border-t-[#002046] animate-spin" />
          <div className="absolute w-10 h-10 rounded-full border-[3px] border-[#aec7f7]/20 border-b-[#aec7f7] animate-spin [animation-direction:reverse] [animation-duration:1s]" />
          <div className="absolute w-12 h-12 bg-[#002046]/5 rounded-full blur-md animate-pulse" />
        </div>
      </div>
    }>
      <LandlordRegisterPageContent />
    </Suspense>
  );
}
