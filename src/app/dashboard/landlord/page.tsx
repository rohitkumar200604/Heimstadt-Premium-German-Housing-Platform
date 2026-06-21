"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { supabase, isSupabaseConfigured } from "@/utils/supabase/client";
import Footer from "@/components/layout/Footer";
import Link from "next/link";
import { getDisplayPhoto } from "@/utils/get-display-photo";
import { normalizeCityName } from "@/utils/translations";

function promiseTimeout<T>(promise: any, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Database query timed out"));
    }, ms);

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

function LandlordDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, loading, refreshProfile, isPremium, subscription } = useAuth();
  const { t, language } = useLanguage();
  
  // Navigation State
  const [activeTab, setActiveTab] = useState<"overview" | "profile" | "bookings" | "properties" | "favorites">("overview");

  // Favorites States
  const [favoriteListings, setFavoriteListings] = useState<any[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);

  // Database Data States
  const [landlordProfile, setLandlordProfile] = useState<any>(null);
  const [bookingRequests, setBookingRequests] = useState<any[]>([]);
  const [propertiesList, setPropertiesList] = useState<any[]>([]);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  // Form State
  const [profileForm, setProfileForm] = useState({
    full_name: "",
    phone: "",
    stripe_account_id: "",
    iban_last4: "",
  });

  // Action feedback states
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
    }
    if (!loading && profile && profile.role !== "landlord") {
      router.push("/dashboard/tenant");
    }
  }, [user, profile, loading, router]);

  // Read active tab from URL query params
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (
      tabParam === "overview" ||
      tabParam === "profile" ||
      tabParam === "bookings" ||
      tabParam === "properties" ||
      tabParam === "favorites"
    ) {
      setActiveTab(tabParam as any);
    } else {
      setActiveTab("overview");
    }
  }, [searchParams]);

  const fetchLandlordData = async () => {
    if (!user) return;
    if (!hasLoadedOnce) {
      setLoadingDashboard(true);
    }

    if (!isSupabaseConfigured()) {
      const localWhatsapp = localStorage.getItem(`heimat_mock_landlord_whatsapp_${user.id}`) === "true";
      setLandlordProfile({
        id: "mock-landlord-id",
        user_id: user.id,
        subscription_tier: isPremium ? "pro" : "free",
        whatsapp_enabled: localWhatsapp,
        stripe_account_id: "acct_mock123",
        iban_last4: "1234",
      });
      setProfileForm({
        full_name: profile?.full_name || "Mock Landlord",
        phone: profile?.phone || "+49 176 123456",
        stripe_account_id: "acct_mock123",
        iban_last4: "1234",
      });
      setBookingRequests([
        {
          id: "mock-booking-1",
          status: "pending",
          move_in_date: "2026-09-01",
          rent_total: 850,
          tenant_id: "mock-tenant-id",
          tenant: {
            id: "mock-tenant-id",
            full_name: "Mock Tenant",
            email: "tenant@mock.com",
            tenant_profiles: { monthly_income: 1200 },
            subscriptions: [{ status: "active", plan: "3months" }]
          },
          properties: { id: "berlin-studio", title: "Bright Studio Apartment near Alexanderplatz" },
          ai_tenant_scores: [{ overall_score: 92 }]
        }
      ]);
      setPropertiesList([
        {
          id: "berlin-studio",
          title: language === "de" ? "Helles Studio-Apartment nahe Alexanderplatz" : "Bright Studio Apartment near Alexanderplatz",
          city: "Berlin", street: "Karl-Liebknecht-Str. 12", zip: "10178",
          rooms: 1, size_sqm: 38, rent_cold: 720, rent_utilities: 80, rent_heating: 70,
          pets_allowed: true, furnished: false,
          amenities: ["balcony", "kitchen"],
          status: "active",
          property_type: "Apartment"
        }
      ]);
      setLoadingDashboard(false);
      setHasLoadedOnce(true);
      return;
    }

    try {
      // 1. Fetch landlord profile details
      const { data: lpData, error: lpErr } = await promiseTimeout(
        supabase
          .from("landlord_profiles")
          .select("*")
          .eq("user_id", user.id)
          .single(),
        3000
      ) as any;
      
      if (!lpErr && lpData) {
        setLandlordProfile(lpData);
        setProfileForm({
          full_name: profile?.full_name || "",
          phone: profile?.phone || "",
          stripe_account_id: lpData.stripe_account_id || "",
          iban_last4: lpData.iban_last4 || "",
        });
      } else {
        setProfileForm(prev => ({
          ...prev,
          full_name: profile?.full_name || "",
          phone: profile?.phone || "",
        }));
        if (!isSupabaseConfigured()) {
          const localWhatsapp = localStorage.getItem(`heimat_mock_landlord_whatsapp_${user.id}`) === "true";
          setLandlordProfile({
            id: "mock-landlord-id",
            user_id: user.id,
            subscription_tier: isPremium ? "pro" : "free",
            whatsapp_enabled: localWhatsapp,
            stripe_account_id: "acct_mock123",
            iban_last4: "1234",
          });
          setProfileForm({
            full_name: profile?.full_name || "Mock Landlord",
            phone: profile?.phone || "+49 176 123456",
            stripe_account_id: "acct_mock123",
            iban_last4: "1234",
          });
        }
      }

      // 2. Fetch booking requests for properties owned by landlord
      const { data: bookingsData, error: bookingsErr } = await promiseTimeout(
        supabase
          .from("bookings")
          .select(`
            id,
            status,
            move_in_date,
            rent_total,
            tenant_id,
            tenant:profiles!tenant_id (
              id,
              full_name,
              email,
              tenant_profiles (
                monthly_income
              ),
              subscriptions (
                status,
                plan
              )
            ),
            properties (
              id,
              title
            ),
            ai_tenant_scores (
              overall_score
            )
          `)
          .eq("landlord_id", user.id),
        3000
      ) as any;
      
      if (bookingsErr) throw bookingsErr;

      // Sort bookings: Premium tenant applications at the top
      const sortedBookings = (bookingsData || []).sort((a: any, b: any) => {
        const aTenant = (Array.isArray(a.tenant) ? a.tenant[0] : a.tenant) as any;
        const bTenant = (Array.isArray(b.tenant) ? b.tenant[0] : b.tenant) as any;
        const aIsPremium = aTenant?.subscriptions?.some((s: any) => s.status === 'active') || false;
        const bIsPremium = bTenant?.subscriptions?.some((s: any) => s.status === 'active') || false;
        if (aIsPremium && !bIsPremium) return -1;
        if (!aIsPremium && bIsPremium) return 1;
        return 0;
      });

      setBookingRequests(sortedBookings);

      // 3. Fetch properties owned by landlord
      if (lpData) {
        const { data: propData, error: propErr } = await promiseTimeout(
          supabase
            .from("properties")
            .select("*")
            .eq("landlord_id", lpData.id),
          3000
        ) as any;
        
        if (!propErr) {
          setPropertiesList(propData || []);
        }
      }
    } catch (err) {
      console.error("Error loading landlord dashboard:", err);
    } finally {
      setLoadingDashboard(false);
      setHasLoadedOnce(true);
    }
  };

  useEffect(() => {
    fetchLandlordData();
  }, [user, profile]);

  const toggleWhatsApp = async () => {
    if (!user || !landlordProfile || !isProTier) return;
    const nextVal = !landlordProfile.whatsapp_enabled;
    if (!isSupabaseConfigured()) {
      setLandlordProfile({ ...landlordProfile, whatsapp_enabled: nextVal });
      localStorage.setItem(`heimat_mock_landlord_whatsapp_${user.id}`, String(nextVal));
      return;
    }
    try {
      const { error } = await supabase
        .from("landlord_profiles")
        .update({ whatsapp_enabled: nextVal })
        .eq("user_id", user.id);
      if (error) throw error;
      setLandlordProfile({ ...landlordProfile, whatsapp_enabled: nextVal });
    } catch (err) {
      console.error("Error toggling WhatsApp:", err);
    }
  };

  const toggleSubscription = async () => {
    if (!user || !landlordProfile) return;
    const isPro = landlordProfile.subscription_tier === "pro";
    const nextVal = isPro ? "free" : "pro";
    try {
      if (isSupabaseConfigured()) {
        // 1. Update landlord_profiles tier
        const { error } = await supabase
          .from("landlord_profiles")
          .update({ 
            subscription_tier: nextVal,
            // Disable whatsapp if downgrading
            ...(isPro ? { whatsapp_enabled: false } : {})
          })
          .eq("user_id", user.id);
        if (error) throw error;

        // 2. If cancelling premium: clear localStorage cache + mark DB subscription canceled
        if (isPro) {
          // Clear the localStorage entry so AuthContext stops treating user as premium
          localStorage.removeItem(`heimat_sub_${user.id}`);

          // Mark any active subscriptions as canceled in the DB (enum: 'canceled')
          await supabase
            .from("subscriptions")
            .update({ status: "canceled", cancel_at_period_end: true })
            .eq("user_id", user.id)
            .eq("status", "active");
        }
      } else {
        if (isPro) {
          localStorage.removeItem(`heimat_sub_${user.id}`);
          localStorage.removeItem(`heimat_mock_landlord_whatsapp_${user.id}`);
        } else {
          const start = new Date();
          const end = new Date();
          end.setMonth(end.getMonth() + 3);
          localStorage.setItem(`heimat_sub_${user.id}`, JSON.stringify({
            plan: "3months",
            status: "active",
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            cancelAtPeriodEnd: false,
          }));
        }
      }

      // 3. Update local landlordProfile state
      setLandlordProfile({ 
        ...landlordProfile, 
        subscription_tier: nextVal,
        ...(isPro ? { whatsapp_enabled: false } : {})
      });

      // 4. Refresh AuthContext so isPremium & subscription are recomputed
      await refreshProfile();

      // 5. Show custom success popup if we just cancelled the premium plan
      if (isPro) {
        alert(
          language === "de"
            ? "Ihr Premium-Abonnement wurde erfolgreich gekündigt."
            : "Your premium subscription has been successfully cancelled."
        );
      }
    } catch (err) {
      console.error("Error updating subscription tier:", err);
    }
  };

  // Landlord Profile save handler
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setSavingProfile(true);

    try {
      if (!user) throw new Error("No authenticated user");

      // 1. Update profiles
      const { error: pErr } = await supabase
        .from("profiles")
        .update({
          full_name: profileForm.full_name,
          phone: profileForm.phone,
        })
        .eq("id", user.id);
      if (pErr) throw pErr;

      // 2. Update landlord_profiles (upsert)
      const { data: updatedLp, error: lErr } = await supabase
        .from("landlord_profiles")
        .upsert({
          user_id: user.id,
          stripe_account_id: profileForm.stripe_account_id || null,
          iban_last4: profileForm.iban_last4 || null,
        }, { onConflict: "user_id" })
        .select()
        .single();
      if (lErr) throw lErr;

      setLandlordProfile(updatedLp);
      setSuccessMsg(
        language === "de"
          ? "Vermieter-Details erfolgreich gespeichert!"
          : "Landlord details successfully saved!"
      );
      
      await refreshProfile();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
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
          title: language === "de" ? "Helles Studio-Apartment nahe Alexanderplatz" : "Bright Studio Apartment near Alexanderplatz",
          city: "Berlin", street: "Karl-Liebknecht-Str. 12", zip: "10178",
          rooms: 1, size_sqm: 38, rent_cold: 720, rent_utilities: 80, rent_heating: 70,
          pets_allowed: true, furnished: false,
          amenities: ["balcony", "kitchen"],
          status: "active",
          property_photos: [{ cdn_url: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80", is_primary: true }]
        },
        {
          id: "munich-expat",
          title: language === "de" ? "Premium 3-Zimmer-Wohnung am Englischen Garten" : "Premium 3-Room Apartment at Englischen Garten",
          city: "München", street: "Königinstraße 44", zip: "80539",
          rooms: 3, size_sqm: 82, rent_cold: 1650, rent_utilities: 150, rent_heating: 110,
          pets_allowed: false, furnished: true,
          amenities: ["kitchen", "parking"],
          status: "active",
          property_photos: [{ cdn_url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80", is_primary: true }]
        },
        {
          id: "hamburg-loft",
          title: language === "de" ? "Stilvolles Loft in der Speicherstadt" : "Stylish Loft in Speicherstadt",
          city: "Hamburg", street: "Am Sandtorkai 10", zip: "20457",
          rooms: 2, size_sqm: 65, rent_cold: 1120, rent_utilities: 110, rent_heating: 90,
          pets_allowed: true, furnished: true,
          amenities: ["balcony", "kitchen", "garden"],
          status: "active",
          property_photos: [{ cdn_url: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80", is_primary: true }]
        },
        {
          id: "berlin-wg",
          title: language === "de" ? "Gemütliches Zimmer in Studenten-WG" : "Cozy Room in Student Shared Apartment",
          city: "Berlin", street: "Königin-Luise-Str. 15", zip: "14195",
          rooms: 1, size_sqm: 20, rent_cold: 450, rent_utilities: 60, rent_heating: 40,
          pets_allowed: true, furnished: false,
          amenities: ["kitchen"],
          status: "active",
          property_photos: [{ cdn_url: "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80", is_primary: true }]
        },
        {
          id: "cologne-studio",
          title: language === "de" ? "Modernes Studio im Herzen Kölns" : "Modern Studio in Cologne City Centre",
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

  useEffect(() => {
    if (activeTab === "favorites") {
      fetchFavorites();
    }
  }, [activeTab]);

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

  const isProTier = landlordProfile?.subscription_tier === "pro" || isPremium;

  return (
    <>
      <div className="flex-grow py-12 px-5 max-w-[1280px] mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 mb-10">
          <div>
            <span className="text-[14px] text-secondary font-bold uppercase tracking-wider block mb-1">
              {t("landlordDashTitle")}
            </span>
            <h1 className="text-display-lg-mobile md:text-headline-lg font-bold text-primary">
              {t("welcome")}, {profile?.full_name || "Vermieter"}!
            </h1>
          </div>
          
          <Link
            href="/inserieren"
            className="bg-primary text-on-primary px-6 py-3.5 rounded-xl text-label-md font-bold hover:opacity-90 active:scale-95 transition-all shadow cursor-pointer self-start sm:self-auto flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">add_home</span>
            {t("addNewProperty")}
          </Link>
        </div>

        {/* Tabbed Layout - Sidebar Left, Main Right */}
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* ── Sidebar Navigation ─────────────────────────── */}
          <aside className="w-full lg:w-64 bg-white/90 backdrop-blur-md border border-outline-variant rounded-2xl p-4 shadow-sm flex flex-col gap-1.5 flex-shrink-0">
            <button
              onClick={() => setActiveTab("overview")}
              className={`flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-left text-label-md font-bold transition-all ${
                activeTab === "overview"
                  ? "bg-primary text-on-primary shadow-md"
                  : "text-on-surface-variant hover:bg-surface-container-low hover:text-primary"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">space_dashboard</span>
              <span>{language === "de" ? "Übersicht" : "Overview"}</span>
            </button>
            
            <button
              onClick={() => setActiveTab("profile")}
              className={`flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-left text-label-md font-bold transition-all ${
                activeTab === "profile"
                  ? "bg-primary text-on-primary shadow-md"
                  : "text-on-surface-variant hover:bg-surface-container-low hover:text-primary"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">account_circle</span>
              <span>{language === "de" ? "Profil & Finanzen" : "Profile & Finance"}</span>
            </button>
            
            <button
              onClick={() => setActiveTab("bookings")}
              className={`flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-left text-label-md font-bold transition-all ${
                activeTab === "bookings"
                  ? "bg-primary text-on-primary shadow-md"
                  : "text-on-surface-variant hover:bg-surface-container-low hover:text-primary"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">book_online</span>
              <span>{language === "de" ? "Buchungsanfragen" : "Booking Requests"}</span>
            </button>
            
            <button
              onClick={() => setActiveTab("properties")}
              className={`flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-left text-label-md font-bold transition-all ${
                activeTab === "properties"
                  ? "bg-primary text-on-primary shadow-md"
                  : "text-on-surface-variant hover:bg-surface-container-low hover:text-primary"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">home_work</span>
              <span>{language === "de" ? "Meine Immobilien" : "My Properties"}</span>
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
              <span>{language === "de" ? "Favoriten" : "Favourites"}</span>
            </button>


          </aside>

          {/* ── Main Tab Contents ─────────────────────────── */}
          <main className="flex-grow w-full space-y-6">
            
            {/* 1. Tab: Overview */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                
                {/* Stats Columns Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="bg-white border border-outline-variant p-5 rounded-2xl shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-primary text-[24px]">real_estate_agent</span>
                    </div>
                    <div>
                      <p className="text-[12px] text-on-surface-variant font-bold uppercase leading-none">
                        {language === "de" ? "Immobilien" : "Properties"}
                      </p>
                      <p className="text-[18px] font-bold text-primary mt-1">
                        {propertiesList.length} Listings
                      </p>
                    </div>
                  </div>

                  <div className="bg-white border border-outline-variant p-5 rounded-2xl shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-primary text-[24px]">pending_actions</span>
                    </div>
                    <div>
                      <p className="text-[12px] text-on-surface-variant font-bold uppercase leading-none">
                        {language === "de" ? "Anfragen" : "Pending Requests"}
                      </p>
                      <p className="text-[18px] font-bold text-primary mt-1">
                        {bookingRequests.filter(b => b.status === "pending").length} Pending
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick requests list - Full Width */}
                <div className="bg-white border border-outline-variant p-6 rounded-2xl shadow-sm space-y-4">
                  <h3 className="text-headline-md font-bold text-primary">
                    {language === "de" ? "Letzte Buchungsanfragen" : "Recent Booking Requests"}
                  </h3>
                  
                  {bookingRequests.length === 0 ? (
                    <div className="text-center py-8 text-on-surface-variant text-body-md">
                      {language === "de" 
                        ? "Sie haben momentan keine ausstehenden Buchungsanfragen." 
                        : "You do not have any pending booking requests at the moment."}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {bookingRequests.slice(0, 3).map((b) => {
                        const tenant = (Array.isArray(b.tenant) ? b.tenant[0] : b.tenant) as any;
                        const score = b.ai_tenant_scores && b.ai_tenant_scores[0];
                        const tenantIsPremium = tenant?.subscriptions?.some((s: any) => s.status === 'active') || false;
                        return (
                          <div key={b.id} className="p-4 border border-outline-variant rounded-xl flex justify-between items-center gap-4 flex-wrap sm:flex-nowrap hover:shadow-sm transition-all bg-surface-container-low">
                            <div>
                              <h4 className="text-label-md font-bold text-primary flex items-center gap-1.5">
                                {tenant?.full_name || "Mieter"}
                                {tenantIsPremium && (
                                  <span className="material-symbols-outlined text-[#f07d00] text-[18px] select-none" title="Premium Bewerber">
                                    star
                                  </span>
                                )}
                              </h4>
                              <p className="text-[12px] text-on-surface-variant mt-0.5">
                                {language === "de" ? "Objekt: " : "Property: "} <strong className="text-primary">{b.properties?.title}</strong>
                              </p>
                            </div>
                            <div className="flex items-center gap-3 ml-auto sm:ml-0">
                              <Link 
                                href={`/buchen/${b.id}`} 
                                className="bg-primary text-on-primary px-4 py-1.5 rounded-lg text-[12px] font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm"
                              >
                                {language === "de" ? "Prüfen" : "Review"}
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 2. Tab: Landlord Profile Settings */}
            {activeTab === "profile" && (
              <div className="bg-white border border-outline-variant p-6 md:p-8 rounded-2xl shadow-sm space-y-6">
                <div>
                  <h2 className="text-headline-md font-bold text-primary">
                    {language === "de" ? "Vermieter-Profil & Einstellungen" : "Landlord Profile & Settings"}
                  </h2>
                  <p className="text-body-md text-on-surface-variant mt-1 leading-relaxed">
                    {language === "de"
                      ? "Verwalten Sie Ihre Kontaktdaten, Ihre IBAN für den Mieteingang und Ihre Stripe-Integration für sichere Direktzahlungen."
                      : "Manage your contact credentials, Stripe Connect accounts, and IBAN details for secure directly deposited tenant rentals."}
                  </p>
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
                  {/* Identity Category */}
                  <div className="space-y-4">
                    <h3 className="text-label-md font-bold text-primary uppercase border-b border-outline-variant pb-1.5">
                      {language === "de" ? "Persönliche Daten" : "Personal Details"}
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-label-sm text-on-surface font-semibold">
                          {language === "de" ? "Vollständiger Name" : "Full Name"}
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
                          {language === "de" ? "Telefonnummer" : "Phone Number"}
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
                    </div>
                  </div>

                  {/* Stripe and Finance Details */}
                  <div className="space-y-4 pt-4">
                    <h3 className="text-label-md font-bold text-primary uppercase border-b border-outline-variant pb-1.5">
                      {language === "de" ? "Finanzen & Auszahlungen" : "Payouts & Stripe Connect"}
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-label-sm text-on-surface font-semibold">
                          Stripe Account ID
                        </label>
                        <input
                          type="text"
                          placeholder="acct_12345..."
                          value={profileForm.stripe_account_id}
                          onChange={(e) => setProfileForm({ ...profileForm, stripe_account_id: e.target.value })}
                          className="w-full h-11 px-4 bg-surface-container-low border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-[15px]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-label-sm text-on-surface font-semibold">
                          {language === "de" ? "Letzte 4 Ziffern der IBAN" : "Last 4 Digits of IBAN"}
                        </label>
                        <input
                          type="text"
                          maxLength={4}
                          placeholder="1234"
                          value={profileForm.iban_last4}
                          onChange={(e) => setProfileForm({ ...profileForm, iban_last4: e.target.value })}
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
                      {language === "de" ? "Details speichern" : "Save Details"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* 3. Tab: Booking Requests */}
            {activeTab === "bookings" && (
              <div className="bg-white border border-outline-variant p-6 md:p-8 rounded-2xl shadow-sm space-y-6">
                <div>
                  <h2 className="text-headline-md font-bold text-primary">
                    {language === "de" ? "Aktive Buchungsanfragen" : "Pending Booking Requests"}
                  </h2>
                  <p className="text-body-md text-on-surface-variant mt-1 leading-relaxed">
                    {language === "de"
                      ? "Verwalten Sie eingehende Anfragen von Studenten. Prüfen Sie die verifizierten Unterlagen."
                      : "Manage incoming requests from applicants. Check verification parameters and documents."}
                  </p>
                </div>

                {bookingRequests.length === 0 ? (
                  <div className="text-center py-12 text-on-surface-variant text-body-md border-2 border-dashed border-outline-variant rounded-2xl">
                    {language === "de" 
                      ? "Sie haben momentan keine ausstehenden Buchungsanfragen." 
                      : "You do not have any pending booking requests at the moment."}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bookingRequests.map((b) => {
                      const tenantProfile = (Array.isArray(b.tenant) ? b.tenant[0] : b.tenant) as any;
                      const tenantDetails = Array.isArray(tenantProfile?.tenant_profiles)
                        ? tenantProfile.tenant_profiles[0]
                        : tenantProfile?.tenant_profiles;
                      const propertyDetails = b.properties;
                      const aiScoreObj = b.ai_tenant_scores && b.ai_tenant_scores[0];
                      const tenantIsPremium = tenantProfile?.subscriptions?.some((s: any) => s.status === 'active') || false;

                      return (
                        <div
                          key={b.id}
                          className="p-5 border border-outline-variant rounded-2xl hover:shadow-md transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-surface-container-low"
                        >
                          <div>
                            <h4 className="text-headline-md font-bold text-primary flex items-center gap-1.5">
                              {tenantProfile?.full_name || "Bewerber"}
                              {tenantIsPremium && (
                                <span className="material-symbols-outlined text-[#f07d00] text-[20px] select-none" title="Premium Bewerber">
                                  star
                                </span>
                              )}
                            </h4>
                            <p className="text-body-sm text-on-surface-variant mt-1">
                              {language === "de" ? "Wohnung: " : "Property: "} <strong className="text-primary">{propertyDetails?.title || "Property"}</strong>
                            </p>
                            <p className="text-[12px] text-on-surface-variant font-medium mt-1">
                              {language === "de" ? "Einkommen: " : "Monthly Income: "} {tenantDetails?.monthly_income ? `${tenantDetails.monthly_income} €` : "N/A"}
                            </p>
                          </div>

                          <div className="flex gap-4 items-center flex-wrap ml-auto md:ml-0">
                            <Link
                              href={`/buchen/${b.id}`}
                              className="bg-primary text-on-primary px-5 py-3 rounded-xl text-[13px] font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm cursor-pointer text-center"
                            >
                              {language === "de" ? "Details prüfen" : "Review Profile"}
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 4. Tab: Landlord Properties List */}
            {activeTab === "properties" && (
              <div className="bg-white border border-outline-variant p-6 md:p-8 rounded-2xl shadow-sm space-y-6">
                <div className="flex justify-between items-center border-b border-outline-variant/60 pb-5 flex-wrap gap-4">
                  <div>
                    <h2 className="text-headline-md font-bold text-primary">
                      {language === "de" ? "Inserierte Immobilien" : "My Listed Properties"}
                    </h2>
                    <p className="text-body-md text-on-surface-variant mt-1 leading-relaxed">
                      {language === "de"
                        ? "Hier finden Sie alle Objekte, die Sie auf Heimstadt inseriert haben."
                        : "Browse and manage the properties you have currently listed on the Heimstadt marketplace."}
                    </p>
                  </div>
                  <Link
                    href="/inserieren"
                    className="bg-primary text-on-primary px-4 py-2 rounded-lg text-[12px] font-bold hover:opacity-90 active:scale-95 transition-all shadow cursor-pointer flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    {language === "de" ? "Neues Inserat" : "Add Property"}
                  </Link>
                </div>

                {propertiesList.length === 0 ? (
                  <div className="text-center py-12 text-on-surface-variant text-body-md border-2 border-dashed border-outline-variant rounded-2xl">
                    {language === "de" 
                      ? "Sie haben momentan noch keine Immobilien inseriert." 
                      : "You have not listed any properties yet."}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {propertiesList.map((p) => (
                      <div key={p.id} className="border border-outline-variant p-5 rounded-2xl bg-surface-container-low flex flex-col justify-between hover:shadow-md transition-all gap-5">
                        <div>
                          <span className="bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider">
                            {p.property_type || "Apartment"}
                          </span>
                          <h4 className="text-headline-md font-bold text-primary mt-3 truncate">{p.title}</h4>
                          <p className="text-[12px] text-on-surface-variant mt-0.5">{p.street}, {normalizeCityName(p.city, language)}</p>
                          
                          <div className="mt-4 flex gap-4 text-[13px] text-on-surface font-semibold">
                            <span>{p.size_sqm} m²</span>
                            <span>•</span>
                            <span>{p.rooms} {language === "de" ? "Zimmer" : "Rooms"}</span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center border-t border-outline-variant/60 pt-4 mt-auto">
                          <div>
                            <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider leading-none">Kaltmiete</p>
                            <p className="text-body-md font-extrabold text-primary mt-1">€ {p.rent_cold}</p>
                          </div>
                          <Link
                            href={`/objekt/${p.id}`}
                            className="text-primary text-[12px] font-bold hover:underline flex items-center gap-1"
                          >
                            {language === "de" ? "Ansehen" : "View"}
                            <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 5. Tab: Favourites */}
            {activeTab === "favorites" && (
              <div className="bg-white border border-outline-variant p-6 md:p-8 rounded-2xl shadow-sm space-y-6">
                <div>
                  <h2 className="text-headline-md font-bold text-primary flex items-center gap-2">
                    <span className="material-symbols-outlined text-[28px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                    {language === "de" ? "Favoriten" : "Favourites"}
                  </h2>
                  <p className="text-body-md text-on-surface-variant mt-1 leading-relaxed">
                    {language === "de"
                      ? "Hier finden Sie alle Ihre gemerkten Unterkünfte. Verwalten Sie Ihre Favoriten und starten Sie direkt Ihre Bewerbungen."
                      : "Here you can find all your saved properties. Manage your favorites and apply to them directly."}
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
                      {language === "de" ? "Keine Favoriten gespeichert." : "No saved favorites yet."}
                    </p>
                    <button
                      onClick={() => router.push("/suche")}
                      className="bg-primary text-on-primary px-5 py-2.5 rounded-xl text-label-sm font-bold hover:opacity-90 active:scale-95 transition-all shadow cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[18px]">search</span>
                      {language === "de" ? "Wohnungen suchen" : "Search Properties"}
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
                          <div className="relative h-44 overflow-hidden bg-surface-dim">
                            <img
                              src={primaryPhoto}
                              alt={l.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              loading="lazy"
                            />
                            <button
                              onClick={() => handleRemoveFavorite(l.id)}
                              className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm p-1.5 rounded-full hover:bg-white transition-colors cursor-pointer text-red-500 hover:text-red-700 shadow-sm"
                              title={language === "de" ? "Entfernen" : "Remove"}
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
                                  <span className="block text-[9px] font-bold uppercase tracking-wider text-on-surface-variant">{language === "de" ? "Warm" : "Warm Rent"}</span>
                                  <span className="text-[14px] font-bold text-primary">{totalRent || 870} €</span>
                                </div>
                                <div className="text-center border-l border-r border-outline-variant/30">
                                  <span className="block text-[9px] font-bold uppercase tracking-wider text-on-surface-variant">{language === "de" ? "Fläche" : "Area"}</span>
                                  <span className="text-[14px] font-semibold text-primary">{l.size_sqm} m²</span>
                                </div>
                                <div className="text-center">
                                  <span className="block text-[9px] font-bold uppercase tracking-wider text-on-surface-variant">{language === "de" ? "Zimmer" : "Rooms"}</span>
                                  <span className="text-[14px] font-semibold text-primary">{l.rooms}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <Link
                                href={`/objekt/${l.id}`}
                                className="flex-1 text-center bg-primary text-on-primary py-2 rounded-lg text-[12px] font-bold hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-sm"
                              >
                                {language === "de" ? "Details ansehen" : "View Details"}
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

          </main>
        </div>
      </div>
      <Footer />
    </>
  );
}

export default function LandlordDashboard() {
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
      <LandlordDashboardContent />
    </Suspense>
  );
}
