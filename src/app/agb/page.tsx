"use client";

import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import Footer from "@/components/layout/Footer";

const sections = [
  {
    id: "scope",
    de: "1. Geltungsbereich & Leistungsbeschreibung",
    en: "1. Scope & Service Description",
    contentDe: `Heimstadt betreibt einen Online-Marktplatz, auf dem Vermieter Wohnräume anbieten und Mieter diese vor der Ankunft buchen können. Die Buchungen unterliegen einer Bonitäts- und Identitätsprüfung gemäß § 551 BGB. Heimstadt agiert ausschließlich als Vermittler zwischen Mietern und Vermietern und ist nicht Vertragspartei des Mietvertrags selbst.\n\nDiese Allgemeinen Geschäftsbedingungen gelten für alle Nutzer der Plattform – sowohl für Mieter als auch für Vermieter – und für alle Dienstleistungen, die über die Website heimstadt.de oder die zugehörige mobile Anwendung angeboten werden. Durch die Nutzung unserer Plattform stimmen Sie diesen Bedingungen in ihrer jeweils aktuellen Fassung zu.`,
    contentEn: `Heimstadt operates an online marketplace where landlords can offer housing and tenants can book them before arrival. Bookings are subject to credit and identity verification processes pursuant to § 551 BGB. Heimstadt acts solely as an intermediary between tenants and landlords and is not a party to the lease agreement itself.\n\nThese General Terms and Conditions apply to all users of the platform — both tenants and landlords — and to all services offered via the website heimstadt.de or the associated mobile application. By using our platform, you agree to these terms in their current version.`,
  },
  {
    id: "eligibility",
    de: "2. Alterseignung & Registrierungsvoraussetzungen",
    en: "2. Age Eligibility & Registration Requirements",
    contentDe: `Die Nutzung der Heimstadt-Plattform ist ausschließlich Personen gestattet, die das 18. Lebensjahr vollendet haben und rechtlich in der Lage sind, verbindliche Verträge abzuschließen. Minderjährige dürfen unsere Dienste nicht nutzen.\n\nBei der Registrierung müssen Sie korrekte, vollständige und aktuelle Informationen angeben. Jede Person darf nur ein einziges Konto anlegen. Die Weitergabe von Zugangsdaten an Dritte ist ausdrücklich untersagt. Heimstadt behält sich das Recht vor, Konten bei Verdacht auf betrügerische Aktivitäten oder bei Verstoß gegen diese AGB ohne Vorankündigung zu sperren oder dauerhaft zu löschen.`,
    contentEn: `Use of the Heimstadt platform is exclusively permitted to persons who have reached the age of 18 and are legally capable of entering into binding contracts. Minors may not use our services.\n\nWhen registering, you must provide accurate, complete, and current information. Each person may only create a single account. Sharing login credentials with third parties is expressly prohibited. Heimstadt reserves the right to suspend or permanently delete accounts if there is suspicion of fraudulent activity or violation of these Terms without prior notice.`,
  },
  {
    id: "escrow",
    de: "3. Treuhandzahlungen & Stornierung",
    en: "3. Escrow Payments & Cancellations",
    contentDe: `Bei einer erfolgreichen Zusage zahlt der Mieter die Kaution und die erste Monatsmiete auf ein Treuhandkonto (Escrow). Die Freigabe an den Vermieter erfolgt 48 Stunden nach dem vertraglich vereinbarten Einzugsdatum, um Betrug vorzubeugen.\n\nStornierungen, die mehr als 14 Tage vor dem Einzugsdatum erfolgen, werden vollständig erstattet. Bei Stornierungen zwischen 7 und 14 Tagen vor dem Einzug wird eine Bearbeitungsgebühr von 20% einbehalten. Stornierungen innerhalb von 7 Tagen vor dem Einzug sind nicht erstattungsfähig, es sei denn, der Vermieter hat wesentliche Angaben im Inserat nachweislich falsch gemacht.`,
    contentEn: `Upon successful approval, the tenant pays the deposit and first month's rent into an escrow account. The amount is transferred to the landlord 48 hours after the contracted move-in date to prevent fraud.\n\nCancellations made more than 14 days before the move-in date will be fully refunded. Cancellations between 7 and 14 days before move-in will incur a 20% processing fee. Cancellations within 7 days of move-in are non-refundable, unless the landlord has demonstrably provided materially false information in the listing.`,
  },
  {
    id: "fee",
    de: "4. Servicegebühr",
    en: "4. Service Fee",
    contentDe: `Heimstadt erhebt eine Vermittlungsgebühr von 8% des gesamten Buchungswerts. Diese Gebühr wird direkt während des Zahlungsvorgangs per Stripe Connect einbehalten und ist nicht rückerstattungsfähig, sofern die Buchung vom Nutzer storniert wird.\n\nVermieter können optional auf das Heimstadt Premium-Paket upgraden, das eine reduzierte Gebühr von 5% sowie erweiterte Listing-Funktionen, Priority-Support und ein verifiziertes Abzeichen auf ihrem Profil umfasst. Die Preise für Premium-Pakete sind auf der Preisseite einsehbar und können sich nach vorheriger Ankündigung ändern.`,
    contentEn: `Heimstadt collects a service fee of 8% of the total booking value. This fee is automatically deducted during checkout via Stripe Connect and is non-refundable if the booking is cancelled by the user.\n\nLandlords can optionally upgrade to the Heimstadt Premium package, which includes a reduced fee of 5% as well as advanced listing features, priority support, and a verified badge on their profile. Prices for Premium packages are viewable on the pricing page and may change with prior notice.`,
  },
  {
    id: "responsibilities",
    de: "5. Pflichten & Verantwortlichkeiten",
    en: "5. Responsibilities & Obligations",
    contentDe: `Vermieter sind verpflichtet, genaue, vollständige und aktuelle Informationen in ihren Inseraten bereitzustellen, einschließlich Fotos, Ausstattung, Preisen und Verfügbarkeit. Das Einstellen gefälschter oder irreführender Angebote führt zur sofortigen Sperrung des Kontos.\n\nMieter sind verpflichtet, alle erforderlichen Identitäts- und Bonitätsdokumente vollständig und wahrheitsgemäß hochzuladen. Unvollständige oder gefälschte Dokumente führen zur Ablehnung der Bewerbung und können zur Strafanzeige führen.\n\nBeide Parteien verpflichten sich, respektvoll und in Übereinstimmung mit den geltenden Gesetzen miteinander zu kommunizieren. Belästigung, Diskriminierung oder jede Form von Missbrauch der Plattform ist verboten.`,
    contentEn: `Landlords are obligated to provide accurate, complete, and current information in their listings, including photos, amenities, prices, and availability. Posting fake or misleading offers will result in immediate account suspension.\n\nTenants are obligated to upload all required identity and credit documents completely and truthfully. Incomplete or forged documents will result in the rejection of the application and may lead to criminal charges.\n\nBoth parties agree to communicate respectfully and in accordance with applicable laws. Harassment, discrimination, or any form of abuse of the platform is prohibited.`,
  },
  {
    id: "refund",
    de: "6. Rückerstattungen & Streitbeilegung",
    en: "6. Refunds & Dispute Resolution",
    contentDe: `Im Falle einer Streitigkeit zwischen Mieter und Vermieter kann Heimstadt als Vermittler tätig werden, um eine einvernehmliche Lösung zu finden. Heimstadt ist jedoch nicht verpflichtet, als Schlichter zu agieren, und haftet nicht für die Ergebnisse solcher Verhandlungen.\n\nRückerstattungsanträge müssen innerhalb von 30 Tagen nach dem vertraglich vereinbarten Einzugsdatum schriftlich an support@heimstadt.de eingereicht werden. Anträge, die nach diesem Zeitraum gestellt werden, werden nicht bearbeitet.\n\nFür alle Streitigkeiten aus oder im Zusammenhang mit diesen AGB gilt ausschließlich deutsches Recht. Als ausschließlicher Gerichtsstand für alle Streitigkeiten wird Berlin vereinbart, sofern der Nutzer Kaufmann, eine juristische Person des öffentlichen Rechts oder ein öffentlich-rechtliches Sondervermögen ist.`,
    contentEn: `In the event of a dispute between tenant and landlord, Heimstadt may act as a mediator to find an amicable solution. However, Heimstadt is not obligated to act as an arbitrator and is not liable for the outcomes of such negotiations.\n\nRefund requests must be submitted in writing to support@heimstadt.de within 30 days of the contractually agreed move-in date. Requests submitted after this period will not be processed.\n\nFor all disputes arising from or in connection with these Terms, German law applies exclusively. Berlin is agreed as the exclusive place of jurisdiction for all disputes, insofar as the user is a merchant, a legal entity under public law, or a public law special fund.`,
  },
  {
    id: "liability",
    de: "7. Haftungsbeschränkung",
    en: "7. Limitation of Liability",
    contentDe: `Heimstadt haftet nicht für Schäden, die durch höhere Gewalt, technische Störungen, Cyberangriffe oder das Verhalten von Dritten (einschließlich Mietern und Vermietern) entstehen. Im Falle einer nachgewiesenen Fahrlässigkeit durch Heimstadt ist die Haftung auf den Wert der betroffenen Transaktion begrenzt.\n\nHeimstadt übernimmt keine Garantie für die dauerhaft ununterbrochene Verfügbarkeit der Plattform. Wartungsarbeiten werden nach Möglichkeit außerhalb der Stoßzeiten durchgeführt und im Voraus angekündigt.`,
    contentEn: `Heimstadt is not liable for damages caused by force majeure, technical failures, cyber attacks, or the behavior of third parties (including tenants and landlords). In the event of proven negligence by Heimstadt, liability is limited to the value of the affected transaction.\n\nHeimstadt does not guarantee permanently uninterrupted availability of the platform. Maintenance work will be carried out outside of peak hours where possible and announced in advance.`,
  },
  {
    id: "changes",
    de: "8. Änderungen der AGB",
    en: "8. Changes to the Terms",
    contentDe: `Heimstadt behält sich das Recht vor, diese AGB jederzeit zu ändern. Über wesentliche Änderungen werden Nutzer per E-Mail und/oder durch einen auffälligen Hinweis auf der Plattform mindestens 14 Tage vor Inkrafttreten informiert.\n\nDie weitere Nutzung der Plattform nach Inkrafttreten der Änderungen gilt als Zustimmung zu den neuen AGB. Sollten Sie mit den Änderungen nicht einverstanden sein, steht es Ihnen frei, Ihr Konto jederzeit zu löschen.`,
    contentEn: `Heimstadt reserves the right to modify these Terms at any time. Users will be informed of material changes via email and/or a prominent notice on the platform at least 14 days before they take effect.\n\nContinued use of the platform after changes take effect constitutes acceptance of the new Terms. If you disagree with the changes, you are free to delete your account at any time.`,
  },
];

