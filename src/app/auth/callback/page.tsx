"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    let redirectStarted = false;

    const handleRedirect = async (user: any) => {
      if (redirectStarted) return;
      redirectStarted = true;

      try {
        // Fetch user profile to determine their role and redirect
        let { data: profile, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        const targetRole = (typeof window !== "undefined" ? sessionStorage.getItem("auth_role") : null) || user.user_metadata?.role || "tenant";

        // Self-healing: If the profiles row doesn't exist (e.g. created before DB triggers were set up),
        // we dynamically create it here from the frontend so the user is never stuck.
        if (error || !profile) {
          console.warn("Profile not found in database, dynamically creating profile from frontend...");
          const fullName = user.user_metadata?.full_name || user.user_metadata?.name || "";
          
          const { data: newProfile, error: insertError } = await supabase
            .from("profiles")
            .insert({
              id: user.id,
              email: user.email,
              full_name: fullName,
              role: targetRole,
            })
            .select("role")
            .single();

          if (!insertError && newProfile) {
            profile = newProfile;
          } else {
            console.warn("Insert failed, trying to select profile again:", insertError);
            const { data: retryProfile, error: retryError } = await supabase
              .from("profiles")
              .select("role")
              .eq("id", user.id)
              .single();
            if (!retryError && retryProfile) {
              profile = retryProfile;
            } else {
              console.error("Failed to fetch profile on retry:", retryError);
            }
          }
        }

        // If profile exists but lacks role, update it!
        if (profile && !profile.role) {
          const { data: updatedProfile } = await supabase
            .from("profiles")
            .update({ role: targetRole })
            .eq("id", user.id)
            .select("role")
            .single();
          if (updatedProfile) {
            profile = updatedProfile;
          }
        }

        // Check for role mismatch if profile exists and has a role
        if (profile && profile.role) {
          const cachedRole = typeof window !== "undefined" ? sessionStorage.getItem("auth_role") : null;
          if (cachedRole && cachedRole !== profile.role) {
            console.warn("Role mismatch detected in callback. Signing out...");
            await supabase.auth.signOut();
            if (typeof window !== "undefined") {
              sessionStorage.setItem("login_error", profile.role);
              sessionStorage.removeItem("auth_role");
            }
            router.push("/auth/login");
            return;
          }
        }

        // Ensure role-specific profile is initialized
        const finalRole = profile?.role || targetRole;
        if (finalRole === "landlord") {
          await supabase
            .from("landlord_profiles")
            .upsert({ user_id: user.id }, { onConflict: "user_id" });
        } else {
          await supabase
            .from("tenant_profiles")
            .upsert({ user_id: user.id }, { onConflict: "user_id" });
        }

        if (typeof window !== "undefined") {
          sessionStorage.removeItem("auth_role");
        }

        if (profile && mounted) {
          const url = finalRole === "landlord" ? "/dashboard/landlord" : "/dashboard/tenant";
          router.push(url);
          return;
        }
      } catch (err) {
        console.error("Error during auth callback routing:", err);
        if (mounted) {
          window.location.href = "/";
        }
      }
    };

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && mounted) {
        await handleRedirect(session.user);
      }
    };

    // Listen for auth state changes (crucial for Google OAuth hashes)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === "SIGNED_IN" || session) && mounted) {
        if (session?.user) {
          await handleRedirect(session.user);
        }
      }
    });

    checkSession();

    // Safety timeout: fallback to home after 5 seconds to avoid freezing on loading screen
    const safetyTimer = setTimeout(() => {
      if (mounted) {
        console.warn("OAuth callback timeout. Redirecting to home page.");
        window.location.href = "/";
      }
    }, 5000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(safetyTimer);
    };
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8f9ff]">
      <div className="text-center space-y-6">
        {/* Premium Navy Blue & Light Blue Dual-Ring Spinner */}
        <div className="relative w-16 h-16 flex items-center justify-center mx-auto">
          <div className="absolute inset-0 rounded-full border-[3px] border-[#002046]/15 border-t-[#002046] animate-spin" />
          <div className="absolute w-10 h-10 rounded-full border-[3px] border-[#aec7f7]/20 border-b-[#aec7f7] animate-spin [animation-direction:reverse] [animation-duration:1s]" />
          <div className="absolute w-12 h-12 bg-[#002046]/5 rounded-full blur-md animate-pulse" />
        </div>
        <p className="text-on-surface-variant font-bold text-label-md uppercase tracking-wider animate-pulse">
          Anmeldung wird abgeschlossen...
        </p>
      </div>
    </div>
  );
}
