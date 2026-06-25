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

function LandlordDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, loading, refreshProfile, isPremium, subscription } = useAuth();
  const { t, language } = useLanguage();
  const { formatPrice } = useCurrency();
  
  // Navigation State
  const [activeTab, setActiveTab] = useState<"overview" | "profile" | "bookings" | "properties" | "messages">("overview");

  // Messages & Support States
  const [messagesTab, setMessagesTab] = useState<"inquiries" | "support">("inquiries");
  const [selectedSupportProperty, setSelectedSupportProperty] = useState<string>("");
  const [supportMessages, setSupportMessages] = useState<any[]>([]);
  const [supportInput, setSupportInput] = useState("");
  const [sendingSupport, setSendingSupport] = useState(false);
  const [supportRecipientId, setSupportRecipientId] = useState<string | null>(null);

  // Listing Inquiries States
  const [inquiryThreads, setInquiryThreads] = useState<any[]>([]);
  const [selectedInquiryThread, setSelectedInquiryThread] = useState<any>(null);
  const [loadingMessagesTab, setLoadingMessagesTab] = useState(false);

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
      tabParam === "messages"
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
          title: t("landlordDash_brightStudioApartmentNearAlexa"),
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
          t("landlordDash_yourPremiumSubscriptionHasBeen")
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
        t("landlordDash_landlordDetailsSuccessfullySav")
      );
      
      await refreshProfile();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  // Fetch support recipient (admin/employee) on mount
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      if (isSupabaseConfigured()) {
        const { data } = await supabase
          .from("profiles")
          .select("id, role")
          .in("role", ["admin", "employee"])
          .order("role")
          .limit(1)
          .maybeSingle();
        if (!cancelled) setSupportRecipientId(data?.id ?? null);
      } else {
        if (!cancelled) setSupportRecipientId("mock-support-agent-id");
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  // Fetch support messages
  const fetchSupportMessages = async (propertyId: string) => {
    if (!user) return;
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from("messages")
          .select("id, sender_id, recipient_id, body, sent_at")
          .eq("property_id", propertyId)
          .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
          .order("sent_at", { ascending: true });
        
        if (!error && data) {
          setSupportMessages(data);
        }
      } else {
        const mockMsgs = [
          {
            id: "mock-sup-1",
            sender_id: "mock-support-agent-id",
            recipient_id: user.id,
            body: t("landlordDash_helloHowCanIHelpYouWithThisPro"),
            sent_at: new Date(Date.now() - 3600000).toISOString()
          }
        ];
        const stored = localStorage.getItem(`heimat_mock_support_chat_${propertyId}`);
        if (stored) {
          setSupportMessages(JSON.parse(stored));
        } else {
          setSupportMessages(mockMsgs);
          localStorage.setItem(`heimat_mock_support_chat_${propertyId}`, JSON.stringify(mockMsgs));
        }
      }
    } catch (err) {
      console.error("Error fetching support messages:", err);
    }
  };

  // Send support message
  const handleSendSupportMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = supportInput.trim();
    if (!text || sendingSupport || !user || !selectedSupportProperty || !supportRecipientId) return;

    setSendingSupport(true);
    setSupportInput("");

    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from("messages")
          .insert({
            sender_id: user.id,
            recipient_id: supportRecipientId,
            body: text,
            channel: "landlord_support",
            property_id: selectedSupportProperty
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setSupportMessages((prev) => [...prev, data]);
        }
      } else {
        const newMsg = {
          id: `mock-msg-${Date.now()}`,
          sender_id: user.id,
          recipient_id: supportRecipientId,
          body: text,
          sent_at: new Date().toISOString()
        };
        const updated = [...supportMessages, newMsg];
        setSupportMessages(updated);
        localStorage.setItem(`heimat_mock_support_chat_${selectedSupportProperty}`, JSON.stringify(updated));

        setTimeout(() => {
          const replyMsg = {
            id: `mock-reply-${Date.now()}`,
            sender_id: supportRecipientId,
            recipient_id: user.id,
            body: t("landlordDash_thankYouForYourMessageAnEmploy"),
            sent_at: new Date().toISOString()
          };
          setSupportMessages((prev) => {
            const next = [...prev, replyMsg];
            localStorage.setItem(`heimat_mock_support_chat_${selectedSupportProperty}`, JSON.stringify(next));
            return next;
          });
        }, 1000);
      }
    } catch (err) {
      console.error("Error sending support message:", err);
      setSupportInput(text);
    } finally {
      setSendingSupport(false);
    }
  };

  // Fetch tenant inquiries for landlord properties
  const fetchInquiryMessages = async () => {
    if (!user || propertiesList.length === 0) return;
    setLoadingMessagesTab(true);
    try {
      const propertyIds = propertiesList.map((p) => p.id);
      
      const { data: messagesData, error } = await supabase
        .from("messages")
        .select("id, sender_id, recipient_id, body, sent_at, property_id")
        .in("property_id", propertyIds)
        .order("sent_at", { ascending: true });

      if (error) throw error;

      const tenantIds = new Set<string>();
      (messagesData || []).forEach((m) => {
        if (m.sender_id && m.sender_id !== user.id) tenantIds.add(m.sender_id);
        if (m.recipient_id && m.recipient_id !== user.id) tenantIds.add(m.recipient_id);
      });

      let tenantProfiles: Record<string, any> = {};
      if (tenantIds.size > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email, role")
          .in("id", Array.from(tenantIds));
        
        profiles?.forEach((p) => {
          if (p.role === "tenant" || p.role === "user" || !p.role) {
            tenantProfiles[p.id] = p;
          }
        });
      }

      const threadsMap: Record<string, { property: any, tenant: any, messages: any[], last_message_time: string }> = {};
      
      (messagesData || []).forEach((m) => {
        const prop = propertiesList.find((p) => p.id === m.property_id);
        if (!prop) return;

        const tenantId = (m.sender_id && tenantProfiles[m.sender_id]) ? m.sender_id :
                         (m.recipient_id && tenantProfiles[m.recipient_id]) ? m.recipient_id : null;
        if (!tenantId) return;

        const threadKey = `${m.property_id}-${tenantId}`;
        if (!threadsMap[threadKey]) {
          threadsMap[threadKey] = {
            property: prop,
            tenant: tenantProfiles[tenantId],
            messages: [],
            last_message_time: m.sent_at
          };
        }
        threadsMap[threadKey].messages.push(m);
        if (new Date(m.sent_at) > new Date(threadsMap[threadKey].last_message_time)) {
          threadsMap[threadKey].last_message_time = m.sent_at;
        }
      });

      setInquiryThreads(Object.values(threadsMap));
    } catch (err) {
      console.error("Error loading inquiries:", err);
    } finally {
      setLoadingMessagesTab(false);
    }
  };

  const fetchMockInquiries = () => {
    const mockTenant = { id: "mock-tenant-id", full_name: "Mock Tenant", email: "tenant@mock.com" };
    const mockProp = propertiesList[0] || { id: "berlin-studio", title: "Bright Studio Apartment near Alexanderplatz" };
    const mockMsgs = [
      {
        id: "mock-inq-1",
        sender_id: "mock-tenant-id",
        recipient_id: "mock-support-agent-id",
        body: t("landlordDash_helloIAmVeryInterestedInTheBri"),
        sent_at: new Date(Date.now() - 7200000).toISOString()
      },
      {
        id: "mock-inq-2",
        sender_id: "mock-support-agent-id",
        recipient_id: "mock-tenant-id",
        body: t("landlordDash_helloYesSmallPetsAreAllowedUpo"),
        sent_at: new Date(Date.now() - 3600000).toISOString()
      }
    ];

    setInquiryThreads([
      {
        property: mockProp,
        tenant: mockTenant,
        messages: mockMsgs,
        last_message_time: mockMsgs[1].sent_at
      }
    ]);
  };

  useEffect(() => {
    if (activeTab === "messages") {
      if (isSupabaseConfigured()) {
        fetchInquiryMessages();
      } else {
        fetchMockInquiries();
      }
      if (propertiesList.length > 0) {
        setSelectedSupportProperty(propertiesList[0].id);
        fetchSupportMessages(propertiesList[0].id);
      }
    }
  }, [activeTab, propertiesList]);

  useEffect(() => {
    if (selectedSupportProperty) {
      fetchSupportMessages(selectedSupportProperty);
    }
  }, [selectedSupportProperty]);

  const handleDeleteProperty = async (propertyId: string) => {
    const confirmMsg = t("landlordDash_areYouSureYouWantToDeleteThisP");
    if (!window.confirm(confirmMsg)) return;

    try {
      if (isSupabaseConfigured()) {
        const { data: bookings } = await supabase
          .from("bookings")
          .select("id")
          .eq("property_id", propertyId);

        const bookingIds = bookings?.map((b) => b.id) || [];
        if (bookingIds.length > 0) {
          await supabase.from("ai_tenant_scores").delete().in("booking_id", bookingIds);
          await supabase.from("bookings").delete().in("id", bookingIds);
        }
        await supabase.from("property_photos").delete().eq("property_id", propertyId);
        const { error } = await supabase.from("properties").delete().eq("id", propertyId);
        if (error) throw error;
      } else {
        const nextProps = propertiesList.filter((p) => p.id !== propertyId);
        setPropertiesList(nextProps);
        const nextBookings = bookingRequests.filter((b) => b.properties?.id !== propertyId);
        setBookingRequests(nextBookings);
      }
      await fetchLandlordData();
      alert(t("landlordDash_propertySuccessfullyDeleted"));
    } catch (err) {
      console.error("Failed to delete property:", err);
      alert(t("landlordDash_failedToDeleteProperty"));
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
              <span>{t("landlordDash_overview")}</span>
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
              <span>{t("landlordDash_profileFinance")}</span>
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
              <span>{t("landlordDash_bookingRequests")}</span>
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
              <span>{t("landlordDash_myProperties")}</span>
            </button>

            <button
              onClick={() => setActiveTab("messages")}
              className={`flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-left text-label-md font-bold transition-all ${
                activeTab === "messages"
                  ? "bg-primary text-on-primary shadow-md"
                  : "text-on-surface-variant hover:bg-surface-container-low hover:text-primary"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">forum</span>
              <span>{t("landlordDash_messagesSupport")}</span>
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
                        {t("landlordDash_properties")}
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
                        {t("landlordDash_pendingRequests")}
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
                    {t("landlordDash_recentBookingRequests")}
                  </h3>
                  
                  {bookingRequests.length === 0 ? (
                    <div className="text-center py-8 text-on-surface-variant text-body-md">
                      {t("landlordDash_youDoNotHaveAnyPendingBookingR")}
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
                                {t("landlordDash_property")} <strong className="text-primary">{b.properties?.title}</strong>
                              </p>
                            </div>
                            <div className="flex items-center gap-3 ml-auto sm:ml-0">
                              <Link 
                                href={`/buchen/${b.id}`} 
                                className="bg-primary text-on-primary px-4 py-1.5 rounded-lg text-[12px] font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm"
                              >
                                {t("landlordDash_review")}
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
                    {t("landlordDash_landlordProfileSettings")}
                  </h2>
                  <p className="text-body-md text-on-surface-variant mt-1 leading-relaxed">
                    {t("landlordDash_manageYourContactCredentialsSt")}
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
                      {t("landlordDash_personalDetails")}
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-label-sm text-on-surface font-semibold">
                          {t("landlordDash_fullName")}
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
                          {t("landlordDash_phoneNumber")}
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
                      {t("landlordDash_payoutsStripeConnect")}
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
                          {t("landlordDash_last4DigitsOfIban")}
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
                      {t("landlordDash_saveDetails")}
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
                    {t("landlordDash_pendingBookingRequests")}
                  </h2>
                  <p className="text-body-md text-on-surface-variant mt-1 leading-relaxed">
                    {t("landlordDash_manageIncomingRequestsFromAppl")}
                  </p>
                </div>

                {bookingRequests.length === 0 ? (
                  <div className="text-center py-12 text-on-surface-variant text-body-md border-2 border-dashed border-outline-variant rounded-2xl">
                    {t("landlordDash_youDoNotHaveAnyPendingBookingR")}
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
                              {t("landlordDash_property")} <strong className="text-primary">{propertyDetails?.title || "Property"}</strong>
                            </p>
                            <p className="text-[12px] text-on-surface-variant font-medium mt-1">
                              {t("landlordDash_monthlyIncome")} {tenantDetails?.monthly_income ? formatPrice(Number(tenantDetails.monthly_income)) : "N/A"}
                            </p>
                          </div>

                          <div className="flex gap-4 items-center flex-wrap ml-auto md:ml-0">
                            <Link
                              href={`/buchen/${b.id}`}
                              className="bg-primary text-on-primary px-5 py-3 rounded-xl text-[13px] font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm cursor-pointer text-center"
                            >
                              {t("landlordDash_reviewProfile")}
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
                      {t("landlordDash_myListedProperties")}
                    </h2>
                    <p className="text-body-md text-on-surface-variant mt-1 leading-relaxed">
                      {t("landlordDash_browseAndManageThePropertiesYo")}
                    </p>
                  </div>
                  <Link
                    href="/inserieren"
                    className="bg-primary text-on-primary px-4 py-2 rounded-lg text-[12px] font-bold hover:opacity-90 active:scale-95 transition-all shadow cursor-pointer flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    {t("landlordDash_addProperty")}
                  </Link>
                </div>

                {propertiesList.length === 0 ? (
                  <div className="text-center py-12 text-on-surface-variant text-body-md border-2 border-dashed border-outline-variant rounded-2xl">
                    {t("landlordDash_youHaveNotListedAnyPropertiesY")}
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
                            <span>{p.rooms} {t("landlordDash_rooms")}</span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center border-t border-outline-variant/60 pt-4 mt-auto">
                          <div>
                            <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider leading-none">Kaltmiete</p>
                            <p className="text-body-md font-extrabold text-primary mt-1">{formatPrice(Number(p.rent_cold))}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <Link
                              href={`/objekt/${p.id}?view=landlord`}
                              className="text-primary text-[12px] font-bold hover:underline flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                              <span>{t("landlordDash_view")}</span>
                            </Link>
                            <Link
                              href={`/inserieren?id=${p.id}`}
                              className="text-[#005fb8] text-[12px] font-bold hover:underline flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-[16px]">edit</span>
                              <span>{t("landlordDash_edit")}</span>
                            </Link>
                            <button
                              onClick={() => handleDeleteProperty(p.id)}
                              className="text-error text-[12px] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                              <span>{t("landlordDash_delete")}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 5. Tab: Favourites */}
            {/* 5. Tab: Messages & Support */}
            {activeTab === "messages" && (
              <div className="bg-white border border-outline-variant p-6 md:p-8 rounded-2xl shadow-sm space-y-6">
                <div>
                  <h2 className="text-headline-md font-bold text-primary flex items-center gap-2">
                    <span className="material-symbols-outlined text-[28px] text-primary">forum</span>
                    {t("landlordDash_messagesSupport")}
                  </h2>
                  <p className="text-body-md text-on-surface-variant mt-1 leading-relaxed">
                    {t("landlordDash_manageYourCommunicationsViewTe")}
                  </p>
                </div>

                {/* Sub Tab Buttons */}
                <div className="flex border-b border-outline-variant pb-px gap-6">
                  <button
                    onClick={() => {
                      setMessagesTab("inquiries");
                      setSelectedInquiryThread(null);
                    }}
                    className={`pb-3 text-label-md font-bold transition-all relative ${
                      messagesTab === "inquiries"
                        ? "text-primary border-b-2 border-primary font-extrabold"
                        : "text-on-surface-variant hover:text-primary"
                    }`}
                  >
                    {t("landlordDash_tenantInquiries")}
                  </button>
                  <button
                    onClick={() => setMessagesTab("support")}
                    className={`pb-3 text-label-md font-bold transition-all relative ${
                      messagesTab === "support"
                        ? "text-primary border-b-2 border-primary font-extrabold"
                        : "text-on-surface-variant hover:text-primary"
                    }`}
                  >
                    {t("landlordDash_contactSupport")}
                  </button>
                </div>

                {/* Sub Tab: Inquiries (Tenants <-> Support) */}
                {messagesTab === "inquiries" && (
                  <div className="space-y-6">
                    {selectedInquiryThread ? (
                      <div className="space-y-4">
                        <button
                          onClick={() => setSelectedInquiryThread(null)}
                          className="inline-flex items-center gap-1.5 text-on-surface-variant hover:text-primary font-bold text-[13px] transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                          {t("landlordDash_backToOverview")}
                        </button>

                        <div className="p-4 bg-surface-container-low border border-outline-variant/60 rounded-2xl">
                          <p className="text-[12px] text-on-surface-variant font-semibold">
                            {t("landlordDash_property")}{" "}
                            <span className="text-primary font-bold">{selectedInquiryThread.property.title}</span>
                          </p>
                          <p className="text-[12px] text-on-surface-variant font-semibold mt-1">
                            {t("landlordDash_tenantApplicant")}{" "}
                            <span className="text-primary font-bold">{selectedInquiryThread.tenant?.full_name || "Applicant"} ({selectedInquiryThread.tenant?.email})</span>
                          </p>
                        </div>

                        {/* Thread Messages List */}
                        <div className="border border-outline-variant rounded-2xl bg-white p-5 h-[350px] overflow-y-auto space-y-4 flex flex-col justify-start">
                          {selectedInquiryThread.messages.map((m: any) => {
                            const isTenantSender = m.sender_id === selectedInquiryThread.tenant?.id;
                            const senderName = isTenantSender 
                              ? (selectedInquiryThread.tenant?.full_name || "Tenant")
                              : (t("landlordDash_supportAgent"));
                            
                            return (
                              <div
                                key={m.id}
                                className={`flex flex-col max-w-[80%] ${
                                  isTenantSender ? "self-start items-start" : "self-end items-end ml-auto"
                                }`}
                              >
                                <span className="text-[10px] text-on-surface-variant/80 font-bold mb-1 px-1">
                                  {senderName}
                                </span>
                                <div
                                  className={`p-3.5 rounded-2xl text-[13px] leading-relaxed shadow-sm ${
                                    isTenantSender
                                      ? "bg-surface-container-high text-on-surface rounded-tl-sm"
                                      : "bg-primary text-on-primary rounded-tr-sm"
                                  }`}
                                >
                                  {m.body}
                                </div>
                                <span className="text-[9px] text-on-surface-variant/50 font-semibold mt-1 px-1">
                                  {new Date(m.sent_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <>
                        {loadingMessagesTab ? (
                          <div className="flex justify-center items-center py-12">
                            <span className="animate-spin rounded-full h-8 w-8 border-3 border-primary border-t-transparent" />
                          </div>
                        ) : inquiryThreads.length === 0 ? (
                          <div className="text-center py-12 text-on-surface-variant text-body-md border border-dashed border-outline-variant/60 rounded-2xl bg-surface-container-low/20">
                            {t("landlordDash_noInquiryChatsFoundForYourProp")}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {inquiryThreads.map((thread, idx) => (
                              <div
                                key={idx}
                                onClick={() => setSelectedInquiryThread(thread)}
                                className="p-5 border border-outline-variant rounded-2xl bg-surface-container-low hover:bg-surface-container transition-all flex justify-between items-center gap-4 cursor-pointer hover:shadow-sm"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="text-label-md font-bold text-primary">
                                      {thread.tenant?.full_name || "Applicant"}
                                    </h4>
                                    <span className="bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded text-[10px] font-bold truncate max-w-[180px]">
                                      {thread.property.title}
                                    </span>
                                  </div>
                                  <p className="text-[13px] text-on-surface-variant truncate mt-2 font-medium">
                                    {thread.messages[thread.messages.length - 1]?.body}
                                  </p>
                                </div>
                                <span className="material-symbols-outlined text-primary text-[20px] flex-shrink-0">
                                  arrow_forward_ios
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Sub Tab: Contact Support (Landlord <-> Support) */}
                {messagesTab === "support" && (
                  <div className="space-y-6">
                    {propertiesList.length === 0 ? (
                      <div className="text-center py-12 text-on-surface-variant text-body-md border border-dashed border-outline-variant rounded-2xl bg-surface-container-low/20">
                        {t("landlordDash_pleaseListAPropertyFirstToCont")}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Select Property dropdown */}
                        <div className="space-y-1">
                          <label className="block text-label-sm text-on-surface font-semibold">
                            {t("landlordDash_selectPropertyRegarding")}
                          </label>
                          <select
                            value={selectedSupportProperty}
                            onChange={(e) => setSelectedSupportProperty(e.target.value)}
                            className="w-full h-11 px-4 bg-surface-container-low border border-outline-variant rounded-xl outline-none text-[15px] focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                          >
                            {propertiesList.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.title} ({p.street}, {p.city})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Support Chat Messages box */}
                        <div className="border border-outline-variant rounded-2xl bg-white p-5 h-[320px] overflow-y-auto space-y-4 flex flex-col justify-start">
                          {supportMessages.length === 0 ? (
                            <div className="self-center text-center max-w-sm py-12">
                              <p className="text-body-md text-on-surface-variant">
                                {t("landlordDash_writeAMessageToOurSupportTeamR")}
                              </p>
                            </div>
                          ) : (
                            supportMessages.map((m) => {
                              const isSelf = m.sender_id === user?.id;
                              return (
                                <div
                                  key={m.id}
                                  className={`flex flex-col max-w-[80%] ${
                                    isSelf ? "self-end items-end ml-auto" : "self-start items-start"
                                  }`}
                                >
                                  <div
                                    className={`p-3.5 rounded-2xl text-[13px] leading-relaxed shadow-sm ${
                                      isSelf
                                        ? "bg-primary text-on-primary rounded-tr-sm"
                                        : "bg-surface-container-high text-on-surface rounded-tl-sm"
                                    }`}
                                  >
                                    {m.body}
                                  </div>
                                  <span className="text-[9px] text-on-surface-variant/50 font-semibold mt-1 px-1">
                                    {new Date(m.sent_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                  </span>
                                </div>
                              );
                            })
                          )}
                        </div>

                        {/* Send message form */}
                        <form onSubmit={handleSendSupportMessage} className="flex gap-3">
                          <input
                            type="text"
                            placeholder={t("landlordDash_typeYourMessage")}
                            value={supportInput}
                            onChange={(e) => setSupportInput(e.target.value)}
                            disabled={sendingSupport}
                            className="flex-grow bg-surface-container-low border border-outline-variant rounded-xl px-4 py-3 text-[14px] outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                          />
                          <button
                            type="submit"
                            disabled={!supportInput.trim() || sendingSupport}
                            className="bg-primary text-on-primary px-6 rounded-xl flex items-center justify-center hover:opacity-90 active:scale-95 transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          >
                            {sendingSupport ? (
                              <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                            ) : (
                              <span className="material-symbols-outlined text-[20px] transform rotate-[-30deg]">send</span>
                            )}
                          </button>
                        </form>
                      </div>
                    )}
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
