"use client";

import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import Footer from "@/components/layout/Footer";

export default function ImpressumPage() {
  const { language } = useLanguage();

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
                  {language === "de" ? "Exklusive Wohnvermittlung" : "Premium Housing Platform"}
                </span>
              </div>
            </div>

            <h1 className="text-[32px] md:text-[42px] font-black text-white leading-tight">
              {language === "de" ? "Impressum" : "Legal Notice (Impressum)"}
            </h1>
            <p className="mt-3 text-white/70 text-[15px] max-w-xl leading-relaxed">
              {language === "de"
                ? "Pflichtangaben gemäß § 5 Telemediengesetz (TMG) und § 55 Rundfunkstaatsvertrag (RStV)."
                : "Mandatory information pursuant to § 5 German Telemedia Act (TMG) and § 55 Broadcasting Interstate Treaty (RStV)."}
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
              {language === "de" ? "Angaben gemäß § 5 TMG" : "Information pursuant to § 5 TMG"}
            </h2>
            <div className="space-y-1">
              <p className="text-[16px] font-black text-primary">Heimstadt Immobilien GmbH</p>
              <p className="text-[15px] text-on-surface-variant">Torstraße 142</p>
              <p className="text-[15px] text-on-surface-variant">10119 Berlin</p>
              <p className="text-[15px] text-on-surface-variant">
                {language === "de" ? "Deutschland" : "Germany"}
              </p>
            </div>
          </section>

          {/* Contact */}
          <section className="bg-white border border-outline-variant rounded-2xl p-7 shadow-sm">
            <h2 className="text-[20px] font-black text-primary mb-5 pb-3 border-b border-outline-variant/50 flex items-center gap-2">
              <span className="material-symbols-outlined text-[22px]">contact_phone</span>
              {language === "de" ? "Kontakt" : "Contact"}
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                {
                  icon: "phone",
                  label: language === "de" ? "Telefon" : "Phone",
                  value: "+49 (0) 30 123 456 78",
                  href: "tel:+493012345678",
                },
                {
                  icon: "mail",
                  label: language === "de" ? "E-Mail (Allgemein)" : "Email (General)",
                  value: "kontakt@heimstadt.de",
                  href: "mailto:kontakt@heimstadt.de",
                },
                {
                  icon: "support_agent",
                  label: language === "de" ? "E-Mail (Support)" : "Email (Support)",
                  value: "support@heimstadt.de",
                  href: "mailto:support@heimstadt.de",
                },
                {
                  icon: "gavel",
                  label: language === "de" ? "E-Mail (Rechtliches)" : "Email (Legal)",
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
              {language === "de" ? "Vertretungsberechtigte Geschäftsführer" : "Represented by Managing Directors"}
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
                      {language === "de" ? "Geschäftsführer" : "Managing Director"}
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
              {language === "de" ? "Handelsregister & Steuernummer" : "Commercial Register & Tax"}
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                {
                  label: language === "de" ? "Registergericht" : "Register Court",
                  value: "Amtsgericht Charlottenburg (Berlin)",
                },
                {
                  label: language === "de" ? "Registernummer" : "Register Number",
                  value: "HRB 987654 B",
                },
                {
                  label: language === "de" ? "Umsatzsteuer-ID (§ 27a UStG)" : "VAT ID (§ 27a UStG)",
                  value: "DE 312 456 789",
                },
                {
                  label: language === "de" ? "Steuernummer" : "Tax Number",
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
              {language === "de" ? "Zuständige Aufsichtsbehörde" : "Competent Supervisory Authority"}
            </h2>
            <p className="text-[15px] text-on-surface-variant leading-relaxed mb-2">
              {language === "de"
                ? "Heimstadt Immobilien GmbH unterliegt als Immobilienvermittler der Gewerbeaufsicht durch das:"
                : "Heimstadt Immobilien GmbH, as a real estate intermediary, is subject to commercial supervision by:"}
            </p>
            <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/40 space-y-0.5">
              <p className="text-[15px] font-bold text-on-surface">
                {language === "de" ? "Bezirksamt Mitte von Berlin" : "District Office of Berlin-Mitte"}
              </p>
              <p className="text-[14px] text-on-surface-variant">Ordnungsamt · Gewerbeangelegenheiten</p>
              <p className="text-[14px] text-on-surface-variant">Karl-Marx-Allee 31, 10178 Berlin</p>
            </div>
          </section>

          {/* Dispute Resolution */}
          <section className="bg-white border border-outline-variant rounded-2xl p-7 shadow-sm">
            <h2 className="text-[20px] font-black text-primary mb-5 pb-3 border-b border-outline-variant/50 flex items-center gap-2">
              <span className="material-symbols-outlined text-[22px]">handshake</span>
              {language === "de" ? "Streitschlichtung (ODR)" : "Online Dispute Resolution (ODR)"}
            </h2>
            <p className="text-[15px] text-on-surface-variant leading-relaxed mb-4">
              {language === "de"
                ? "Die Europäische Kommission stellt unter folgendem Link eine Plattform zur Online-Streitbeilegung (OS) bereit:"
                : "The European Commission provides a platform for online dispute resolution (ODR) at the following link:"}
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
              {language === "de"
                ? "Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen."
                : "We are not willing or obligated to participate in dispute resolution proceedings before a consumer arbitration board."}
            </p>
          </section>

          {/* Liability for Content */}
          <section className="bg-white border border-outline-variant rounded-2xl p-7 shadow-sm">
            <h2 className="text-[20px] font-black text-primary mb-5 pb-3 border-b border-outline-variant/50 flex items-center gap-2">
              <span className="material-symbols-outlined text-[22px]">policy</span>
              {language === "de" ? "Haftung für Inhalte & Links" : "Liability for Content & Links"}
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-[15px] font-bold text-on-surface mb-2">
                  {language === "de" ? "Haftung für Inhalte" : "Liability for Content"}
                </h3>
                <p className="text-[14px] text-on-surface-variant leading-relaxed">
                  {language === "de"
                    ? "Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen."
                    : "As a service provider, we are responsible for our own content on these pages in accordance with § 7 para. 1 TMG and general laws. However, under §§ 8–10 TMG, we are not obligated to monitor transmitted or stored third-party information."}
                </p>
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-on-surface mb-2">
                  {language === "de" ? "Haftung für Links" : "Liability for Links"}
                </h3>
                <p className="text-[14px] text-on-surface-variant leading-relaxed">
                  {language === "de"
                    ? "Unser Angebot enthält Links zu externen Webseiten Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich."
                    : "Our website contains links to external third-party websites over whose content we have no control. We therefore cannot accept any liability for these external contents. The respective provider or operator of the linked pages is always responsible for their content."}
                </p>
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-on-surface mb-2">
                  {language === "de" ? "Urheberrecht" : "Copyright"}
                </h3>
                <p className="text-[14px] text-on-surface-variant leading-relaxed">
                  {language === "de"
                    ? "Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers."
                    : "The content and works created by the site operators on these pages are subject to German copyright law. Duplication, processing, distribution, and any form of commercialization of such material beyond the scope of the copyright law require the written consent of the respective author or creator."}
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
                {language === "de" ? "Rechtliche Anfragen?" : "Legal enquiries?"}
              </p>
              <p className="text-[13px] text-on-surface-variant leading-relaxed">
                {language === "de"
                  ? "Für rechtliche Anfragen und Abmahnungen wenden Sie sich bitte ausschließlich schriftlich an: "
                  : "For legal enquiries and cease-and-desist notices, please contact us exclusively in writing at: "}
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
