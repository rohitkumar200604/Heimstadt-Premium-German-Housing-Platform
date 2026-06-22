"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/utils/supabase/client";
import Link from "next/link";
import Footer from "@/components/layout/Footer";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect");
  const { t, language } = useLanguage();
  const { profile, loading } = useAuth();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  useEffect(() => {
    const roleParam = searchParams.get("role");
    if (roleParam === "landlord" || roleParam === "tenant") {
      sessionStorage.setItem("auth_role", roleParam);
    } else if (!sessionStorage.getItem("auth_role")) {
      // Default to tenant for standard login/register
      sessionStorage.setItem("auth_role", "tenant");
    }

    // Check for role mismatch error from auth callback
    const loginErrorRole = sessionStorage.getItem("login_error");
    if (loginErrorRole) {
      setErrorMsg(
        language === "de"
          ? `Dieses Konto ist als ${loginErrorRole === "tenant" ? "Mieter" : "Vermieter"} registriert. Bitte melden Sie sich über den ${loginErrorRole === "tenant" ? "Mieter-Login" : "Vermieter-Login"} an.`
          : `This account is registered as a ${loginErrorRole}. Please log in through the ${loginErrorRole === "tenant" ? "tenant login" : "landlord login"}.`
      );
      sessionStorage.removeItem("login_error");
    }
  }, [searchParams, language]);

  useEffect(() => {
    if (profile) {
      if (!profile.role) {
        const cachedRole = (sessionStorage.getItem("auth_role") || "tenant") as "tenant" | "landlord";
        const autoAssignRole = async () => {
          try {
            await supabase
              .from("profiles")
              .update({ role: cachedRole })
              .eq("id", profile.id);
            if (cachedRole === "landlord") {
              await supabase
                .from("landlord_profiles")
                .upsert({ user_id: profile.id }, { onConflict: "user_id" });
            } else {
              await supabase
                .from("tenant_profiles")
                .upsert({ user_id: profile.id }, { onConflict: "user_id" });
            }
            sessionStorage.removeItem("auth_role");
            window.location.reload();
          } catch (err) {
            console.error("Auto assigning role failed:", err);
            // Fallback to select-role
            const selectRoleUrl = redirectUrl 
              ? `/auth/select-role?redirect=${encodeURIComponent(redirectUrl)}`
              : "/auth/select-role";
            router.push(selectRoleUrl);
          }
        };
        autoAssignRole();
      } else {
        const cachedRole = sessionStorage.getItem("auth_role");
        const roleParam = searchParams.get("role");
        if (roleParam && cachedRole && cachedRole !== profile.role) {
          const handleMismatch = async () => {
            await supabase.auth.signOut();
            setErrorMsg(
              language === "de"
                ? `Dieses Konto ist als ${profile.role === "tenant" ? "Mieter" : "Vermieter"} registriert. Bitte melden Sie sich über den ${profile.role === "tenant" ? "Mieter-Login" : "Vermieter-Login"} an.`
                : `This account is registered as a ${profile.role}. Please log in through the ${profile.role === "tenant" ? "tenant login" : "landlord login"}.`
            );
          };
          handleMismatch();
          return;
        }
        const defaultUrl = profile.role === "landlord" ? "/dashboard/landlord" : "/dashboard/tenant";
        const destination = redirectUrl || defaultUrl;
        router.push(destination);
      }
    }
  }, [profile, router, redirectUrl, language, searchParams]);

  // Self-healing: Detect Google OAuth hash redirect landing on login page and route to Auth Callback
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

      // Instantly fetch the user profile and redirect to the dashboard
      const { data: profileData } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user?.id)
        .single();

      if (profileData) {
        if (!profileData.role) {
          const cachedRole = (sessionStorage.getItem("auth_role") || "tenant") as "tenant" | "landlord";
          try {
            await supabase
              .from("profiles")
              .update({ role: cachedRole })
              .eq("id", data.user?.id);
            if (cachedRole === "landlord") {
              await supabase
                .from("landlord_profiles")
                .upsert({ user_id: data.user?.id }, { onConflict: "user_id" });
            } else {
              await supabase
                .from("tenant_profiles")
                .upsert({ user_id: data.user?.id }, { onConflict: "user_id" });
            }
            sessionStorage.removeItem("auth_role");
            const defaultUrl = cachedRole === "landlord" ? "/dashboard/landlord" : "/dashboard/tenant";
            router.push(redirectUrl || defaultUrl);
            return;
          } catch (err) {
            console.error("Auto assigning role in submit failed:", err);
          }
          const selectRoleUrl = redirectUrl 
            ? `/auth/select-role?redirect=${encodeURIComponent(redirectUrl)}`
            : "/auth/select-role";
          router.push(selectRoleUrl);
        } else {
          const cachedRole = sessionStorage.getItem("auth_role");
          if (cachedRole && cachedRole !== profileData.role) {
            await supabase.auth.signOut();
            setErrorMsg(
              language === "de"
                ? `Dieses Konto ist als ${profileData.role === "tenant" ? "Mieter" : "Vermieter"} registriert. Bitte melden Sie sich über den ${profileData.role === "tenant" ? "Mieter-Login" : "Vermieter-Login"} an.`
                : `This account is registered as a ${profileData.role}. Please log in through the ${profileData.role === "tenant" ? "tenant login" : "landlord login"}.`
            );
            return;
          }
          const defaultUrl = profileData.role === "landlord" ? "/dashboard/landlord" : "/dashboard/tenant";
          const destination = redirectUrl || defaultUrl;
          router.push(destination);
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
      setErrorMsg(
        language === "de"
          ? "Bitte geben Sie zuerst Ihre E-Mail-Adresse in das E-Mail-Feld ein."
          : "Please enter your email address in the email field first."
      );
      return;
    }
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const isConfigured =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://mock-project.supabase.co";

      if (!isConfigured) {
        setSuccessMsg(
          language === "de"
            ? "Mock-Modus: E-Mail zur Passwort-Zurücksetzung gesendet!"
            : "Mock Mode: Password reset email sent!"
        );
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback`,
      });

      if (error) throw error;

      setSuccessMsg(
        language === "de"
          ? "E-Mail zur Passwort-Zurücksetzung wurde gesendet!"
          : "Password reset email has been sent!"
      );
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to send password reset email.");
    }
  };

  const registerLink = redirectUrl 
    ? `/auth/register?redirect=${encodeURIComponent(redirectUrl)}`
    : "/auth/register";

  return (
    <>
      <div className="flex-grow flex items-center justify-center py-16 px-5 bg-gradient-to-br from-surface-container-low via-background to-surface-container">
        <div className="w-full max-w-md bg-white/90 backdrop-blur-md border-2 border-primary p-8 rounded-2xl shadow-xl transition-all">
          <div className="text-center mb-8">
            <h1 className="text-headline-lg text-primary font-bold mb-2">
              {t("loginTitle")}
            </h1>
            <p className="text-on-surface-variant text-body-md">
              {t("loginSubtitle")}
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
            <div className="space-y-2">
              <label className="block text-label-md text-on-surface font-semibold">
                {t("emailLabel")}
              </label>
              <input
                id="login-email"
                type="email"
                required
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-12 px-4 bg-surface-container-low border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-[16px]"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-label-md text-on-surface font-semibold">
                  {t("passwordLabel")}
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-[12px] text-primary hover:underline font-semibold bg-transparent border-none p-0 cursor-pointer outline-none focus:outline-none"
                >
                  {language === "de" ? "Passwort vergessen?" : "Forgot password?"}
                </button>
              </div>
              <input
                id="login-password"
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-12 px-4 bg-surface-container-low border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-[16px]"
              />
            </div>

            <button
              id="btn-login-submit"
              type="submit"
              disabled={loadingSubmit}
              className="w-full h-12 bg-primary text-on-primary rounded-xl font-bold hover:opacity-90 active:scale-95 transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loadingSubmit && (
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              )}
              {t("login")}
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
              href={registerLink}
              className="text-primary font-bold hover:underline"
            >
              {t("dontHaveAccount")}
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

export default function LoginPage() {
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
      <LoginPageContent />
    </Suspense>
  );
}