export default function AGBPage() {
  const { language, t } = useLanguage();

  return (
    <>
      <main className="flex-grow bg-background">
        {/* Hero Header */}
        <div className="bg-gradient-to-br from-primary via-primary-container to-[#1e3a6e] py-16 px-5">
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
                  {t("agb_premiumHousingPlatform")}
                </span>
              </div>
            </div>

            <h1 className="text-[32px] md:text-[42px] font-black text-white leading-tight">
              {t("agb_termsOfServiceAgb")}
            </h1>
            <p className="mt-3 text-white/70 text-[15px] max-w-xl leading-relaxed">
              {t("agb_pleaseReadTheseTermsCarefullyB")}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-white text-[12px] font-semibold">
                <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                {t("agb_lastUpdatedJune212026")}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-white text-[12px] font-semibold">
                <span className="material-symbols-outlined text-[14px]">gavel</span>
                {t("agb_germanLaw")}
              </span>
            </div>
          </div>
        </div>

        {/* Table of Contents */}
        <div className="max-w-[800px] mx-auto px-5 py-10">
          <div className="bg-white border border-outline-variant rounded-2xl p-6 mb-10 shadow-sm">
            <h2 className="text-[13px] font-black text-primary uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">format_list_bulleted</span>
              {t("agb_tableOfContents")}
            </h2>
            <ol className="space-y-2">
              {sections.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="text-[14px] text-on-surface-variant hover:text-primary transition-colors hover:underline font-medium flex items-center gap-2 group"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary/60 group-hover:bg-primary transition-colors flex-shrink-0" />
                    {language === "de" ? s.de : s.en}
                  </a>
                </li>
              ))}
            </ol>
          </div>

          {/* Sections */}
          <div className="space-y-10">
            {sections.map((s, idx) => (
              <section
                key={s.id}
                id={s.id}
                className="bg-white border border-outline-variant rounded-2xl p-7 shadow-sm scroll-mt-24"
              >
                <h2 className="text-[20px] font-black text-primary mb-4 pb-3 border-b border-outline-variant/50">
                  {language === "de" ? s.de : s.en}
                </h2>
                {(language === "de" ? s.contentDe : s.contentEn)
                  .split("\n\n")
                  .map((para, i) => (
                    <p
                      key={i}
                      className="text-[15px] text-on-surface-variant leading-relaxed mb-3 last:mb-0"
                    >
                      {para}
                    </p>
                  ))}
              </section>
            ))}
          </div>

          {/* Footer note */}
          <div className="mt-10 p-6 bg-primary/5 border border-primary/20 rounded-2xl flex gap-4 items-start">
            <span className="material-symbols-outlined text-primary text-[24px] flex-shrink-0 mt-0.5">
              info
            </span>
            <div>
              <p className="text-[14px] font-bold text-primary mb-1">
                {t("agb_questionsAboutOurTerms")}
              </p>
              <p className="text-[13px] text-on-surface-variant leading-relaxed">
                {t("agb_ifYouHaveQuestionsAboutTheseTe")}
                <a
                  href="mailto:legal@heimstadt.de"
                  className="text-primary font-semibold hover:underline"
                >
                  legal@heimstadt.de
                </a>
                {t("agb_OrWriteToHeimstadtImmobilienGm")}
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
