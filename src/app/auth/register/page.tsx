"use client";

import { useState, useEffect, Suspense } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/utils/supabase/client";
import Link from "next/link";
import Footer from "@/components/layout/Footer";

function RegisterPageContent() {
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
    const roleParam = searchParams.get("role");
    if (roleParam === "landlord" || roleParam === "tenant") {
      sessionStorage.setItem("auth_role", roleParam);
    } else if (!sessionStorage.getItem("auth_role")) {
      sessionStorage.setItem("auth_role", "tenant");
    }
  }, [searchParams]);

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
      setErrorMsg(language === "de" ? "Bitte geben Sie Ihren vollständigen Namen ein." : "Please enter your full name.");
      setLoadingSubmit(false);
      return;
    }
    if (!form.email.trim() || !form.email.includes("@")) {
      setErrorMsg(language === "de" ? "Bitte geben Sie eine gültige E-Mail-Adresse ein." : "Please enter a valid email address.");
      setLoadingSubmit(false);
      return;
    }

    if (form.password.length < 6) {
      setErrorMsg(
        language === "de"
          ? "Das Passwort muss mindestens 6 Zeichen lang sein."
          : "Password must be at least 6 characters long."
      );
      setLoadingSubmit(false);
      return;
    }

    try {
      // 1. Sign up the user via Supabase Auth with registration metadata
      const roleToAssign = sessionStorage.getItem("auth_role") || "tenant";
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            full_name: form.name,
            phone: "",
            role: roleToAssign,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        }
      });

      if (error) throw error;
      
      // If user enumeration protection is enabled or user is missing, fail safely
      if (!data.user) {
        throw new Error(
          language === "de"
            ? "Registrierung fehlgeschlagen. Bitte überprüfen Sie Ihre Angaben."
            : "Registration failed. Please check your credentials."
        );
      }

      // Show custom popup modal instead of browser alert
      setShowVerificationModal(true);

    } catch (err: any) {
      const errMsg = err.message || "";
      const errCode = err.code || "";

      if (errCode === "weak_password" || errMsg.toLowerCase().includes("password")) {
        setErrorMsg(
          language === "de"
            ? "Das Passwort ist zu schwach. Es muss mindestens 6 Zeichen lang sein."
            : "The password is too weak. It must be at least 6 characters long."
        );
      } else if (errCode === "email_taken" || errMsg.toLowerCase().includes("already registered") || errMsg.toLowerCase().includes("already exists")) {
        setErrorMsg(
          language === "de"
            ? "Diese E-Mail-Adresse wird bereits verwendet. Bitte melden Sie sich an oder nutzen Sie eine andere E-Mail."
            : "This email address is already in use. Please log in or use a different email."
        );
      } else if (errCode === "invalid_email" || errMsg.toLowerCase().includes("email")) {
        setErrorMsg(
          language === "de"
            ? "Bitte geben Sie eine gültige E-Mail-Adresse ein."
            : "Please enter a valid email address."
        );
      } else if (errMsg.toLowerCase().includes("rate limit") || errMsg.toLowerCase().includes("once every 60 seconds") || errCode === "over_email_send_rate_limit") {
        setErrorMsg(
          language === "de"
            ? "Registrierungs-Limit erreicht. Bitte versuchen Sie es in Kürze erneut oder nutzen Sie die Google-Anmeldung."
            : "Signup rate limit exceeded. Please try again in a few minutes, or use Google Sign-in."
        );
      } else {
        setErrorMsg(
          language === "de"
            ? `Registrierung fehlgeschlagen: ${errMsg}`
            : `Registration failed: ${errMsg}`
        );
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
    ? `/auth/login?redirect=${encodeURIComponent(redirectUrl)}`
    : "/auth/login";

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
              {language === "de" ? "E-Mail bestätigen" : "Verify your Email"}
            </h1>
            
            <p className="text-on-surface text-body-lg mb-6 leading-relaxed">
              {language === "de" 
                ? "Wir haben eine Bestätigungs-E-Mail an "
                : "We have sent a verification email to "}
              <strong className="text-primary">{form.email}</strong>
              {language === "de"
                ? " gesendet. Bitte klicken Sie auf den Link in der E-Mail, um Ihre Registrierung zu bestätigen."
                : " as confirmation. Please click the link inside the email to verify your registration."}
            </p>
            
            <div className="p-5 mb-8 text-[14px] text-on-surface-variant bg-surface-container-low border border-outline-variant rounded-xl flex items-start gap-3 text-left">
              <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">info</span>
              <div>
                <p className="font-semibold text-primary mb-1">
                  {language === "de" ? "Was passiert als Nächstes?" : "What happens next?"}
                </p>
                <p className="leading-relaxed text-[13px]">
                  {language === "de"
                    ? "Sobald Sie Ihre E-Mail verifiziert haben, können Sie sich direkt in Ihr Dashboard einloggen und Ihr Profil vervollständigen!"
                    : "Once you have verified your email, you will be able to log in directly to your dashboard and complete your profile!"}
                </p>
              </div>
            </div>
            
            <Link
              href={loginLink}
              className="inline-flex items-center justify-center w-full h-12 bg-primary text-on-primary rounded-xl font-bold hover:opacity-90 active:scale-95 transition-all shadow-md gap-2"
            >
              <span>{language === "de" ? "Zur Anmeldung" : "Go to Login"}</span>
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
              {t("registerTitle")}
            </h1>
            <p className="text-on-surface-variant text-body-md">
              {t("registerSubtitle")}
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
            {/* Inputs */}
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
              {language === "de" ? "Oder fortfahren mit" : "Or continue with"}
            </p>
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 h-12 border border-outline-variant rounded-xl hover:bg-surface-container-low transition-colors cursor-pointer text-label-md font-semibold"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.57 15.02 1 12 1 7.24 1 3.21 3.73 1.24 7.72l3.87 3a7.16 7.16 0 0 1 6.89-5.68z"
                />
                <path
                  fill="#4285F4"
                  d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46a5.5 5.5 0 0 1-2.4 3.6l3.73 2.9c2.18-2 3.7-5.07 3.7-8.65z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.11 14.78a7.12 7.12 0 0 1 0-4.56L1.24 7.22a11.96 11.96 0 0 0 0 9.56l3.87-3z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3.24 0 5.97-1.07 7.96-2.9l-3.73-2.9a7.12 7.12 0 0 1-10.9-4.42l-3.87 3A11.96 11.96 0 0 0 12 23z"
                />
              </svg>
              <span>{language === "de" ? "Mit Google fortfahren" : "Continue with Google"}</span>
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
          {/* Centering wrapper — uses min-h-full + flex so the card is centred vertically on large screens but top-anchored with padding on short ones */}
          <div className="flex min-h-full items-center justify-center p-4 py-8">
            <div className="w-full max-w-md bg-white border border-outline-variant p-6 sm:p-8 rounded-3xl shadow-2xl text-center">

              {/* Icon */}
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#f07d00]/10 border border-[#f07d00]/20 rounded-full flex items-center justify-center mx-auto mb-5">
                <span
                  className="material-symbols-outlined text-[28px] sm:text-[36px] text-[#f07d00]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  mark_email_unread
                </span>
              </div>

              {/* Title */}
              <h2 className="text-[20px] sm:text-headline-md font-bold text-primary mb-3 leading-snug">
                {language === "de" ? "Aktivierung erforderlich!" : "Activation Required!"}
              </h2>

              {/* Body text */}
              <p className="text-on-surface-variant text-[13px] sm:text-[14px] leading-relaxed mb-4">
                {language === "de"
                  ? "Um nach der Registrierung auf Ihr Profil und Ihr Dashboard zugreifen zu können, müssen Sie Ihr Konto über den Aktivierungslink in der Bestätigungs-E-Mail verifizieren."
                  : "In order to access your profile and dashboard after registering, you must first verify your account using the activation link sent to the email provided."}
              </p>

              {/* Email hint pill */}
              <div className="flex items-center justify-center gap-2 bg-surface-container-low border border-outline-variant rounded-xl px-4 py-3 mb-6 text-[13px]">
                <span className="material-symbols-outlined text-primary text-[16px]">mail</span>
                <span className="text-on-surface font-semibold break-all">{form.email}</span>
              </div>

              {/* CTA */}
              <button
                onClick={() => {
                  setShowVerificationModal(false);
                  setIsRegistered(true);
                }}
                className="w-full h-12 bg-primary text-on-primary rounded-xl font-bold hover:opacity-90 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{language === "de" ? "E-Mail-Posteingang prüfen" : "Check Email Inbox"}</span>
                <span className="material-symbols-outlined text-[18px]">open_in_new</span>
              </button>

              {/* Dismiss link */}
              <button
                onClick={() => { setShowVerificationModal(false); setIsRegistered(true); }}
                className="mt-4 text-[12px] text-on-surface-variant hover:text-primary transition-colors cursor-pointer underline underline-offset-2"
              >
                {language === "de" ? "Schließen" : "Dismiss"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}

export default function RegisterPage() {
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
      <RegisterPageContent />
    </Suspense>
  );
}
