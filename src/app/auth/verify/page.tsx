"use client";

import { useRef, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/utils/supabase/client";
import Footer from "@/components/layout/Footer";

export default function VerifyPage() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [uploads, setUploads] = useState<Record<string, string>>({});
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleFileChange = async (docType: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDoc(docType);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      // 1. Upload file directly via server-side endpoint (bypasses direct browser-to-GCS CORS issues)
      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", user?.id ?? "anon");

      const res = await fetch("/api/upload/doc", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Upload failed");

      const { key } = data;

      // 2. Save document to Supabase if user is logged in
      if (user) {
        const { error } = await supabase
          .from("verification_documents")
          .upsert(
            { user_id: user.id, doc_type: docType, s3_key: key, file_name: file.name, status: "approved" },
            { onConflict: "user_id,doc_type" }
          );
        if (error) console.warn("Supabase record error:", error.message);
      }

      setUploads((prev) => ({ ...prev, [docType]: file.name }));
      setSuccessMsg(t("verify_filenameUploadedSuccessfully"));
    } catch (err: any) {
      console.error("Upload error:", err);
      setErrorMsg(err.message || "Upload failed");
    } finally {
      setUploadingDoc(null);
      e.target.value = "";
    }
  };

  const handleDocRemove = async (docType: string) => {
    try {
      if (user) {
        const { error } = await supabase
          .from("verification_documents")
          .delete()
          .eq("user_id", user.id)
          .eq("doc_type", docType);
        if (error) throw error;
      }
      setUploads((prev) => {
        const next = { ...prev };
        delete next[docType];
        return next;
      });
      setSuccessMsg(t("verify_documentSuccessfullyRemoved"));
    } catch (err: any) {
      console.error("Delete error:", err);
      setErrorMsg(err.message || "Failed to delete document");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const hasPassport = uploads["passport"];
    if (!hasPassport) {
      setErrorMsg(t("verify_pleaseUploadAtLeastYourPasspor"));
      return;
    }
    alert(
      t("verify_yourDocumentsHaveBeenSuccessfu")
    );
  };

  const docTypes = [
    { id: "passport", label: t("docPassport"), icon: "badge", optional: false },
    { id: "visa", label: t("docVisa"), icon: "assignment_ind", optional: true },
    { id: "enrollment", label: t("docEnrollment"), icon: "school", optional: true },
    { id: "income", label: t("docIncome"), icon: "receipt_long", optional: true },
  ];

  return (
    <>
      <div className="flex-grow py-16 px-5 bg-gradient-to-br from-surface-container-low via-background to-surface-container">
        <div className="max-w-3xl mx-auto bg-white/90 backdrop-blur-md border border-outline-variant p-8 md:p-12 rounded-2xl shadow-xl">
          <div className="text-center mb-10">
            <h1 className="text-display-lg-mobile md:text-headline-lg text-primary font-bold mb-3">
              {t("verifyTitle")}
            </h1>
            <p className="text-on-surface-variant text-body-md max-w-xl mx-auto">
              {t("verifySubtitle")}
            </p>
          </div>

          {/* Feedback banners */}
          {successMsg && (
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl text-[13px] font-semibold mb-6">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              {successMsg}
            </div>
          )}
          {errorMsg && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-[13px] font-semibold mb-6">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {docTypes.map(({ id, label, icon, optional }) => {
                const uploadedName = uploads[id];
                const isUploading = uploadingDoc === id;
                return (
                  <div
                    key={id}
                    className={`border-2 border-dashed rounded-2xl p-6 transition-all relative ${
                      uploadedName
                        ? "border-primary bg-primary-fixed/20"
                        : "border-outline-variant hover:border-primary bg-surface-container-low"
                    }`}
                  >
                    <div className="flex gap-4 items-start">
                      <div className="bg-white p-3 rounded-xl shadow-sm border border-outline-variant flex-shrink-0">
                        <span className="material-symbols-outlined text-primary text-[28px]">
                          {icon}
                        </span>
                      </div>
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-label-md font-bold text-primary">{label}</h3>
                          {optional ? (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface-variant text-on-surface-variant border border-outline-variant/60">
                              {t("verify_optional")}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                              {t("verify_required")}
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] text-on-surface-variant leading-relaxed truncate">
                          {uploadedName ? `📎 ${uploadedName}` : (t("verify_pdfJpgOrPngUpTo10mb"))}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                      {uploadedName ? (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 text-primary text-[12px] font-bold">
                            <span className="material-symbols-outlined text-[16px]">check_circle</span>
                            {t("uploadSuccess")}
                          </div>
                          {/* Allow replacing */}
                          <label
                            htmlFor={`verify-upload-${id}`}
                            className="text-[12px] text-on-surface-variant underline cursor-pointer hover:text-primary"
                          >
                            {t("verify_replace")}
                          </label>
                          <button
                            type="button"
                            onClick={() => handleDocRemove(id)}
                            className="text-[12px] text-error underline cursor-pointer hover:opacity-85"
                          >
                            {t("verify_remove")}
                          </button>
                        </div>
                      ) : (
                        <label
                          htmlFor={`verify-upload-${id}`}
                          className={`flex items-center gap-1.5 bg-primary text-on-primary px-4 py-2 rounded-lg text-[12px] font-bold hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow select-none ${isUploading ? "opacity-60 pointer-events-none" : ""}`}
                        >
                          {isUploading ? (
                            <>
                              <span className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                              <span>{t("verify_uploading")}</span>
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-[14px]">upload_file</span>
                              <span>{t("verify_uploadFile")}</span>
                            </>
                          )}
                        </label>
                      )}
                      <input
                        ref={(el) => { inputRefs.current[id] = el; }}
                        id={`verify-upload-${id}`}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="sr-only"
                        onChange={(e) => handleFileChange(id, e)}
                        disabled={uploadingDoc !== null}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-6 border-t border-outline-variant flex justify-end">
              <button
                id="btn-verify-submit"
                type="submit"
                className="bg-primary text-on-primary px-8 py-4 rounded-xl font-bold hover:opacity-90 active:scale-95 transition-all shadow-md cursor-pointer text-label-md"
              >
                {t("verifySubmitBtn")}
              </button>
            </div>
          </form>
        </div>
      </div>
      <Footer />
    </>
  );
}
