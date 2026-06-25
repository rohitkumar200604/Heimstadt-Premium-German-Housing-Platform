"use client";

import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import Footer from "@/components/layout/Footer";

export default function ImpressumPage() {
  const { language, t } = useLanguage();

  return (
    <>
      <main className="flex-grow bg-background">
        {/* Hero Header */}
        <div className="bg-gradient-to-br from-[#0d2137] via-primary to-[#1a3a5c] py-16 px-5">
          <div className="max-w-[800px] mx-auto">
            {/* Logo + Name */}
            <div className="flex items-center gap-4 mb-8">
              <Link href="/" className="hover:opacity-90 transition-opacity flex-shrink-0">
                <img
                  src="/logo.jpg"
                  alt="Heimstadt"
                  className="h-14 w-auto object-contain rounded-xl shadow-lg"
                />
              </Link>
              <div>
                <span className="text-[28px] font-black text-white tracking-tight leading-none block">
                  Heimstadt
                </span>
                <span className="text-[12px] text-white/60 font-semibold uppercase tracking-[0.2em]">
                  {t("impressum_premiumHousingPlatform")}
                </span>
              </div>
            </div>

            <h1 className="text-[32px] md:text-[42px] font-black text-white leading-tight">
              {t("impressum_legalNoticeImpressum")}
            </h1>
            <p className="mt-3 text-white/70 text-[15px] max-w-xl leading-relaxed">
              {t("impressum_mandatoryInformationPursuantTo")}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-white text-[12px] font-semibold">
                <span className="material-symbols-outlined text-[14px]">business</span>
                GmbH · Berlin
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-white text-[12px] font-semibold">
                <span className="material-symbols-outlined text-[14px]">balance</span>
                § 5 TMG
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-[800px] mx-auto px-5 py-10 space-y-6">

          {/* Company Details */}
          <section className="bg-white border border-outline-variant rounded-2xl p-7 shadow-sm">
            <h2 className="text-[20px] font-black text-primary mb-5 pb-3 border-b border-outline-variant/50 flex items-center gap-2">
              <span className="material-symbols-outlined text-[22px]">apartment</span>
              {t("impressum_informationPursuantTo5Tmg")}
            </h2>
            <div className="space-y-1">
              <p className="text-[16px] font-black text-primary">Heimstadt Immobilien GmbH</p>
              <p className="text-[15px] text-on-surface-variant">Torstraße 142</p>
              <p className="text-[15px] text-on-surface-variant">10119 Berlin</p>
              <p className="text-[15px] text-on-surface-variant">
                {t("impressum_germany")}
              </p>
            </div>
          </section>

          {/* Contact */}
          <section className="bg-white border border-outline-variant rounded-2xl p-7 shadow-sm">
            <h2 className="text-[20px] font-black text-primary mb-5 pb-3 border-b border-outline-variant/50 flex items-center gap-2">
              <span className="material-symbols-outlined text-[22px]">contact_phone</span>
              {t("impressum_contact")}
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                {
                  icon: "phone",
                  label: t("impressum_phone"),
                  value: "+49 (0) 30 123 456 78",
                  href: "tel:+493012345678",
                },
                {
                  icon: "mail",
                  label: t("impressum_emailGeneral"),
                  value: "kontakt@heimstadt.de",
                  href: "mailto:kontakt@heimstadt.de",
                },
                {
                  icon: "support_agent",
                  label: t("impressum_emailSupport"),
                  value: "support@heimstadt.de",
                  href: "mailto:support@heimstadt.de",
                },
                {
                  icon: "gavel",
                  label: t("impressum_emailLegal"),
                  value: "legal@heimstadt.de",
                  href: "mailto:legal@heimstadt.de",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-start gap-3 p-4 bg-surface-container-low rounded-xl border border-outline-variant/40"
                >
                  <span className="material-symbols-outlined text-primary text-[20px] flex-shrink-0 mt-0.5">
                    {item.icon}
                  </span>
                  <div>
                    <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-0.5">
                      {item.label}
                    </p>
                    <a
                      href={item.href}
                      className="text-[14px] font-semibold text-primary hover:underline"
                    >
                      {item.value}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Managing Directors */}
          <section className="bg-white border border-outline-variant rounded-2xl p-7 shadow-sm">
            <h2 className="text-[20px] font-black text-primary mb-5 pb-3 border-b border-outline-variant/50 flex items-center gap-2">
              <span className="material-symbols-outlined text-[22px]">manage_accounts</span>
              {t("impressum_representedByManagingDirectors")}
            </h2>
            <div className="flex flex-col sm:flex-row gap-4">
              {["Markus Weber", "Rohit Kumar"].map((name) => (
                <div
                  key={name}
                  className="flex items-center gap-3 px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/40 flex-1"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-[16px] flex-shrink-0">
                    {name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-[15px] font-bold text-on-surface">{name}</p>
                    <p className="text-[11px] text-on-surface-variant font-semibold uppercase tracking-wider">
                      {t("impressum_managingDirector")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Register & Tax */}
          <section className="bg-white border border-outline-variant rounded-2xl p-7 shadow-sm">
            <h2 className="text-[20px] font-black text-primary mb-5 pb-3 border-b border-outline-variant/50 flex items-center gap-2">
              <span className="material-symbols-outlined text-[22px]">description</span>
              {t("impressum_commercialRegisterTax")}
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                {
                  label: t("impressum_registerCourt"),
                  value: "Amtsgericht Charlottenburg (Berlin)",
                },
                {
                  label: t("impressum_registerNumber"),
                  value: "HRB 987654 B",
                },
                {
                  label: t("impressum_vatId27aUstg"),
                  value: "DE 312 456 789",
                },
                {
                  label: t("impressum_taxNumber"),
                  value: "27/432/56789",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/40"
                >
                  <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                    {item.label}
                  </p>
                  <p className="text-[15px] font-semibold text-on-surface">{item.value}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Regulatory / Supervisory Authority */}
          <section className="bg-white border border-outline-variant rounded-2xl p-7 shadow-sm">
            <h2 className="text-[20px] font-black text-primary mb-5 pb-3 border-b border-outline-variant/50 flex items-center gap-2">
              <span className="material-symbols-outlined text-[22px]">account_balance</span>
              {t("impressum_competentSupervisoryAuthority")}
            </h2>
            <p className="text-[15px] text-on-surface-variant leading-relaxed mb-2">
              {t("impressum_heimstadtImmobilienGmbhAsAReal")}
            </p>
            <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/40 space-y-0.5">
              <p className="text-[15px] font-bold text-on-surface">
                {t("impressum_districtOfficeOfBerlinmitte")}
              </p>
              <p className="text-[14px] text-on-surface-variant">Ordnungsamt · Gewerbeangelegenheiten</p>
              <p className="text-[14px] text-on-surface-variant">Karl-Marx-Allee 31, 10178 Berlin</p>
            </div>
          </section>

          {/* Dispute Resolution */}
          <section className="bg-white border border-outline-variant rounded-2xl p-7 shadow-sm">
            <h2 className="text-[20px] font-black text-primary mb-5 pb-3 border-b border-outline-variant/50 flex items-center gap-2">
              <span className="material-symbols-outlined text-[22px]">handshake</span>
              {t("impressum_onlineDisputeResolutionOdr")}
            </h2>
            <p className="text-[15px] text-on-surface-variant leading-relaxed mb-4">
              {t("impressum_theEuropeanCommissionProvidesA")}
            </p>
            <a
              href="https://ec.europa.eu/consumers/odr"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-primary font-semibold text-[14px] hover:underline border border-primary/20 bg-primary/5 rounded-lg px-4 py-2.5 transition-colors hover:bg-primary/10"
            >
              <span className="material-symbols-outlined text-[16px]">open_in_new</span>
              ec.europa.eu/consumers/odr
            </a>
            <p className="text-[15px] text-on-surface-variant leading-relaxed mt-4">
              {t("impressum_weAreNotWillingOrObligatedToPa")}
            </p>
          </section>

          {/* Liability for Content */}
          <section className="bg-white border border-outline-variant rounded-2xl p-7 shadow-sm">
            <h2 className="text-[20px] font-black text-primary mb-5 pb-3 border-b border-outline-variant/50 flex items-center gap-2">
              <span className="material-symbols-outlined text-[22px]">policy</span>
              {t("impressum_liabilityForContentLinks")}
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-[15px] font-bold text-on-surface mb-2">
                  {t("impressum_liabilityForContent")}
                </h3>
                <p className="text-[14px] text-on-surface-variant leading-relaxed">
                  {t("impressum_asAServiceProviderWeAreRespons")}
                </p>
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-on-surface mb-2">
                  {t("impressum_liabilityForLinks")}
                </h3>
                <p className="text-[14px] text-on-surface-variant leading-relaxed">
                  {t("impressum_ourWebsiteContainsLinksToExter")}
                </p>
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-on-surface mb-2">
                  {t("impressum_copyright")}
                </h3>
                <p className="text-[14px] text-on-surface-variant leading-relaxed">
                  {t("impressum_theContentAndWorksCreatedByThe")}
                </p>
              </div>
            </div>
          </section>

          {/* Contact CTA */}
          <div className="p-6 bg-primary/5 border border-primary/20 rounded-2xl flex gap-4 items-start">
            <span className="material-symbols-outlined text-primary text-[24px] flex-shrink-0 mt-0.5">
              help
            </span>
            <div>
              <p className="text-[14px] font-bold text-primary mb-1">
                {t("impressum_legalEnquiries")}
              </p>
              <p className="text-[13px] text-on-surface-variant leading-relaxed">
                {t("impressum_forLegalEnquiriesAndCeaseandde")}
                <a
                  href="mailto:legal@heimstadt.de"
                  className="text-primary font-semibold hover:underline"
                >
                  legal@heimstadt.de
                </a>
              </p>
            </div>
          </div>

        </div>
      </main>
      <Footer />
    </>
  );
}
