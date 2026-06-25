"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { useCurrency } from "@/context/CurrencyContext";
import { supabase, isSupabaseConfigured } from "@/utils/supabase/client";
import Footer from "@/components/layout/Footer";
import Link from "next/link";
import { getDisplayPhoto } from "@/utils/get-display-photo";
import { normalizeCityName } from "@/utils/translations";

function promiseTimeout<T>(promise: any, ms: number): Promise<T> {
  const finalMs = Math.max(ms, 20000); // Safe minimum of 20 seconds for cold starts / slow DB instances
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Database query timed out"));
    }, finalMs);

    Promise.resolve(promise)
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

function TenantDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, loading, refreshProfile, isPremium, subscription } = useAuth();
  const { t, language } = useLanguage();
  const { formatPrice } = useCurrency();
  
  // Navigation State
  const [activeTab, setActiveTab] = useState<"profile" | "bookings" | "documents" | "favorites" | "saved-filters">("profile");

  // Database Data States
  const [docs, setDocs] = useState<any[]>([]);
  const [activeBooking, setActiveBooking] = useState<any | null>(null);
  const [tenantProfile, setTenantProfile] = useState<any | null>(null);
  const [aiScore, setAiScore] = useState<any | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [favoriteListings, setFavoriteListings] = useState<any[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const [savedFilters, setSavedFilters] = useState<any[]>([]);
  const [savedFiltersLoading, setSavedFiltersLoading] = useState(false);
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  
  // Form State
  const [profileForm, setProfileForm] = useState({
    full_name: "",
    phone: "",
    nationality: "",
    university: "",
    enrollment_date: "",
    graduation_date: "",
    employment_status: "",
    monthly_income: "",
  });



  // Action feedback states
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [runningAnalyzer, setRunningAnalyzer] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
    }
    if (!loading && profile && profile.role !== "tenant") {
      router.push("/dashboard/landlord");
    }
  }, [user, profile, loading, router]);

  // Read active tab from URL query params
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (
      tabParam === "profile" ||
      tabParam === "bookings" ||
      tabParam === "documents" ||
      tabParam === "favorites" ||
      tabParam === "saved-filters"
    ) {
      setActiveTab(tabParam as any);
    }
  }, [searchParams]);

  // Fetch initial dashboard and profile data
  const fetchTenantData = async () => {
    if (!user) return;
    if (!hasLoadedOnce) {
      setLoadingDashboard(true);
    }

    if (!isSupabaseConfigured()) {
      // Mock mode: set mock data immediately
      setDocs([]);
      setActiveBooking(null);
      setAiScore(null);
      setTenantProfile({
        user_id: user.id,
        nationality: "German",
        university: "TU Berlin",
        employment_status: "student",
        monthly_income: 950,
        whatsapp_enabled: localStorage.getItem(`heimat_mock_whatsapp_${user.id}`) === "true",
        ai_score: 85
      });
      setProfileForm({
        full_name: profile?.full_name || "Jane Doe",
        phone: profile?.phone || "+49 176 123456",
        nationality: "German",
        university: "TU Berlin",
        enrollment_date: "2023-10-01",
        graduation_date: "2026-09-30",
        employment_status: "student",
        monthly_income: "950",
      });
      setWhatsappEnabled(localStorage.getItem(`heimat_mock_whatsapp_${user.id}`) === "true");
      setLoadingDashboard(false);
      setHasLoadedOnce(true);
      return;
    }

    try {
      // 1. Fetch verification documents
      const { data: docData, error: docErr } = await promiseTimeout(
        supabase
          .from("verification_documents")
          .select("*")
          .eq("user_id", user.id),
        3000
      ) as any;
      if (docErr) throw docErr;
      setDocs(docData || []);

      // 2. Fetch active booking
      const { data: bookingData, error: bookingErr } = await promiseTimeout(
        supabase
          .from("bookings")
          .select(`
            id,
            status,
            move_in_date,
            move_out_date,
            rent_total,
            properties (
              id,
              title,
              street,
              city,
              zip,
              size_sqm,
              rent_cold
            )
          `)
          .eq("tenant_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1),
        3000
      ) as any;

      if (bookingErr) throw bookingErr;
      if (bookingData && bookingData.length > 0) {
        const currentBooking = bookingData[0];
        setActiveBooking(currentBooking);

        // Fetch AI Match score details for the active booking
        const { data: scoreDetails } = await promiseTimeout(
          supabase
            .from("ai_tenant_scores")
            .select("*")
            .eq("booking_id", currentBooking.id)
            .maybeSingle(),
          3000
        ) as any;

        setAiScore(scoreDetails);
      } else {
        setActiveBooking(null);
        setAiScore(null);
      }

      // 3. Fetch custom tenant_profiles
      const { data: tpData, error: tpErr } = await promiseTimeout(
        supabase
          .from("tenant_profiles")
          .select("*")
          .eq("user_id", user.id)
          .single(),
        3000
      ) as any;
      
      // Suppress single row not found errors to let signup trigger catch up
      if (!tpErr && tpData) {
        setTenantProfile(tpData);
        setWhatsappEnabled(tpData.whatsapp_enabled ?? false);
        setProfileForm({
          full_name: profile?.full_name || "",
          phone: profile?.phone || "",
          nationality: tpData.nationality || "",
          university: tpData.university || "",
          enrollment_date: tpData.enrollment_date || "",
          graduation_date: tpData.graduation_date || "",
          employment_status: tpData.employment_status || "",
          monthly_income: tpData.monthly_income ? String(tpData.monthly_income) : "",
        });
      } else {
        // Default fallbacks from core profile context
        setProfileForm(prev => ({
          ...prev,
          full_name: profile?.full_name || "",
          phone: profile?.phone || "",
        }));
        if (!isSupabaseConfigured()) {
          const localWhatsapp = localStorage.getItem(`heimat_mock_whatsapp_${user.id}`);
          setWhatsappEnabled(localWhatsapp === "true");
        }
      }

    } catch (err) {
      console.error("Error loading tenant dashboard data:", err);
    } finally {
      setLoadingDashboard(false);
      setHasLoadedOnce(true);
    }
  };

  useEffect(() => {
    fetchTenantData();
  }, [user, profile]);

  const toggleWhatsApp = async () => {
    if (!user || !isPremium) return;
    const next = !whatsappEnabled;
    setWhatsappEnabled(next); // optimistic update
    
    if (!isSupabaseConfigured()) {
      localStorage.setItem(`heimat_mock_whatsapp_${user.id}`, String(next));
      return;
    }

    try {
      const { error } = await supabase
        .from("tenant_profiles")
        .upsert(
          { user_id: user.id, whatsapp_enabled: next },
          { onConflict: "user_id" }
        );
      if (error) {
        // Roll back on failure
        setWhatsappEnabled(!next);
        console.error("Error toggling WhatsApp:", error);
      }
    } catch (err) {
      setWhatsappEnabled(!next);
      console.error("Error toggling WhatsApp:", err);
    }
  };

  const fetchFavorites = async () => {
    setLoadingFavorites(true);
    const saved = localStorage.getItem("heimat_favorites");
    if (!saved) {
      setFavoriteListings([]);
      setLoadingFavorites(false);
      return;
    }
    try {
      const favIds = JSON.parse(saved) as string[];
      if (favIds.length === 0) {
        setFavoriteListings([]);
        setLoadingFavorites(false);
        return;
      }

      // Check if Supabase is configured
      const isConfigured =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://mock-project.supabase.co" &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== "mock-anon-key";

      let dbListings: any[] = [];
      if (isConfigured) {
        const { data, error } = await supabase
          .from("properties")
          .select(`*, property_photos(cdn_url,is_primary)`)
          .in("id", favIds);
        if (!error && data) {
          dbListings = data;
        }
      }

      // Fallback/Mock listings if we don't have db listings
      const mockListings: any[] = [
        {
          id: "berlin-studio",
          title: t("tenantDash_brightStudioApartmentNearAlexa"),
          city: "Berlin", street: "Karl-Liebknecht-Str. 12", zip: "10178",
          rooms: 1, size_sqm: 38, rent_cold: 720, rent_utilities: 80, rent_heating: 70,
          pets_allowed: true, furnished: false,
          amenities: ["balcony", "kitchen"],
          status: "active",
          property_photos: [{ cdn_url: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80", is_primary: true }]
        },
        {
          id: "munich-expat",
          title: t("tenantDash_premium3roomApartmentAtEnglisc"),
          city: "München", street: "Königinstraße 44", zip: "80539",
          rooms: 3, size_sqm: 82, rent_cold: 1650, rent_utilities: 150, rent_heating: 110,
          pets_allowed: false, furnished: true,
          amenities: ["kitchen", "parking"],
          status: "active",
          property_photos: [{ cdn_url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80", is_primary: true }]
        },
        {
          id: "hamburg-loft",
          title: t("tenantDash_stylishLoftInSpeicherstadt"),
          city: "Hamburg", street: "Am Sandtorkai 10", zip: "20457",
          rooms: 2, size_sqm: 65, rent_cold: 1120, rent_utilities: 110, rent_heating: 90,
          pets_allowed: true, furnished: true,
          amenities: ["balcony", "kitchen", "garden"],
          status: "active",
          property_photos: [{ cdn_url: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80", is_primary: true }]
        },
        {
          id: "berlin-wg",
          title: t("tenantDash_cozyRoomInStudentSharedApartme"),
          city: "Berlin", street: "Königin-Luise-Str. 15", zip: "14195",
          rooms: 1, size_sqm: 20, rent_cold: 450, rent_utilities: 60, rent_heating: 40,
          pets_allowed: true, furnished: false,
          amenities: ["kitchen"],
          status: "active",
          property_photos: [{ cdn_url: "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80", is_primary: true }]
        },
        {
          id: "cologne-studio",
          title: t("tenantDash_modernStudioInCologneCityCentr"),
          city: "Köln", street: "Schildergasse 8", zip: "50667",
          rooms: 1, size_sqm: 32, rent_cold: 680, rent_utilities: 75, rent_heating: 55,
          pets_allowed: false, furnished: true,
          amenities: ["kitchen", "wheelchair"],
          status: "active",
          property_photos: [{ cdn_url: "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=800&q=80", is_primary: true }]
        },
      ];

      // Merge / filter
      const combined = [...dbListings];
      favIds.forEach((id) => {
        if (!combined.some((l) => l.id === id)) {
          const mockItem = mockListings.find((m) => m.id === id);
          if (mockItem) combined.push(mockItem);
        }
      });

      setFavoriteListings(combined);
    } catch (e) {
      console.error("Failed to load favorite details", e);
    } finally {
      setLoadingFavorites(false);
    }
  };

  const handleRemoveFavorite = (id: string) => {
    const saved = localStorage.getItem("heimat_favorites");
    if (saved) {
      try {
        const favIds = JSON.parse(saved) as string[];
        const next = favIds.filter((x) => x !== id);
        localStorage.setItem("heimat_favorites", JSON.stringify(next));
        setFavoriteListings((prev) => prev.filter((l) => l.id !== id));
      } catch (e) {
        console.error(e);
      }
    }
  };

  const fetchSavedFilters = async (userId: string) => {
    setSavedFiltersLoading(true);
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from("saved_filters")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });
        if (!error && data) {
          setSavedFilters(data);
          setSavedFiltersLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn("Supabase fetch saved_filters failed, using localStorage fallback:", e);
    }

    const saved = localStorage.getItem(`heimat_saved_filters_${userId}`);
    if (saved) {
      try {
        setSavedFilters(JSON.parse(saved));
      } catch (e) {}
    }
    setSavedFiltersLoading(false);
  };

  const handleApplySavedFilter = (filter: any) => {
    const params = new URLSearchParams();
    const f = filter.filters;
    if (f.city) params.set("stadt", f.city);
    if (f.maxPrice) params.set("preis", String(f.maxPrice));
    if (f.rooms) params.set("zimmer", String(f.rooms));
    if (f.moveIn) params.set("moveIn", f.moveIn);
    if (f.moveOut) params.set("moveOut", f.moveOut);
    
    const furList: string[] = [];
    if (f.furnished === true) furList.push("furnished");
    if (f.furnished === false) furList.push("unfurnished");
    if (furList.length > 0) params.set("furniture", furList.join(","));

    if (f.roommates && f.roommates !== "regardless") params.set("roommates", f.roommates);
    if (f.rating && f.rating !== "any") params.set("rating", f.rating);
    if (f.wgSize && f.wgSize !== "regardless") params.set("wgSize", f.wgSize);

    router.push(`/suche?${params.toString()}`);
  };

  const handleDeleteSavedFilter = async (filterId: string) => {
    if (!user) return;
    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase
          .from("saved_filters")
          .delete()
          .eq("id", filterId)
          .eq("user_id", user.id);
        if (!error) {
          setSavedFilters(prev => prev.filter(f => f.id !== filterId));
          return;
        }
      }
    } catch (e) {
      console.error("Error deleting saved filter:", e);
    }

    // Fallback/Mock delete
    const saved = localStorage.getItem(`heimat_saved_filters_${user.id}`);
    if (saved) {
      try {
        const currentList = JSON.parse(saved) as any[];
        const updatedList = currentList.filter(f => f.id !== filterId);
        localStorage.setItem(`heimat_saved_filters_${user.id}`, JSON.stringify(updatedList));
        setSavedFilters(updatedList);
      } catch (e) {
        console.error("Error deleting local filter:", e);
      }
    }
  };

  useEffect(() => {
    if (activeTab === "favorites") {
      fetchFavorites();
    } else if (activeTab === "saved-filters" && user) {
      fetchSavedFilters(user.id);
    }
  }, [activeTab, user]);

  const cancelPremium = async () => {
    if (!user || !isPremium) return;
    try {
      // 1. Clear the localStorage cache so AuthContext re-evaluates
      localStorage.removeItem(`heimat_sub_${user.id}`);
      localStorage.removeItem(`heimat_mock_whatsapp_${user.id}`);
      setWhatsappEnabled(false);

      // 2. Mark all active subscriptions as canceled in the DB (enum: 'canceled')
      if (isSupabaseConfigured()) {
        await supabase
          .from("subscriptions")
          .update({ status: "canceled", cancel_at_period_end: true })
          .eq("user_id", user.id)
          .eq("status", "active");

        await supabase
          .from("tenant_profiles")
          .update({ whatsapp_enabled: false })
          .eq("user_id", user.id);
      }

      // 3. Refresh AuthContext so isPremium recomputes to false
      await refreshProfile();

      // 4. Show custom success popup
      alert(
        t("tenantDash_yourPremiumSubscriptionHasBeen")
      );
    } catch (err) {
      console.error("Error cancelling premium:", err);
    }
  };

  const handleRunProfileAnalyzer = async () => {
    if (!isPremium) {
      alert(
        t("tenantDash_aiProfileAnalyzerIsAPremiumFea")
      );
      return;
    }
    setErrorMsg("");
    setSuccessMsg("");
    setRunningAnalyzer(true);

    try {
      const tenantProfileData = {
        nationality: tenantProfile?.nationality || profileForm.nationality || "German",
        monthlyIncome: parseFloat(tenantProfile?.monthly_income || profileForm.monthly_income || "2500"),
        rent: parseFloat(activeBooking?.properties?.rent_cold || activeBooking?.rent_total || "1000"),
        employmentStatus: tenantProfile?.employment_status || profileForm.employment_status || "Student"
      };

      const uploadedDocTypes = docs.map(d => d.doc_type);

      const aiRes = await fetch("/api/ai/score-tenant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: activeBooking?.id || "mock-pre-screen",
          tenantProfile: tenantProfileData,
          docTypes: uploadedDocTypes
        })
      });

      const aiData = await aiRes.json();
      if (!aiData.success) {
        throw new Error(aiData.error || "AI screening call failed");
      }

      // If there is no active booking (general pre-screening), save the cached score to tenant_profiles
      if (!activeBooking && user) {
        const { error: updateScoreErr } = await supabase
          .from("tenant_profiles")
          .update({ ai_score: aiData.data.overall_score })
          .eq("user_id", user.id);
        
        if (updateScoreErr) {
          console.error("Error updating pre-screen score:", updateScoreErr);
        }
      }

      setSuccessMsg(
        t("tenantDash_aiProfileAnalyzerSuccessfullyC")
      );

      // Refresh everything to reflect the new state
      await fetchTenantData();
      await refreshProfile();
    } catch (err: any) {
      console.error("Error running profile analyzer:", err);
      setErrorMsg(err.message || "Failed to analyze profile");
    } finally {
      setRunningAnalyzer(false);
    }
  };

  if (loading || loadingDashboard) {
    return (
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
    );
  }

  // Profile Save handler
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setSavingProfile(true);

    try {
      if (!user) throw new Error("No authenticated user");

      // 1. Update Core profiles table
      const { error: pErr } = await supabase
        .from("profiles")
        .update({
          full_name: profileForm.full_name,
          phone: profileForm.phone,
        })
        .eq("id", user.id);
      if (pErr) throw pErr;

      // 2. Update Tenant-specific profile table (upsert dynamically)
      const { data: updatedTp, error: tErr } = await supabase
        .from("tenant_profiles")
        .upsert({
          user_id: user.id,
          nationality: profileForm.nationality || null,
          university: profileForm.university || null,
          enrollment_date: profileForm.enrollment_date || null,
          graduation_date: profileForm.graduation_date || null,
          employment_status: profileForm.employment_status || null,
          monthly_income: profileForm.monthly_income ? parseFloat(profileForm.monthly_income) : null,
        }, { onConflict: "user_id" })
        .select()
        .single();
      if (tErr) throw tErr;

      setTenantProfile(updatedTp);
      setSuccessMsg(
        t("tenantDash_profileDetailsSuccessfullySave")
      );
      
      // Refresh context profile details
      await refreshProfile();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Real GCS document upload handler ──
  const handleDocUpload = async (docType: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingDoc(docType);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      // 1. Upload file directly via server-side endpoint (bypasses direct browser-to-GCS CORS issues)
      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", user.id);

      const res = await fetch("/api/upload/doc", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Upload failed");

      const { key } = data;

      const isConfigured =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://mock-project.supabase.co" &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== "mock-anon-key";

      if (isConfigured) {
        // 3. Upsert document record in Supabase (replace existing doc of same type)
        const existing = docs.find((d) => d.doc_type === docType);
        if (existing) {
          const { error } = await supabase
            .from("verification_documents")
            .update({ s3_key: key, file_name: file.name, status: "approved" })
            .eq("id", existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("verification_documents")
            .insert({ user_id: user.id, doc_type: docType, s3_key: key, file_name: file.name, status: "approved" });
          if (error) throw error;
        }
        await fetchTenantData();
      } else {
        // Mock mode local state update
        setDocs((prev) => {
          const filtered = prev.filter((d) => d.doc_type !== docType);
          return [...filtered, { doc_type: docType, file_name: file.name, status: "approved" }];
        });
      }

      setSuccessMsg(
        t("tenantDash_filenameUploadedSuccessfully")
      );
    } catch (err: any) {
      console.error("Doc upload error:", err);
      setErrorMsg(err.message || "Upload failed");
    } finally {
      setUploadingDoc(null);
      // Reset the input so the same file can be re-uploaded after an error
      e.target.value = "";
    }
  };

  const handleDocRemove = async (docType: string) => {
    if (!user) return;
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const isConfigured =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://mock-project.supabase.co" &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== "mock-anon-key";

      if (isConfigured) {
        const { error } = await supabase
          .from("verification_documents")
          .delete()
          .eq("user_id", user.id)
          .eq("doc_type", docType);

        if (error) throw error;
        await fetchTenantData();
      } else {
        // Mock mode local state update
        setDocs((prev) => prev.filter((d) => d.doc_type !== docType));
      }

      setSuccessMsg(
        t("tenantDash_documentSuccessfullyRemoved")
      );
    } catch (err: any) {
      console.error("Doc remove error:", err);
      setErrorMsg(err.message || "Failed to remove document");
    }
  };

  const documentTypesList = [
    { key: "passport", labelDe: "Personalausweis / Reisepass", labelEn: "Passport / ID Card", icon: "badge", optional: false },
    { key: "enrollment", labelDe: "Immatrikulationsbescheinigung", labelEn: "Enrollment Certificate", icon: "school", optional: true },
    { key: "income", labelDe: "Einkommensnachweis", labelEn: "Proof of Income", icon: "receipt_long", optional: true },
    { key: "visa", labelDe: "Visum / Aufenthaltstitel", labelEn: "Visa / Residence Permit", icon: "assignment_ind", optional: true },
  ];

  const requiredDocs = ["passport"];
  const getDocDisplayName = (key: string) => {
    switch (key) {
      case "passport": return t("tenantDash_passportId");
      case "enrollment": return t("tenantDash_enrollmentCert");
      case "income": return t("tenantDash_proofOfIncome");
      case "visa": return t("tenantDash_visaPermit");
      default: return key;
    }
  };

  const getDocStatus = (type: string) => {
    const d = docs.find((x) => x.doc_type === type);
    return d ? d.status : "missing"; // missing, pending, approved, rejected
  };

  const getCountdown = (dateStr: string) => {
    const moveIn = new Date(dateStr);
    const today = new Date();
    const diffTime = moveIn.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const getPipelineSteps = (status: string) => {
    const approvedActive = ["approved", "deposit_paid", "confirmed"].includes(status);
    const depositActive = ["deposit_paid", "confirmed"].includes(status);
    const confirmedActive = status === "confirmed";

    return [
      { label: t("pipeSearch"), active: true },
      { label: t("pipeIntent"), active: true },
      { label: t("pipeDocuments"), active: true },
      { label: t("pipeApproval"), active: approvedActive },
      { label: t("pipeDeposit"), active: depositActive },
      { label: t("pipeMoveIn"), active: confirmedActive },
    ];
  };

  const pipeline = activeBooking ? getPipelineSteps(activeBooking.status) : [];
  const activeCount = pipeline.filter(p => p.active).length;
  const progressPct = pipeline.length > 0 ? ((activeCount - 1) / (pipeline.length - 1)) * 100 : 0;

  const property = activeBooking?.properties as any;

  return (
    <>
      <div className="flex-grow py-12 px-5 max-w-[1280px] mx-auto w-full">
        {/* Welcome Header */}
        <div className="mb-10 flex flex-col sm:flex-row justify-between sm:items-end gap-4">
          <div>
            <span className="text-[14px] text-secondary font-bold uppercase tracking-wider block mb-1">
              {t("tenantDashTitle")}
            </span>
            <h1 className="text-display-lg-mobile md:text-headline-lg font-bold text-primary">
              {t("welcome")} {profile?.full_name || ""}!
            </h1>
          </div>
        </div>

        {/* Tabbed Layout - Left Sidebar, Right Content */}
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* ── Sidebar Navigation ─────────────────────────── */}
          <aside className="w-full lg:w-64 bg-white/90 backdrop-blur-md border border-outline-variant rounded-2xl p-4 shadow-sm flex flex-col gap-1.5 flex-shrink-0">
            <button
              onClick={() => setActiveTab("profile")}
              className={`flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-left text-label-md font-bold transition-all ${
                activeTab === "profile"
                  ? "bg-primary text-on-primary shadow-md"
                  : "text-on-surface-variant hover:bg-surface-container-low hover:text-primary"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">account_circle</span>
              <span>{t("tenantDash_profileFinance")}</span>
            </button>
            
            <button
              onClick={() => setActiveTab("bookings")}
              className={`flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-left text-label-md font-bold transition-all ${
                activeTab === "bookings"
                  ? "bg-primary text-on-primary shadow-md"
                  : "text-on-surface-variant hover:bg-surface-container-low hover:text-primary"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">calendar_month</span>
              <span>{t("tenantDash_myBookings")}</span>
            </button>
            
            <button
              onClick={() => setActiveTab("documents")}
              className={`flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-left text-label-md font-bold transition-all ${
                activeTab === "documents"
                  ? "bg-primary text-on-primary shadow-md"
                  : "text-on-surface-variant hover:bg-surface-container-low hover:text-primary"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">folder_shared</span>
              <span>{t("tenantDash_documents")}</span>
            </button>

            <button
              onClick={() => setActiveTab("favorites")}
              className={`flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-left text-label-md font-bold transition-all ${
                activeTab === "favorites"
                  ? "bg-primary text-on-primary shadow-md"
                  : "text-on-surface-variant hover:bg-surface-container-low hover:text-primary"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">favorite</span>
              <span>{t("tenantDash_favourites")}</span>
            </button>

            <button
              onClick={() => setActiveTab("saved-filters")}
              className={`flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-left text-label-md font-bold transition-all ${
                activeTab === "saved-filters"
                  ? "bg-primary text-on-primary shadow-md"
                  : "text-on-surface-variant hover:bg-surface-container-low hover:text-primary"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">bookmarks</span>
              <span>{t("tenantDash_savedSearches")}</span>
            </button>

            {/* Divider */}
            <div className="border-t border-outline-variant/60 my-3" />
            
            {/* Membership Panel */}
            <div className="p-3 bg-surface-container-low/40 rounded-xl border border-outline-variant/50 space-y-3">
              <h4 className="text-[12px] font-bold text-primary flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#f07d00] text-[18px]">card_membership</span>
                <span>{t("tenantDash_membership")}</span>
              </h4>
              
              {!isPremium ? (
                <div className="space-y-2">
                  <div className="text-[11px] text-on-surface-variant leading-tight">
                    {t("tenantDash_freeBasicPlan")}
                  </div>
                  <Link
                    href="/preise?plan=3months"
                    className="w-full bg-[#f07d00] text-white py-2 rounded-lg font-bold text-[11px] hover:opacity-90 active:scale-95 transition-all text-center block"
                  >
                    {t("tenantDash_upgradeNow")}
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-[12px] font-black text-primary flex items-center gap-1">
                    <span className="material-symbols-outlined text-[#f07d00] text-[16px]">workspace_premium</span>
                     <span>Premium ({subscription?.plan === "1month" ? "1M" : subscription?.plan === "3months" ? "3M" : subscription?.plan === "12months" ? "12M" : "Pro"})</span>
                  </div>
                  
                  {(() => {
                    const sub = subscription;
                    if (!sub) return null;
                    const start = new Date(sub.startDate).getTime();
                    const end = new Date(sub.endDate).getTime();
                    const total = end - start;
                    const elapsed = Date.now() - start;
                    const percentage = Math.max(0, Math.min(100, (elapsed / total) * 100));
                    const daysRemaining = Math.max(0, Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24)));
                    
                    return (
                      <div className="space-y-1.5 pt-1">
                        <div className="flex justify-between text-[9px] text-on-surface-variant font-bold">
                          <span>{t("tenantDash_validity")}</span>
                          <span>{daysRemaining}d left</span>
                        </div>
                        <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-[#f07d00] rounded-full transition-all duration-500" 
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="text-[9px] text-on-surface-variant/80 font-medium italic">
                          {t("tenantDash_exp")} {new Date(sub.endDate).toLocaleDateString(t("tenantDash_enus"))}
                        </div>
                      </div>
                    );
                  })()}

                  <button
                    onClick={cancelPremium}
                    className="w-full border border-outline-variant text-on-surface-variant py-1.5 rounded-lg text-[10px] font-bold hover:bg-surface-container-low hover:text-error hover:border-error/40 active:scale-95 transition-all text-center cursor-pointer mt-1"
                  >
                    {t("tenantDash_cancelSubscription")}
                  </button>
                </div>
              )}
            </div>
          </aside>

          {/* ── Main Tab Contents ─────────────────────────── */}
          <main className="flex-grow w-full space-y-6">
            
            {/* 1. Tab: Favourites */}
            {activeTab === "favorites" && (
              <div className="bg-white border border-outline-variant p-6 md:p-8 rounded-2xl shadow-sm space-y-6">
                <div>
                  <h2 className="text-headline-md font-bold text-primary flex items-center gap-2">
                    <span className="material-symbols-outlined text-[28px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                    {t("tenantDash_favourites")}
                  </h2>
                  <p className="text-body-md text-on-surface-variant mt-1 leading-relaxed">
                    {t("tenantDash_hereYouCanFindAllYourSavedProp")}
                  </p>
                </div>

                {loadingFavorites ? (
                  <div className="flex justify-center items-center py-16">
                    <div className="relative w-16 h-16 flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full border-[3px] border-[#002046]/15 border-t-[#002046] animate-spin" />
                      <div className="absolute w-10 h-10 rounded-full border-[3px] border-[#aec7f7]/20 border-b-[#aec7f7] animate-spin [animation-direction:reverse] [animation-duration:1s]" />
                      <div className="absolute w-12 h-12 bg-[#002046]/5 rounded-full blur-md animate-pulse" />
                    </div>
                  </div>
                ) : favoriteListings.length === 0 ? (
                  <div className="text-center py-16 text-on-surface-variant border-2 border-dashed border-outline-variant/55 rounded-2xl bg-surface-container-low/30 space-y-4">
                    <span className="material-symbols-outlined text-[48px] text-outline-variant">favorite_border</span>
                    <p className="text-body-md">
                      {t("tenantDash_noSavedFavoritesYet")}
                    </p>
                    <button
                      onClick={() => router.push("/suche")}
                      className="bg-primary text-on-primary px-5 py-2.5 rounded-xl text-label-sm font-bold hover:opacity-90 active:scale-95 transition-all shadow cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[18px]">search</span>
                      {t("tenantDash_searchProperties")}
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {favoriteListings.map((l) => {
                      const primaryPhoto = getDisplayPhoto(l.property_photos?.find((p: any) => p.is_primary)?.cdn_url || l.property_photos?.[0]?.cdn_url || "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80");
                      const totalRent = Math.round(parseFloat(l.rent_cold) + parseFloat(l.rent_utilities || 0) + parseFloat(l.rent_heating || 0));

                      return (
                        <div
                          key={l.id}
                          className="group bg-white rounded-xl border border-outline-variant overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
                        >
                          <div className="relative h-44 overflow-hidden bg-surface-container flex items-center justify-center">
                            <img
                              src={primaryPhoto}
                              alt={l.title}
                              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                              loading="lazy"
                            />
                            <button
                              onClick={() => handleRemoveFavorite(l.id)}
                              className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm p-1.5 rounded-full hover:bg-white transition-colors cursor-pointer text-red-500 hover:text-red-700 shadow-sm"
                              title={t("tenantDash_remove")}
                            >
                              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                            </button>
                          </div>
                          <div className="p-5 flex-grow flex flex-col justify-between">
                            <div>
                              <h3 className="text-[16px] font-bold text-primary leading-snug line-clamp-1 mb-1">{l.title}</h3>
                              <p className="text-[12px] text-on-surface-variant line-clamp-1 mb-4">📍 {l.street}, {l.zip} {normalizeCityName(l.city, language)}</p>
                              
                              <div className="grid grid-cols-3 gap-2 mb-4 border-t border-b border-outline-variant/40 py-2.5">
                                <div className="text-center">
                                  <span className="block text-[9px] font-bold uppercase tracking-wider text-on-surface-variant">{t("tenantDash_warmRent")}</span>
                                  <span className="text-[14px] font-bold text-primary">{formatPrice(totalRent)}</span>
                                </div>
                                <div className="text-center border-l border-r border-outline-variant/30">
                                  <span className="block text-[9px] font-bold uppercase tracking-wider text-on-surface-variant">{t("tenantDash_area")}</span>
                                  <span className="text-[14px] font-semibold text-primary">{l.size_sqm} m²</span>
                                </div>
                                <div className="text-center">
                                  <span className="block text-[9px] font-bold uppercase tracking-wider text-on-surface-variant">{t("tenantDash_rooms")}</span>
                                  <span className="text-[14px] font-semibold text-primary">{l.rooms}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <Link
                                href={`/objekt/${l.id}`}
                                className="flex-1 text-center bg-primary text-on-primary py-2 rounded-lg text-[12px] font-bold hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-sm"
                              >
                                {t("tenantDash_viewDetails")}
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 2. Tab: Profile Settings Form */}
            {activeTab === "profile" && (
              <div className="bg-white border border-outline-variant p-6 md:p-8 rounded-2xl shadow-sm space-y-6">
                <div>
                  <h2 className="text-headline-md font-bold text-primary">
                    {t("tenantDash_personalFinancialDetails")}
                  </h2>
                  <p className="text-body-md text-on-surface-variant mt-1 leading-relaxed">
                    {t("tenantDash_provideYourAcademicAndFinancia")}
                  </p>
                </div>

                {/* Membership Status Panel */}
                <div className="border border-outline-variant/60 rounded-2xl p-5 bg-surface-container-low/40">
                  <h3 className="text-label-md font-bold text-primary flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-[#f07d00]">card_membership</span>
                    {t("tenantDash_membershipPlanDetails")}
                  </h3>
                  
                  {!isPremium ? (
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                      <div>
                        <span className="bg-surface-container-high border border-outline-variant text-[11px] text-on-surface-variant font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                          {t("tenantDash_freeBasicPlan")}
                        </span>
                        <p className="text-[13px] text-on-surface-variant mt-2 max-w-xl">
                          {t("tenantDash_upgradeToPremiumToUnlockVerifi")}
                        </p>
                      </div>
                      <Link
                        href="/preise?plan=3months"
                        className="bg-[#f07d00] text-white px-6 py-2.5 rounded-xl font-bold text-[13px] hover:opacity-90 active:scale-95 transition-all shadow-md shadow-[#f07d00]/25 text-center flex-shrink-0"
                      >
                        {t("tenantDash_upgradeNow")}
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="bg-gradient-to-br from-[#f07d00]/5 to-transparent rounded-xl border-2 border-[#f07d00] p-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-[#f07d00] text-white text-[8px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-bl">
                          Active
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[#f07d00] text-[20px]">workspace_premium</span>
                          <span className="text-[16px] font-black text-primary">Heimstadt Premium ({subscription?.plan === "1month" ? "1 Monat" : subscription?.plan === "3months" ? "3 Monate" : "12 Monate"})</span>
                        </div>

                        {(() => {
                          const sub = subscription;
                          if (!sub) return null;
                          const start = new Date(sub.startDate).getTime();
                          const end = new Date(sub.endDate).getTime();
                          const total = end - start;
                          const elapsed = Date.now() - start;
                          const percentage = Math.max(0, Math.min(100, (elapsed / total) * 100));
                          const daysRemaining = Math.max(0, Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24)));
                          
                          return (
                            <div className="mt-4 space-y-2">
                              <div className="flex justify-between text-[11px] text-on-surface-variant font-semibold">
                                <span>{t("tenantDash_validity")}</span>
                                <span>{daysRemaining} {t("tenantDash_daysLeft")}</span>
                              </div>
                              <div className="w-full h-2.5 bg-surface-container-high rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-[#f07d00] rounded-full transition-all duration-500" 
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <div className="text-[11px] text-on-surface-variant/80 font-medium italic mt-1 text-right">
                                {t("tenantDash_expiresOn")} {new Date(sub.endDate).toLocaleDateString(t("tenantDash_enus"))}
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      <button
                        onClick={cancelPremium}
                        className="w-full border border-outline-variant text-on-surface-variant py-2.5 rounded-xl text-[12px] font-bold hover:bg-surface-container-low hover:text-error hover:border-error/40 active:scale-95 transition-all text-center cursor-pointer"
                      >
                        {t("tenantDash_cancelSubscription")}
                      </button>
                    </div>
                  )}
                </div>

                {errorMsg && (
                  <div className="p-4 text-[14px] text-error bg-error-container/30 border border-error/20 rounded-xl flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px]">warning</span>
                    <span>{errorMsg}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="p-4 text-[14px] text-primary bg-primary-fixed/30 border border-primary/20 rounded-xl flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    <span>{successMsg}</span>
                  </div>
                )}

                <form onSubmit={handleSaveProfile} className="space-y-6">
                  {/* Category 1: Identity */}
                  <div className="space-y-4">
                    <h3 className="text-label-md font-bold text-primary uppercase border-b border-outline-variant/60 pb-1.5">
                      {t("tenantDash_identityContact")}
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-label-sm text-on-surface font-semibold">
                          {t("tenantDash_fullName")}
                        </label>
                        <input
                          type="text"
                          required
                          value={profileForm.full_name}
                          onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                          className="w-full h-11 px-4 bg-surface-container-low border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-[15px]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-label-sm text-on-surface font-semibold">
                          {t("tenantDash_phoneNumber")}
                        </label>
                        <input
                          type="tel"
                          required
                          placeholder="+49 176 123456"
                          value={profileForm.phone}
                          onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                          className="w-full h-11 px-4 bg-surface-container-low border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-[15px]"
                        />
                      </div>



                      <div className="space-y-1">
                        <label className="block text-label-sm text-on-surface font-semibold">
                          {t("tenantDash_emailAddressLocked")}
                        </label>
                        <input
                          type="email"
                          disabled
                          value={user?.email || ""}
                          className="w-full h-11 px-4 bg-surface-container border border-outline-variant rounded-xl outline-none text-[15px] opacity-60 cursor-not-allowed"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-label-sm text-on-surface font-semibold">
                          {t("tenantDash_nationality")}
                        </label>
                        <input
                          type="text"
                          placeholder="z.B. Deutsch, Französisch"
                          value={profileForm.nationality}
                          onChange={(e) => setProfileForm({ ...profileForm, nationality: e.target.value })}
                          className="w-full h-11 px-4 bg-surface-container-low border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-[15px]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Category 2: Academic & Income details */}
                  <div className="space-y-4 pt-4">
                    <h3 className="text-label-md font-bold text-primary uppercase border-b border-outline-variant/60 pb-1.5">
                      {t("tenantDash_academicFinancialDetails")}
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1 col-span-1 md:col-span-2">
                        <label className="block text-label-sm text-on-surface font-semibold">
                          {t("tenantDash_universityName")}
                        </label>
                        <input
                          type="text"
                          placeholder="z.B. TU Berlin, LMU München"
                          value={profileForm.university}
                          onChange={(e) => setProfileForm({ ...profileForm, university: e.target.value })}
                          className="w-full h-11 px-4 bg-surface-container-low border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-[15px]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-label-sm text-on-surface font-semibold">
                          {t("tenantDash_enrollmentDate")}
                        </label>
                        <input
                          type="date"
                          value={profileForm.enrollment_date}
                          onChange={(e) => setProfileForm({ ...profileForm, enrollment_date: e.target.value })}
                          className="w-full h-11 px-4 bg-surface-container-low border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-[15px]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-label-sm text-on-surface font-semibold">
                          {t("tenantDash_expectedGraduation")}
                        </label>
                        <input
                          type="date"
                          value={profileForm.graduation_date}
                          onChange={(e) => setProfileForm({ ...profileForm, graduation_date: e.target.value })}
                          className="w-full h-11 px-4 bg-surface-container-low border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-[15px]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-label-sm text-on-surface font-semibold">
                          {t("tenantDash_employmentStatus")}
                        </label>
                        <select
                          value={profileForm.employment_status}
                          onChange={(e) => setProfileForm({ ...profileForm, employment_status: e.target.value })}
                          className="w-full h-11 px-4 bg-surface-container-low border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-[15px]"
                        >
                          <option value="">{t("tenantDash_select")}</option>
                          <option value="student">{t("tenantDash_studentFulltime")}</option>
                          <option value="working_student">{t("tenantDash_workingStudent")}</option>
                          <option value="employed">{t("tenantDash_employed")}</option>
                          <option value="intern">{t("tenantDash_intern")}</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-label-sm text-on-surface font-semibold">
                          {t("tenantDash_monthlyNetIncome")}
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          placeholder="z.B. 950"
                          value={profileForm.monthly_income}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "" || /^[0-9]*$/.test(val)) {
                              setProfileForm({ ...profileForm, monthly_income: val });
                            }
                          }}
                          className="w-full h-11 px-4 bg-surface-container-low border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-[15px]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-outline-variant flex justify-end">
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="bg-primary text-on-primary px-8 h-12 rounded-xl font-bold hover:opacity-90 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {savingProfile && (
                        <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      )}
                      {t("tenantDash_saveChanges")}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* 3. Tab: My Bookings details */}
            {activeTab === "bookings" && (
              <div className="space-y-6">
                {!activeBooking ? (
                  <div className="bg-white border border-outline-variant p-8 rounded-2xl shadow-sm text-center space-y-4">
                    <span className="material-symbols-outlined text-[56px] text-primary">book_online</span>
                    <h3 className="text-headline-md font-bold text-primary">
                      {t("tenantDash_noActiveBookings")}
                    </h3>
                    <p className="text-body-md text-on-surface-variant max-w-md mx-auto">
                      {t("tenantDash_youHaventSubmittedAnyBookingRe")}
                    </p>
                    <button
                      onClick={() => router.push("/suche")}
                      className="bg-primary text-on-primary px-6 py-3 rounded-xl text-label-md font-bold hover:opacity-90 active:scale-95 transition-all shadow cursor-pointer inline-flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[20px]">search</span>
                      {t("searchBtn")}
                    </button>
                  </div>
                ) : (
                  <div className="bg-white border border-outline-variant p-6 md:p-8 rounded-2xl shadow-sm space-y-8">
                    {/* Booking Details Columns Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-6 border-b border-outline-variant/60">
                      <div>
                        <span className="text-[12px] font-bold text-secondary uppercase tracking-widest leading-none block mb-2">
                          Application Summary
                        </span>
                        <h2 className="text-headline-lg-mobile md:text-headline-md font-bold text-primary">
                          {property?.title || "Mietobjekt"}
                        </h2>
                        <p className="text-body-md text-on-surface-variant mt-1.5">
                          {property?.street}, {property?.zip} {normalizeCityName(property?.city, language)}
                        </p>
                        
                        <div className="mt-6 space-y-3.5">
                          <div className="flex items-center gap-3 text-on-surface">
                            <span className="material-symbols-outlined text-primary text-[20px]">calendar_today</span>
                            <span className="text-[14px]">
                              <strong>{t("tenantDash_period")}</strong>
                              {new Date(activeBooking.move_in_date).toLocaleDateString(t("tenantDash_enus"))} - {new Date(activeBooking.move_out_date).toLocaleDateString(t("tenantDash_enus"))}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-3 text-on-surface">
                            <span className="material-symbols-outlined text-primary text-[20px]">euro</span>
                            <span className="text-[14px]">
                              <strong>{t("tenantDash_monthlyRent")}</strong>
                              {formatPrice(Number(property?.rent_cold || activeBooking.rent_total))}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-on-surface">
                            <span className="material-symbols-outlined text-primary text-[20px]">hourglass_empty</span>
                            <span className="text-[14px]">
                              <strong>{t("tenantDash_moveinIn")}</strong>
                              {getCountdown(activeBooking.move_in_date)} {t("tenantDash_days")}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-surface-container-low border border-outline-variant p-6 rounded-2xl space-y-4 self-start">
                        <h4 className="text-label-md font-bold text-primary border-b border-outline-variant pb-2 uppercase tracking-wide">
                          {t("tenantDash_nextActionsRequired")}
                        </h4>
                        
                        {activeBooking.status === "pending" && (
                          <p className="text-[13px] text-on-surface-variant leading-relaxed">
                            {t("tenantDash_theLandlordIsCurrentlyReviewin")}
                          </p>
                        )}
                        {activeBooking.status === "docs_review" && (
                          <p className="text-[13px] text-on-surface-variant leading-relaxed">
                            {t("tenantDash_weAreCheckingYourDocumentsStat")}
                          </p>
                        )}
                        {activeBooking.status === "approved" && (
                          <p className="text-[13px] text-on-surface-variant leading-relaxed">
                            {t("tenantDash_congratulationsYourApplication")}
                          </p>
                        )}
                        
                        <button
                          onClick={() => router.push(`/buchen/${activeBooking.id}`)}
                          className="w-full bg-primary text-on-primary py-3 rounded-xl text-label-md font-bold hover:opacity-90 active:scale-95 transition-all cursor-pointer text-center mt-2"
                        >
                          {t("tenantDash_openBookingCenter")}
                        </button>
                      </div>
                    </div>
                    
                    {/* Visual Timeline details */}
                    <div className="space-y-4">
                      <h3 className="text-label-md font-bold text-primary uppercase">
                        {t("tenantDash_visualizedApplicationTimeline")}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-7 gap-4">
                        {pipeline.map((step, idx) => (
                          <div 
                            key={idx} 
                            className={`p-4 rounded-xl border text-center transition-all ${
                              step.active 
                                ? "bg-primary-fixed/20 border-primary/30 text-primary font-bold shadow-sm" 
                                : "bg-surface-container-low border-outline-variant text-on-surface-variant"
                            }`}
                          >
                            <div className={`w-6 h-6 rounded-full mx-auto mb-2 flex items-center justify-center text-[10px] font-bold ${
                              step.active ? "bg-primary text-on-primary" : "bg-outline-variant text-on-surface-variant"
                            }`}>
                              {idx + 1}
                            </div>
                            <p className="text-[11px] leading-tight mt-1">
                              {step.label}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                )}
              </div>
            )}

            {/* 4. Tab: Verification Documents Upload Checklist */}
            {activeTab === "documents" && (
              <div className="bg-white border border-outline-variant p-6 md:p-8 rounded-2xl shadow-sm space-y-6">
                <div>
                  <h2 className="text-headline-md font-bold text-primary">
                    {t("tenantDash_verificationDocuments")}
                  </h2>
                  <p className="text-body-md text-on-surface-variant mt-1 leading-relaxed">
                    {t("tenantDash_uploadYourRequiredVerification")}
                  </p>
                </div>

                {/* Verified Bewerberportfolio Status Card */}
                <div className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
                  isPremium 
                    ? "border-primary bg-primary-fixed/10 text-primary" 
                    : "border-outline-variant bg-surface-container-low text-on-surface-variant"
                }`}>
                  <div className="flex items-center gap-3">
                    <span className={`material-symbols-outlined text-[28px] ${isPremium ? "text-primary" : "text-outline-variant"}`}>
                      {isPremium ? "verified" : "verified_user"}
                    </span>
                    <div>
                      <h4 className="font-bold text-label-md">
                        {t("tenantDash_verifiedApplicantPortfolio")}
                      </h4>
                      <p className="text-[11px] text-on-surface-variant mt-0.5">
                        {isPremium 
                          ? (t("tenantDash_yourVerifiedPortfolioIsFullyVi"))
                          : (t("tenantDash_yourVerifiedPortfolioWillOnlyB"))
                        }
                      </p>
                    </div>
                  </div>
                  {!isPremium && (
                    <Link
                      href="/preise?plan=3months"
                      className="bg-[#f07d00] text-white px-4 py-2 rounded-lg text-[12px] font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm whitespace-nowrap"
                    >
                      {t("tenantDash_unlockNow")}
                    </Link>
                  )}
                </div>

                {/* Success / Error feedback */}
                {successMsg && activeTab === "documents" && (
                  <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl text-[13px] font-semibold">
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    {successMsg}
                  </div>
                )}
                {errorMsg && activeTab === "documents" && (
                  <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-[13px] font-semibold">
                    <span className="material-symbols-outlined text-[18px]">error</span>
                    {errorMsg}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {documentTypesList.map((docType) => {
                    const status = getDocStatus(docType.key);
                    return (
                      <div 
                        key={docType.key} 
                        className={`border rounded-2xl p-5 flex flex-col justify-between transition-all ${
                          status === "approved"
                            ? "border-primary bg-primary-fixed/15"
                            : "border-outline-variant bg-surface-container-low hover:border-primary/50"
                        }`}
                      >
                        <div className="flex gap-4 items-start">
                          <div className="bg-white p-3 rounded-xl shadow-sm border border-outline-variant/60 flex-shrink-0 flex items-center justify-center">
                            <span className="material-symbols-outlined text-primary text-[26px]">
                              {docType.icon}
                            </span>
                          </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-label-md font-bold text-primary">
                                {getDocDisplayName(docType.key)}
                              </h4>
                              {docType.optional ? (
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface-variant text-on-surface-variant border border-outline-variant/60">
                                  {t("tenantDash_optional")}
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                                  {t("tenantDash_required")}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-on-surface-variant uppercase mt-0.5 font-semibold tracking-wider">
                              Status: {status}
                            </p>
                            {/* Show uploaded file name */}
                            {status !== "missing" && (() => {
                              const docRecord = docs.find((d) => d.doc_type === docType.key);
                              return docRecord?.file_name ? (
                                <p className="text-[11px] text-on-surface-variant/70 truncate max-w-[160px] mt-0.5">
                                  📎 {docRecord.file_name}
                                </p>
                              ) : null;
                            })()}
                          </div>
                        </div>

                        <div className="mt-6 flex justify-between items-center">
                          {status === "approved" && (
                            <span className="flex items-center gap-1.5 text-primary text-[12px] font-bold">
                              <span className="material-symbols-outlined text-[16px]">check_circle</span>
                              Approved (OK)
                            </span>
                          )}
                          {status === "pending" && (
                            <span className="flex items-center gap-1.5 text-secondary text-[12px] font-bold">
                              <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                              {t("tenantDash_underReview")}
                            </span>
                          )}
                          {status === "rejected" && (
                            <span className="flex items-center gap-1.5 text-error text-[12px] font-bold">
                              <span className="material-symbols-outlined text-[16px]">error</span>
                              {t("tenantDash_pleaseReupload")}
                            </span>
                          )}
                          {status === "missing" && (
                            <span className="flex items-center gap-1.5 text-on-surface-variant text-[12px] font-medium italic">
                              {t("tenantDash_notUploadedYet")}
                            </span>
                          )}

                          <div className="flex items-center gap-2">
                            {/* Upload button with hidden file input */}
                            <label
                              htmlFor={`doc-upload-${docType.key}`}
                              className={`flex items-center gap-1.5 bg-primary text-on-primary px-4 py-2 rounded-lg text-[12px] font-bold hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-sm select-none ${uploadingDoc === docType.key ? "opacity-60 pointer-events-none" : ""}`}
                            >
                              {uploadingDoc === docType.key ? (
                                <>
                                  <span className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                                  <span>{t("tenantDash_uploading")}</span>
                                </>
                              ) : (
                                <>
                                  <span className="material-symbols-outlined text-[14px]">upload_file</span>
                                  <span>{status === "missing" ? (t("tenantDash_upload")) : (t("tenantDash_replace"))}</span>
                                </>
                              )}
                            </label>
                            <input
                              id={`doc-upload-${docType.key}`}
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              className="sr-only"
                              onChange={(e) => handleDocUpload(docType.key, e)}
                              disabled={uploadingDoc !== null}
                            />
                            {status !== "missing" && (
                              <button
                                onClick={() => handleDocRemove(docType.key)}
                                className="px-3 py-2 rounded-lg text-[12px] font-bold border border-error text-error hover:bg-error/5 active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                                title={t("tenantDash_removeDocument")}
                              >
                                <span className="material-symbols-outlined text-[14px]">delete</span>
                                <span>{t("tenantDash_remove")}</span>
                              </button>
                            )}
                            {/* Manage in booking page if booking exists */}
                            {activeBooking && (
                              <button
                                onClick={() => router.push(`/buchen/${activeBooking.id}`)}
                                className="px-3 py-2 rounded-lg text-[12px] font-bold border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary active:scale-95 transition-all cursor-pointer"
                                title={t("tenantDash_openInBookingPortal")}
                              >
                                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 5. Tab: Saved Filters */}
            {activeTab === "saved-filters" && (
              <div className="bg-white border border-outline-variant p-6 md:p-8 rounded-2xl shadow-sm space-y-6">
                <div>
                  <h2 className="text-headline-md font-bold text-primary flex items-center gap-2">
                    <span className="material-symbols-outlined text-[28px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>bookmarks</span>
                    {t("tenantDash_savedSearches")}
                  </h2>
                  <p className="text-body-md text-on-surface-variant mt-1 leading-relaxed">
                    {t("tenantDash_manageYourSavedSearchFiltersAp")}
                  </p>
                </div>

                {savedFiltersLoading ? (
                  <div className="flex justify-center items-center py-16">
                    <div className="relative w-16 h-16 flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full border-[3px] border-[#002046]/15 border-t-[#002046] animate-spin" />
                      <div className="absolute w-10 h-10 rounded-full border-[3px] border-[#aec7f7]/20 border-b-[#aec7f7] animate-spin [animation-direction:reverse] [animation-duration:1s]" />
                      <div className="absolute w-12 h-12 bg-[#002046]/5 rounded-full blur-md animate-pulse" />
                    </div>
                  </div>
                ) : savedFilters.length === 0 ? (
                  <div className="text-center py-16 text-on-surface-variant border-2 border-dashed border-outline-variant/55 rounded-2xl bg-surface-container-low/30 space-y-4">
                    <span className="material-symbols-outlined text-[48px] text-outline-variant">bookmarks</span>
                    <p className="text-body-md">
                      {t("tenantDash_noSavedSearchesYet")}
                    </p>
                    <button
                      onClick={() => router.push("/suche")}
                      className="bg-primary text-on-primary px-5 py-2.5 rounded-xl text-label-sm font-bold hover:opacity-90 active:scale-95 transition-all shadow cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[18px]">search</span>
                      {t("tenantDash_startANewSearch")}
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {savedFilters.map((filter) => {
                      const f = filter.filters;
                      const hasBadges = f.city || f.maxPrice || f.rooms || f.moveIn || f.moveOut || f.furnished !== null || f.petsAllowed || (f.amenities && f.amenities.length > 0) || (f.wgSize && f.wgSize !== "regardless") || (f.roommates && f.roommates !== "regardless") || (f.rating && f.rating !== "any");

                      return (
                        <div
                          key={filter.id}
                          className="bg-white rounded-xl border border-outline-variant p-5 hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex justify-between items-start gap-2 mb-3">
                              <h3 className="text-[16px] font-bold text-primary leading-snug line-clamp-1">
                                {filter.name}
                              </h3>
                              <button
                                onClick={() => handleDeleteSavedFilter(filter.id)}
                                className="text-on-surface-variant hover:text-error transition-colors p-1 rounded-md hover:bg-surface-container-low cursor-pointer"
                                title={t("tenantDash_delete")}
                              >
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                              </button>
                            </div>
                            
                            <p className="text-[11px] text-on-surface-variant/75 mb-4">
                              {t("tenantDash_savedOn")}
                              {new Date(filter.created_at).toLocaleDateString(t("tenantDash_enus"))}
                            </p>

                            {hasBadges && (
                              <div className="flex flex-wrap gap-1.5 mb-5">
                                {f.city && (
                                  <span className="text-[11px] font-bold bg-primary/5 text-primary border border-primary/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[12px]">location_on</span>
                                    {f.city}
                                  </span>
                                )}
                                {f.maxPrice && (
                                  <span className="text-[11px] font-bold bg-[#735c00]/5 text-[#735c00] border border-[#735c00]/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[12px]">euro</span>
                                    Max: {formatPrice(Number(f.maxPrice))}
                                  </span>
                                )}
                                {f.rooms && (
                                  <span className="text-[11px] font-bold bg-[#1b365d]/5 text-[#1b365d] border border-[#1b365d]/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[12px]">bed</span>
                                    {f.rooms === "wg" ? (t("tenantDash_wgRoom")) : `${f.rooms} ${t("tenantDash_rooms")}`}
                                  </span>
                                )}
                                {f.moveIn && (
                                  <span className="text-[11px] font-semibold bg-surface-variant text-on-surface-variant border border-outline-variant/60 px-2 py-0.5 rounded-md">
                                    📅 {t("tenantDash_moveIn")}: {new Date(f.moveIn).toLocaleDateString(t("tenantDash_enus"))}
                                  </span>
                                )}
                                {f.moveOut && (
                                  <span className="text-[11px] font-semibold bg-surface-variant text-on-surface-variant border border-outline-variant/60 px-2 py-0.5 rounded-md">
                                    📅 {t("tenantDash_moveOut")}: {new Date(f.moveOut).toLocaleDateString(t("tenantDash_enus"))}
                                  </span>
                                )}
                                {f.furnished !== null && (
                                  <span className="text-[11px] font-semibold bg-surface-variant text-on-surface-variant border border-outline-variant/60 px-2 py-0.5 rounded-md">
                                    🛋️ {f.furnished ? (t("tenantDash_furnished")) : (t("tenantDash_unfurnished"))}
                                  </span>
                                )}
                                {f.petsAllowed && (
                                  <span className="text-[11px] font-semibold bg-surface-variant text-on-surface-variant border border-outline-variant/60 px-2 py-0.5 rounded-md">
                                    🐾 {t("tenantDash_petsAllowed")}
                                  </span>
                                )}
                                {f.wgSize && f.wgSize !== "regardless" && (
                                  <span className="text-[11px] font-semibold bg-surface-variant text-on-surface-variant border border-outline-variant/60 px-2 py-0.5 rounded-md">
                                    👥 WG: {f.wgSize}
                                  </span>
                                )}
                                {f.roommates && f.roommates !== "regardless" && (
                                  <span className="text-[11px] font-semibold bg-surface-variant text-on-surface-variant border border-outline-variant/60 px-2 py-0.5 rounded-md font-sans">
                                    🧑‍🤝‍🧑 {f.roommates}
                                  </span>
                                )}
                                {f.rating && f.rating !== "any" && (
                                  <span className="text-[11px] font-semibold bg-surface-variant text-on-surface-variant border border-outline-variant/60 px-2 py-0.5 rounded-md">
                                    ★ Rating: {f.rating === "4_plus" ? "4+" : "3+"}
                                  </span>
                                )}
                                {f.amenities && f.amenities.map((a: string) => (
                                  <span key={a} className="text-[11px] font-semibold bg-surface-variant/80 text-on-surface-variant/80 border border-outline-variant/30 px-2 py-0.5 rounded-md capitalize">
                                    {a}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => handleApplySavedFilter(filter)}
                            className="w-full text-center bg-primary text-on-primary py-2.5 rounded-xl text-[12px] font-bold hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                          >
                            <span className="material-symbols-outlined text-[16px]">travel_explore</span>
                            {t("tenantDash_applySearch")}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
      <Footer />
    </>
  );
}

export default function TenantDashboard() {
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
      <TenantDashboardContent />
    </Suspense>
  );
}

