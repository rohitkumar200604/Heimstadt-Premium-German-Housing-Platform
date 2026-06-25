"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { useCurrency } from "@/context/CurrencyContext";
import { supabase } from "@/utils/supabase/client";
import Footer from "@/components/layout/Footer";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { normalizeCityName } from "@/utils/translations";

export default function BookingDetailPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = use(params);
  const { t, language } = useLanguage();
  const { formatPrice } = useCurrency();
  const { user, profile, loading: authLoading, isPremium } = useAuth();
  const router = useRouter();

  const [booking, setBooking] = useState<any>(null);
  const [property, setProperty] = useState<any>(null);
  const [tenantProfile, setTenantProfile] = useState<any>(null);
  const [aiScore, setAiScore] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  
  const [loadingData, setLoadingData] = useState(true);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  // Simulated credit card state
  const [cardholder, setCardholder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");

  const loadBookingData = useCallback(async () => {
    if (!bookingId) return;
    try {
      // 1. Fetch booking joined with property details and tenant details
      const { data: bookingData, error: bookingErr } = await supabase
        .from("bookings")
        .select(`
          *,
          properties (
            *,
            landlord_profiles (*)
          ),
          tenant:profiles!tenant_id (
            *,
            tenant_profiles (*)
          )
        `)
        .eq("id", bookingId)
        .single();

      if (bookingErr) throw bookingErr;

      setBooking(bookingData);
      setProperty(bookingData.properties);
      setTenantProfile(bookingData.tenant);
      
      // 2. Fetch uploaded documents for this tenant
      const { data: docsData } = await supabase
        .from("verification_documents")
        .select("*")
        .eq("user_id", bookingData.tenant_id);

      setDocuments(docsData || []);

      // 3. Fetch AI match score
      const { data: scoreData } = await supabase
        .from("ai_tenant_scores")
        .select("*")
        .eq("booking_id", bookingId)
        .maybeSingle();

      setAiScore(scoreData);
    } catch (err) {
      console.error("Error loading booking details:", err);
      // Fallback mock details for development
      if (bookingId === "mock-apply-87a" || bookingId.startsWith("mock")) {
        setBooking({
          id: bookingId,
          status: "pending",
          move_in_date: "2026-09-01",
          move_out_date: "2027-08-31",
          rent_total: 2200,
          tenant_id: user?.id || "mock-tenant-id",
          landlord_id: "mock-landlord-id",
          tenant_note: "I would love to rent this beautiful apartment. I am a master student at TU Berlin."
        });
        setProperty({
          id: "mock-prop-123",
          title: "Premium 2-Zimmer-Wohnung in Berlin-Mitte",
          rent_cold: 1850,
          rent_utilities: 240,
          rent_heating: 110,
          deposit_months: 3,
          street: "Friedrichstraße 12",
          city: "Berlin",
          zip: "10117"
        });
        setTenantProfile({
          full_name: profile?.full_name || "Jane Doe",
          email: user?.email || "jane@example.com",
          tenant_profiles: {
            nationality: "German",
            university: "TU Berlin",
            employment_status: "Student",
            monthly_income: 2600
          }
        });
      }
    } finally {
      setLoadingData(false);
    }
  }, [bookingId, user]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push("/auth/login");
      } else {
        loadBookingData();
      }
    }
  }, [user, authLoading, loadBookingData, router]);

  const isUploaded = (type: string) => documents.some(d => d.doc_type === type);
  const getDocFileName = (type: string) => documents.find(d => d.doc_type === type)?.file_name || "";
  const getDocStatus = (type: string) => documents.find(d => d.doc_type === type)?.status || "pending";

  const handleFileUpload = async (docType: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingDoc(docType);
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

      if (isConfigured && !bookingId.startsWith("mock")) {
        // 3. Write document reference to Supabase
        const { error } = await supabase
          .from("verification_documents")
          .insert({
            user_id: user.id,
            doc_type: docType,
            s3_key: key,
            file_name: file.name,
            status: "approved"
          });
        if (error) throw error;
        await loadBookingData();
      } else {
        // Mock mode local state update
        setDocuments((prev) => {
          const filtered = prev.filter((d) => d.doc_type !== docType);
          return [...filtered, { doc_type: docType, file_name: file.name, status: "approved" }];
        });
      }
    } catch (err: any) {
      console.error("Error uploading document:", err);
      alert(`${t("uploadError")}: ${err.message}`);
    } finally {
      setUploadingDoc(null);
    }
  };

  const handleDocRemove = async (docType: string) => {
    if (!user) return;
    try {
      const isConfigured =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://mock-project.supabase.co" &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== "mock-anon-key";

      if (isConfigured && !bookingId.startsWith("mock")) {
        const { error } = await supabase
          .from("verification_documents")
          .delete()
          .eq("user_id", user.id)
          .eq("doc_type", docType);

        if (error) throw error;
        await loadBookingData();
      } else {
        // Mock mode local state update
        setDocuments((prev) => prev.filter((d) => d.doc_type !== docType));
      }
    } catch (err: any) {
      console.error("Error removing document:", err);
      alert(`${t("removeError")}: ${err.message}`);
    }
  };

  const submitForReview = async () => {
    if (!booking || !user) return;
    setSubmittingReview(true);
    try {
      const tenantProfileData = {
        nationality: tenantProfile?.tenant_profiles?.nationality || "German",
        monthlyIncome: parseFloat(tenantProfile?.tenant_profiles?.monthly_income || 2500),
        rent: parseFloat(property?.rent_cold || 1000),
        employmentStatus: tenantProfile?.tenant_profiles?.employment_status || "Student"
      };
      const uploadedDocTypes = documents.map(d => d.doc_type);

      // Trigger AI tenant score calculation and status updates on server
      const aiRes = await fetch("/api/ai/score-tenant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: booking.id,
          tenantProfile: tenantProfileData,
          docTypes: uploadedDocTypes
        })
      });
      const aiData = await aiRes.json();
      if (!aiData.success) throw new Error(aiData.error || "AI Screening failed");

      if (bookingId === "mock-apply-87a" || bookingId.startsWith("mock")) {
        setBooking((prev: any) => ({ ...prev, status: "docs_review" }));
        setAiScore({
          overall_score: 95,
          income_score: 98,
          employment_score: 95,
          doc_score: 95,
          stay_length_score: 90,
          reasoning: "Mock screening analysis: High match suitability.",
          flags: []
        });
      } else {
        await loadBookingData();
      }
    } catch (err: any) {
      console.error("Error submitting for review:", err);
      alert(`${t("submissionError")}: ${err.message}`);
    } finally {
      setSubmittingReview(false);
    }
  };

  const updateBookingStatus = async (newStatus: string) => {
    if (!booking) return;
    setUpdatingStatus(newStatus);
    try {
      if (bookingId === "mock-apply-87a" || bookingId.startsWith("mock")) {
        setBooking((prev: any) => ({ ...prev, status: newStatus }));
      } else {
        const { error } = await supabase
          .from("bookings")
          .update({ status: newStatus })
          .eq("id", booking.id);
        if (error) throw error;
        await loadBookingData();
      }
      alert(`${t("bookingStatusUpdated")}: ${newStatus}`);
    } catch (err: any) {
      console.error("Error updating booking status:", err);
      alert(`Error: ${err.message}`);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleEscrowPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;
    setIsPaying(true);
    try {
      const res = await fetch("/api/stripe/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Math.round(parseFloat(booking.rent_total) * 100),
          landlordStripeAccountId: property?.landlord_profiles?.stripe_account_id || "acct_mock"
        })
      });
      const data = await res.json();

      if (bookingId === "mock-apply-87a" || bookingId.startsWith("mock")) {
        setBooking((prev: any) => ({ ...prev, status: "deposit_paid" }));
      } else {
        const { error } = await supabase
          .from("bookings")
          .update({ 
            status: "deposit_paid",
            stripe_payment_intent_id: data.clientSecret || "pi_mock_123"
          })
          .eq("id", booking.id);
        
        if (error) throw error;
        await loadBookingData();
      }

      alert(t("paymentSuccessful"));
    } catch (err: any) {
      console.error("Error processing payment:", err);
      alert(`Payment Error: ${err.message}`);
    } finally {
      setIsPaying(false);
    }
  };

  if (authLoading || loadingData) {
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

  const isTenant = profile?.role === "tenant";
  const isLandlord = profile?.role === "landlord";

  // Calculations
  const coldRent = property ? parseFloat(property.rent_cold) : 0;
  const utilities = property ? parseFloat(property.rent_utilities || 0) : 0;
  const heating = property ? parseFloat(property.rent_heating || 0) : 0;
  const depositMonths = property ? parseInt(property.deposit_months || 3) : 3;
  const totalRent = coldRent + utilities + heating;
  const depositAmount = coldRent * depositMonths;

  // Pipeline phases
  // Pipeline phases
  const pipeline = [
    { key: "pending", label: t("pipePending") },
    { key: "docs_review", label: t("pipeDocsReview") },
    { key: "approved", label: t("pipeApproved") },
    { key: "deposit_paid", label: t("pipeDepositPaid") },
    { key: "confirmed", label: t("pipeConfirmed") },
  ];

  const currentPhaseIndex = pipeline.findIndex(p => p.key === booking?.status) !== -1
    ? pipeline.findIndex(p => p.key === booking?.status)
    : 0;

  return (
    <>
      <main className="flex-grow py-12 px-4 md:px-8 max-w-[1200px] mx-auto w-full space-y-8 bg-surface-dim">
        
        {/* Progress Pipeline */}
        <div className="bg-white border border-outline-variant p-6 rounded-3xl shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <span className="text-[12px] text-secondary font-bold uppercase tracking-wider block">
                {t("applicationStatus")}
              </span>
              <h1 className="text-headline-md font-bold text-primary mt-1">
                {property?.title || "Apartment"}
              </h1>
              <p className="text-body-sm text-on-surface-variant mt-1">
                ID: #{booking?.id} &bull; {property?.street}, {property?.zip} {normalizeCityName(property?.city, language)}
              </p>
            </div>

            <div className="flex items-center gap-2 bg-secondary-container/40 px-3 py-1.5 rounded-full text-secondary text-label-md font-bold">
              <span className="material-symbols-outlined text-[18px]">info</span>
              {t("status")}: {booking?.status.toUpperCase()}
            </div>
          </div>

          {/* Visual Step Tracker */}
          <div className="relative mt-10 mb-2">
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-outline-variant -translate-y-1/2 rounded-full hidden md:block" />
            <div 
              className="absolute top-1/2 left-0 h-1 bg-primary -translate-y-1/2 rounded-full transition-all duration-500 hidden md:block" 
              style={{ width: `${(currentPhaseIndex / (pipeline.length - 1)) * 100}%` }}
            />
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 relative">
              {pipeline.map((phase, idx) => {
                const isActive = idx <= currentPhaseIndex;
                const isCurrent = idx === currentPhaseIndex;
                return (
                  <div key={phase.key} className="flex flex-col items-center text-center">
                    <div 
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-[14px] z-10 transition-all duration-300 ${
                        isCurrent 
                          ? "bg-primary text-on-primary ring-4 ring-primary/20 scale-110" 
                          : isActive 
                            ? "bg-primary-container text-on-primary-container" 
                            : "bg-surface border-2 border-outline-variant text-on-surface-variant"
                      }`}
                    >
                      {isActive && !isCurrent ? (
                        <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                      ) : (
                        idx + 1
                      )}
                    </div>
                    <span 
                      className={`text-[12px] mt-3 font-semibold ${
                        isCurrent ? "text-primary font-bold" : "text-on-surface-variant"
                      }`}
                    >
                      {phase.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Info Columns (2/3 width on large screens) */}
          <div className="lg:col-span-2 space-y-8">
                     {/* 1. Document Upload / Verification Panel or Status Page */}
            {isTenant && booking?.status === "docs_review" ? (
              <div className="bg-white border border-outline-variant p-8 md:p-12 rounded-3xl shadow-sm text-center flex flex-col items-center justify-center gap-6 min-h-[400px]">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center animate-pulse text-primary shadow-inner">
                  <span className="material-symbols-outlined text-[40px]">manage_search</span>
                </div>
                <div className="max-w-md space-y-2">
                  <h2 className="text-headline-md font-bold text-primary">
                    {t("checkingDocuments")}
                  </h2>
                  <p className="text-body-md text-on-surface-variant leading-relaxed">
                    {t("checkingDocumentsDesc")}
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-yellow-50 text-yellow-800 px-4 py-2 rounded-full font-bold text-[13px] border border-yellow-200">
                  <span className="material-symbols-outlined text-[18px]">hourglass_empty</span>
                  {t("statusPending")}
                </div>
              </div>
            ) : (
              <div className="bg-white border border-outline-variant p-6 md:p-8 rounded-3xl shadow-sm space-y-6">
                <h2 className="text-headline-sm font-bold text-primary flex items-center gap-3">
                  <span className="material-symbols-outlined text-[28px]">verified_user</span>
                  {t("verifyTitle")}
                </h2>
                <p className="text-body-sm text-on-surface-variant leading-relaxed">
                  {t("verifyDocumentsDesc")}
                </p>

                <div className="space-y-4">
                  {[
                     { key: "passport", label: t("docPassport"), type: "passport", optional: false },
                     { key: "visa", label: t("docVisa"), type: "visa", optional: true },
                     { key: "enrollment", label: t("docEnrollment"), type: "enrollment", optional: true },
                     { key: "income", label: t("docIncome"), type: "income", optional: true },
                   ].map(({ key, label, type, optional }) => {
                    const hasDoc = isUploaded(type);
                    const fileName = getDocFileName(type);
                    const status = getDocStatus(type);

                    return (
                      <div 
                        key={key} 
                        className="p-5 bg-surface-container-low rounded-2xl border border-outline-variant/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all hover:bg-surface-container"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-label-md font-bold text-primary">{label}</p>
                            {optional ? (
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface-variant text-on-surface-variant border border-outline-variant/60">
                                {t("optional").charAt(0).toUpperCase() + t("optional").slice(1)}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                                {t("required").charAt(0).toUpperCase() + t("required").slice(1)}
                              </span>
                            )}
                          </div>
                          <p className="text-[12px] text-on-surface-variant flex items-center gap-1.5">
                            {hasDoc ? (
                              <>
                                <span className="material-symbols-outlined text-[16px] text-primary">description</span>
                                {fileName}
                              </>
                            ) : (
                              t("noDocumentUploaded")
                            )}
                          </p>
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                          {hasDoc && (
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                              status === "approved" 
                                ? "bg-green-100 text-green-800" 
                                : status === "rejected" 
                                  ? "bg-red-100 text-red-800" 
                                  : "bg-yellow-100 text-yellow-800"
                            }`}>
                              {status}
                            </span>
                          )}

                          {isTenant && booking?.status === "pending" && (
                            <div className="flex items-center gap-2">
                              <input 
                                type="file" 
                                id={`upload-${key}`} 
                                className="hidden" 
                                accept=".pdf,.png,.jpg,.jpeg"
                                onChange={(e) => handleFileUpload(type, e)}
                                disabled={uploadingDoc === type}
                              />
                              <label 
                                htmlFor={`upload-${key}`}
                                className="bg-primary text-on-primary px-4 py-2 rounded-xl text-[12px] font-bold hover:opacity-95 active:scale-98 transition-all cursor-pointer block text-center select-none"
                              >
                                {uploadingDoc === type ? (
                                  <span className="flex items-center gap-1.5">
                                    <span className="animate-spin rounded-full h-3 w-3 border-2 border-on-primary border-t-transparent" />
                                    ...
                                  </span>
                                ) : (
                                  hasDoc ? t("replace") : t("upload")
                                )}
                              </label>

                              {hasDoc && (
                                <button
                                  onClick={() => handleDocRemove(type)}
                                  className="px-3 py-2 rounded-xl text-[12px] font-bold border border-error text-error hover:bg-error/5 active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                                  title={t("removeDocument")}
                                >
                                  <span className="material-symbols-outlined text-[14px]">delete</span>
                                  <span>{t("delete")}</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Submit to review action */}
                {isTenant && booking?.status === "pending" && (
                  <div className="pt-4 border-t border-outline-variant flex justify-end">
                    <button
                      onClick={submitForReview}
                      disabled={documents.length < 1 || submittingReview}
                      className="bg-primary text-on-primary px-6 py-3.5 rounded-2xl font-bold hover:opacity-95 active:scale-98 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow text-label-md"
                    >
                      {submittingReview ? (
                        <span className="flex items-center gap-2">
                          <span className="animate-spin rounded-full h-4 w-4 border-2 border-on-primary border-t-transparent" />
                          {t("submittingDocs")}
                        </span>
                      ) : (
                        t("submitDocsForReview")
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {isLandlord && booking?.status !== "pending" && (
              <div className="bg-white border border-outline-variant p-6 md:p-8 rounded-3xl shadow-sm space-y-6 relative overflow-hidden">
                <div className="flex justify-between items-center flex-wrap gap-4 border-b border-outline-variant pb-4">
                  <h2 className="text-headline-sm font-bold text-primary flex items-center gap-3">
                    <span className="material-symbols-outlined text-[28px]">rate_review</span>
                    {t("reviewApplication")}
                  </h2>
                </div>

                <div className="space-y-4">
                  <p className="text-body-sm text-on-surface-variant leading-relaxed">
                    {booking?.status === "docs_review" ? (
                      t("reviewApplicationDesc")
                    ) : booking?.status === "approved" || booking?.status === "deposit_paid" || booking?.status === "confirmed" ? (
                      t("applicationApproved")
                    ) : (
                      t("applicationRejected")
                    )}
                  </p>
                </div>

                {/* Landlord Decision buttons */}
                {isLandlord && (booking?.status === "docs_review" || booking?.status === "pending") && (
                  <div className="pt-6 border-t border-outline-variant flex gap-4 flex-wrap justify-end">
                    <button
                      onClick={() => updateBookingStatus("cancelled")}
                      disabled={updatingStatus !== null}
                      className="px-6 py-3.5 rounded-2xl font-bold border border-red-200 text-red-700 hover:bg-red-50 active:scale-98 transition-all text-label-md cursor-pointer"
                    >
                      {t("rejectApplication")}
                    </button>
                    <button
                      onClick={() => updateBookingStatus("approved")}
                      disabled={updatingStatus !== null}
                      className="bg-primary text-on-primary px-6 py-3.5 rounded-2xl font-bold hover:opacity-95 active:scale-98 transition-all shadow text-label-md cursor-pointer"
                    >
                      {t("approveApplication")}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar Cost & Payment (1/3 width) */}
          <div className="space-y-8">
            
            {/* Rent Breakdown Card */}
            <div className="bg-white border border-outline-variant p-6 rounded-3xl shadow-sm space-y-6">
              <h2 className="text-headline-sm font-bold text-primary flex items-center gap-3">
                <span className="material-symbols-outlined text-[24px]">receipt_long</span>
                {t("costsTitle")}
              </h2>

              <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/60 space-y-3">
                <div className="flex justify-between text-body-sm text-on-surface-variant">
                  <span>{t("coldRent")}</span>
                  <span className="font-bold">{formatPrice(coldRent)}</span>
                </div>
                <div className="flex justify-between text-body-sm text-on-surface-variant">
                  <span>{t("utilities")}</span>
                  <span className="font-bold">{formatPrice(utilities)}</span>
                </div>
                <div className="flex justify-between text-body-sm text-on-surface-variant">
                  <span>{t("heatingCosts")}</span>
                  <span className="font-bold">{formatPrice(heating)}</span>
                </div>
                <div className="h-px bg-outline-variant my-2" />
                <div className="flex justify-between text-label-lg font-bold text-primary">
                  <span>{t("totalRent")}</span>
                  <span>{formatPrice(totalRent)}</span>
                </div>
              </div>

              <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex justify-between items-center">
                <div>
                  <span className="text-[11px] text-on-surface-variant font-bold uppercase tracking-wider block">
                    {t("depositEscrow")}
                  </span>
                  <span className="text-[11px] text-primary font-bold">
                    ({depositMonths} {t("monthsRent")})
                  </span>
                </div>
                <span className="text-headline-sm font-black text-primary">
                  {formatPrice(depositAmount)}
                </span>
              </div>
            </div>

            {/* Dynamic Payments & Actions Callouts */}
            <div className="bg-white border border-outline-variant p-6 rounded-3xl shadow-sm space-y-6">
              
              {/* Tenant Payments Card */}
              {isTenant && (
                <div className="space-y-4">
                  {booking?.status === "pending" && (
                    <div className="p-4 bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-2xl text-[12px] font-medium leading-relaxed">
                      {t("proceedDocsDesc")}
                    </div>
                  )}

                  {booking?.status === "docs_review" && (
                    <div className="p-4 bg-primary/10 text-primary border border-primary/20 rounded-2xl text-[12px] font-medium leading-relaxed">
                      {t("docsUnderReviewDesc")}
                    </div>
                  )}

                  {booking?.status === "approved" && (
                    <form onSubmit={handleEscrowPayment} className="space-y-4">
                      <div className="p-4 bg-green-50 text-green-800 border border-green-200 rounded-2xl text-[12px] font-medium leading-relaxed">
                        {t("appApprovedEscrowDesc")}
                      </div>

                      {/* Mock Credit Card Elements */}
                      <div className="space-y-3 bg-surface-container-low p-4 rounded-2xl border border-outline-variant/60">
                        <div>
                          <label className="text-[10px] font-black uppercase text-on-surface-variant block mb-1">Cardholder Name</label>
                          <input 
                            type="text" 
                            required
                            placeholder="Jane Doe"
                            value={cardholder}
                            onChange={(e) => setCardholder(e.target.value)}
                            className="w-full bg-white border border-outline-variant px-3 py-2 rounded-xl text-[12px] focus:outline-none focus:border-primary"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase text-on-surface-variant block mb-1">Card Details</label>
                          <div className="relative">
                            <input 
                              type="text" 
                              required
                              maxLength={19}
                              placeholder="4242 4242 4242 4242"
                              value={cardNumber}
                              onChange={(e) => setCardNumber(e.target.value)}
                              className="w-full bg-white border border-outline-variant pl-3 pr-10 py-2 rounded-xl text-[12px] focus:outline-none focus:border-primary"
                            />
                            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">credit_card</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-black uppercase text-on-surface-variant block mb-1">Expiry</label>
                            <input 
                              type="text" 
                              required
                              maxLength={5}
                              placeholder="MM/YY"
                              value={cardExpiry}
                              onChange={(e) => setCardExpiry(e.target.value)}
                              className="w-full bg-white border border-outline-variant px-3 py-2 rounded-xl text-[12px] focus:outline-none focus:border-primary text-center"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-black uppercase text-on-surface-variant block mb-1">CVC</label>
                            <input 
                              type="password" 
                              required
                              maxLength={3}
                              placeholder="***"
                              value={cardCvc}
                              onChange={(e) => setCardCvc(e.target.value)}
                              className="w-full bg-white border border-outline-variant px-3 py-2 rounded-xl text-[12px] focus:outline-none focus:border-primary text-center"
                            />
                          </div>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isPaying}
                        className="w-full bg-primary text-on-primary py-4 rounded-2xl font-bold hover:opacity-95 active:scale-98 transition-all shadow text-label-md cursor-pointer flex justify-center items-center gap-2"
                      >
                        {isPaying ? (
                          <>
                            <span className="animate-spin rounded-full h-4 w-4 border-2 border-on-primary border-t-transparent" />
                            {t("processingPayment")}
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-[20px]">lock</span>
                            {t("escrowRentDeposit")}
                          </>
                        )}
                      </button>
                    </form>
                  )}

                  {booking?.status === "deposit_paid" && (
                    <div className="w-full bg-green-50 border border-green-200 p-5 rounded-2xl flex flex-col items-center text-center gap-3 text-green-800">
                      <span className="material-symbols-outlined text-[40px] text-green-600" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                      <div>
                        <p className="font-black text-label-lg">{t("depositEscrowed")}</p>
                        <p className="text-[12px] mt-1 text-green-700/80 leading-relaxed">
                          {t("depositEscrowedDesc")}
                        </p>
                      </div>
                    </div>
                  )}

                  {booking?.status === "confirmed" && (
                    <div className="w-full bg-primary-fixed/20 border border-primary/20 p-5 rounded-2xl flex flex-col items-center text-center gap-3 text-primary">
                      <span className="material-symbols-outlined text-[40px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      <div>
                        <p className="font-black text-label-lg">{t("leaseConfirmed")}</p>
                        <p className="text-[12px] mt-1 text-on-surface-variant leading-relaxed">
                          {t("leaseConfirmedDesc")}
                        </p>
                      </div>
                    </div>
                  )}

                  {booking?.status === "cancelled" && (
                    <div className="p-4 bg-red-50 text-red-800 border border-red-200 rounded-2xl text-[12px] font-medium text-center">
                      {t("bookingRejectedDesc")}
                    </div>
                  )}
                </div>
              )}

              {/* Landlord Actions / Payment Alerts */}
              {isLandlord && (
                <div className="space-y-4">
                  {booking?.status === "pending" && (
                    <div className="p-4 bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-2xl text-[12px] font-medium text-center">
                      {t("waitingTenantDocs")}
                    </div>
                  )}

                  {booking?.status === "docs_review" && (
                    <div className="p-4 bg-primary/10 text-primary border border-primary/20 rounded-2xl text-[12px] font-medium text-center">
                      {t("docsSubmittedReviewDesc")}
                    </div>
                  )}

                  {booking?.status === "approved" && (
                    <div className="p-4 bg-green-50 text-green-800 border border-green-200 rounded-2xl text-[12px] font-medium text-center">
                      {t("approvedWaitingDeposit")}
                    </div>
                  )}

                  {booking?.status === "deposit_paid" && (
                    <div className="space-y-4">
                      <div className="p-4 bg-green-50 text-green-800 border border-green-200 rounded-2xl text-[12px] font-medium leading-relaxed text-center">
                        {t("tenantPaidDepositDesc")}
                      </div>

                      <button
                        onClick={() => updateBookingStatus("confirmed")}
                        disabled={updatingStatus !== null}
                        className="w-full bg-primary text-on-primary py-4 rounded-2xl font-bold hover:opacity-95 active:scale-98 transition-all shadow text-label-md cursor-pointer flex justify-center items-center gap-2"
                      >
                        {updatingStatus === "confirmed" ? (
                          <span className="animate-spin rounded-full h-4 w-4 border-2 border-on-primary border-t-transparent" />
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-[20px]">assignment_turned_in</span>
                            {t("confirmLeaseContract")}
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {booking?.status === "confirmed" && (
                    <div className="w-full bg-primary-fixed/20 border border-primary/20 p-5 rounded-2xl flex flex-col items-center text-center gap-3 text-primary">
                      <span className="material-symbols-outlined text-[40px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>task_alt</span>
                      <div>
                        <p className="font-black text-label-lg">{t("bookingConfirmed")}</p>
                        <p className="text-[12px] mt-1 text-on-surface-variant leading-relaxed font-medium">
                          {t("leaseConfirmedActiveDesc")}
                        </p>
                      </div>
                    </div>
                  )}

                  {booking?.status === "cancelled" && (
                    <div className="p-4 bg-red-50 text-red-800 border border-red-200 rounded-2xl text-[12px] font-medium text-center">
                      {t("applicationRejected")}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
