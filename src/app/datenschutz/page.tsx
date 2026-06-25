"use client";

import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import Footer from "@/components/layout/Footer";

const sections = [
  {
    id: "overview",
    de: "1. Datenschutz auf einen Blick",
    en: "1. Privacy at a Glance",
    contentDe: `Wir nehmen den Schutz Ihrer persönlichen Daten sehr ernst und behandeln Ihre personenbezogenen Daten vertraulich und entsprechend der gesetzlichen Datenschutzvorschriften sowie dieser Datenschutzerklärung.\n\nPersonenbezogene Dokumente, die Sie für das „Book Before Arrival"-Verfahren hochladen (wie Reisepass, Visum, Immatrikulationsbescheinigung und Einkommensnachweise), werden ausschließlich verschlüsselt auf deutschen Servern gespeichert und nie an Dritte außerhalb der Plattform weitergegeben.`,
    contentEn: `We take the protection of your personal data very seriously and treat your personal data confidentially and in accordance with legal data protection regulations and this privacy policy.\n\nPersonal documents uploaded for the "Book Before Arrival" process (such as passport, visa, enrollment certificate, and proof of income) are stored fully encrypted on servers in Germany and are never shared with any third parties outside the platform.`,
  },
  {
    id: "controller",
    de: "2. Verantwortliche Stelle",
    en: "2. Data Controller",
    contentDe: `Die verantwortliche Stelle für die Datenverarbeitung auf dieser Website ist:\n\nHeimstadt Immobilien GmbH\nTorstraße 142\n10119 Berlin\n\nE-Mail: datenschutz@heimstadt.de\nTelefon: +49 (0) 30 123 456 78\n\nEin Datenschutzbeauftragter ist gemäß Art. 37 DSGVO bestellt. Sie erreichen ihn unter: dpo@heimstadt.de`,
    contentEn: `The responsible party for data processing on this website is:\n\nHeimstadt Immobilien GmbH\nTorstraße 142\n10119 Berlin\n\nEmail: datenschutz@heimstadt.de\nPhone: +49 (0) 30 123 456 78\n\nA Data Protection Officer has been appointed pursuant to Art. 37 GDPR. You can reach them at: dpo@heimstadt.de`,
  },
  {
    id: "collection",
    de: "3. Erhebung und Speicherung personenbezogener Daten",
    en: "3. Collection and Storage of Personal Data",
    contentDe: `Für die Bereitstellung unserer Dienstleistungen erfassen wir folgende Kategorien von Daten:\n\n• Kontaktdaten: Name, E-Mail-Adresse, Telefonnummer\n• Identitätsdokumente: Reisepass, Personalausweis, Visum (nur verschlüsselt gespeichert)\n• Finanzdaten: Kontoauszüge, Gehaltsnachweis, Schufa-Auskunft\n• Nutzungsdaten: IP-Adresse, Browsertyp, Besuchszeiten, aufgerufene Seiten\n• Kommunikationsdaten: Nachrichten zwischen Mietern und Vermietern über unser internes Nachrichtensystem\n\nDiese Unterlagen werden nach Mietvertragsabschluss bzw. spätestens 90 Tage nach Ablauf der Buchungsanfrage gelöscht.`,
    contentEn: `To provide our services, we collect the following categories of data:\n\n• Contact data: name, email address, phone number\n• Identity documents: passport, ID card, visa (stored encrypted only)\n• Financial data: bank statements, payslips, credit reports\n• Usage data: IP address, browser type, visit times, pages accessed\n• Communication data: messages between tenants and landlords via our internal messaging system\n\nThese documents are permanently deleted upon lease completion or at the latest 90 days after the booking request expires.`,
  },
  {
    id: "legal-basis",
    de: "4. Rechtsgrundlagen der Verarbeitung",
    en: "4. Legal Basis for Processing",
    contentDe: `Die Verarbeitung Ihrer personenbezogenen Daten erfolgt auf folgenden Rechtsgrundlagen:\n\n• Art. 6 Abs. 1 lit. a DSGVO – Ihre ausdrückliche Einwilligung, z.B. bei der Registrierung\n• Art. 6 Abs. 1 lit. b DSGVO – Erfüllung eines Vertrags, z.B. zur Abwicklung einer Buchung\n• Art. 6 Abs. 1 lit. c DSGVO – Erfüllung gesetzlicher Verpflichtungen, z.B. Steuergesetze, Geldwäscheprävention\n• Art. 6 Abs. 1 lit. f DSGVO – Wahrung berechtigter Interessen, z.B. Betrugsabwehr und Sicherheit der Plattform`,
    contentEn: `Processing of your personal data is based on the following legal grounds:\n\n• Art. 6(1)(a) GDPR – your explicit consent, e.g. when registering\n• Art. 6(1)(b) GDPR – performance of a contract, e.g. processing a booking\n• Art. 6(1)(c) GDPR – compliance with legal obligations, e.g. tax laws, anti-money laundering\n• Art. 6(1)(f) GDPR – legitimate interests, e.g. fraud prevention and platform security`,
  },
  {
    id: "third-parties",
    de: "5. Weitergabe an Dritte & Auftragsverarbeiter",
    en: "5. Sharing with Third Parties & Processors",
    contentDe: `Wir geben Ihre Daten nur an Dritte weiter, wenn dies zur Vertragserfüllung erforderlich ist oder Sie ausdrücklich eingewilligt haben. Unsere Auftragsverarbeiter sind vertraglich zur Einhaltung der DSGVO verpflichtet:\n\n• Stripe Inc. – Zahlungsabwicklung und Treuhandkonten (Datenschutzerklärung: stripe.com/privacy)\n• Supabase Inc. – Datenbankhosting auf EU-Servern (Datenschutzerklärung: supabase.com/privacy)\n• Vercel Inc. – Serverless Hosting (SCCs für USA-Transfer vorhanden)\n• Twilio Inc. – WhatsApp-Benachrichtigungen (optionale Funktion)`,
    contentEn: `We only share your data with third parties where required for contract fulfillment or where you have given explicit consent. Our processors are contractually obligated to comply with GDPR:\n\n• Stripe Inc. – payment processing and escrow accounts (Privacy Policy: stripe.com/privacy)\n• Supabase Inc. – database hosting on EU servers (Privacy Policy: supabase.com/privacy)\n• Vercel Inc. – serverless hosting (SCCs in place for US transfers)\n• Twilio Inc. – WhatsApp notifications (optional feature)`,
  },
  {
    id: "cookies",
    de: "6. Cookies & Tracking",
    en: "6. Cookies & Tracking",
    contentDe: `Wir verwenden nur technisch notwendige Cookies, die für den Betrieb der Website unerlässlich sind, wie z.B. Session-Cookies für die Benutzeranmeldung. Wir verzichten vollständig auf Tracking-Cookies, Analyse-Tools von Drittanbietern (z.B. Google Analytics) und Werbecookies.\n\nSie können Cookies in Ihren Browsereinstellungen jederzeit deaktivieren. Dies kann jedoch die Funktionalität der Website einschränken.`,
    contentEn: `We only use technically necessary cookies that are essential for the operation of the website, such as session cookies for user login. We completely refrain from using tracking cookies, third-party analytics tools (e.g. Google Analytics), and advertising cookies.\n\nYou can disable cookies in your browser settings at any time. However, this may limit the functionality of the website.`,
  },
  {
    id: "rights",
    de: "7. Ihre Rechte (Auskunft, Löschung, Widerruf)",
    en: "7. Your Rights (Access, Deletion, Revocation)",
    contentDe: `Sie haben jederzeit das Recht auf:\n\n• Auskunft (Art. 15 DSGVO): unentgeltliche Auskunft über Herkunft, Empfänger und Zweck Ihrer gespeicherten Daten\n• Berichtigung (Art. 16 DSGVO): Korrektur unrichtiger Daten\n• Löschung (Art. 17 DSGVO): Löschung Ihrer Daten, sofern keine Aufbewahrungspflichten entgegenstehen\n• Einschränkung (Art. 18 DSGVO): Einschränkung der Verarbeitung Ihrer Daten\n• Datenübertragbarkeit (Art. 20 DSGVO): Herausgabe Ihrer Daten in maschinenlesbarem Format\n• Widerruf (Art. 7 Abs. 3 DSGVO): Widerruf erteilter Einwilligungen mit Wirkung für die Zukunft\n• Beschwerde (Art. 77 DSGVO): Beschwerde bei der zuständigen Aufsichtsbehörde (Berliner Beauftragte für Datenschutz und Informationsfreiheit)\n\nRichten Sie Ihre Anfragen bitte an: datenschutz@heimstadt.de`,
    contentEn: `You have the right at any time to:\n\n• Access (Art. 15 GDPR): receive free information about the origin, recipient, and purpose of your stored data\n• Rectification (Art. 16 GDPR): correction of inaccurate data\n• Erasure (Art. 17 GDPR): deletion of your data, provided no retention obligations apply\n• Restriction (Art. 18 GDPR): restriction of processing your data\n• Data portability (Art. 20 GDPR): receive your data in machine-readable format\n• Withdrawal (Art. 7(3) GDPR): revoke granted consent with effect for the future\n• Complaint (Art. 77 GDPR): lodge a complaint with the competent supervisory authority (Berlin Commissioner for Data Protection and Freedom of Information)\n\nPlease direct your requests to: datenschutz@heimstadt.de`,
  },
  {
    id: "security",
    de: "8. Datensicherheit",
    en: "8. Data Security",
    contentDe: `Wir setzen technische und organisatorische Sicherheitsmaßnahmen ein, um Ihre Daten gegen zufällige oder vorsätzliche Manipulationen, Verlust, Zerstörung oder den Zugriff unberechtigter Personen zu schützen. Dazu gehören:\n\n• TLS/SSL-Verschlüsselung für alle Datenübertragungen\n• AES-256-Verschlüsselung für alle gespeicherten Dokumente\n• Regelmäßige Sicherheitsaudits und Penetrationstests\n• Rollenbasierte Zugangskontrolle (nur autorisierte Mitarbeiter können auf Dokumente zugreifen)\n• Automatische Löschroutinen für abgelaufene Dokumente`,
    contentEn: `We implement technical and organizational security measures to protect your data against accidental or intentional manipulation, loss, destruction, or access by unauthorized persons. These include:\n\n• TLS/SSL encryption for all data transmissions\n• AES-256 encryption for all stored documents\n• Regular security audits and penetration testing\n• Role-based access control (only authorized staff can access documents)\n• Automatic deletion routines for expired documents`,
  },
];

export default function DatenschutzPage() {
  const { language, t } = useLanguage();

  return (
    <>
      <main className="flex-grow bg-background">
        {/* Hero Header */}
        <div className="bg-gradient-to-br from-[#1a2e4a] via-primary-container to-[#0d3b6e] py-16 px-5">
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
                  {t("datenschutz_premiumHousingPlatform")}
                </span>
              </div>
            </div>

            <h1 className="text-[32px] md:text-[42px] font-black text-white leading-tight">
              {t("datenschutz_privacyPolicyGdpr")}
            </h1>
            <p className="mt-3 text-white/70 text-[15px] max-w-xl leading-relaxed">
              {t("datenschutz_yourPrivacyMattersToUsLearnHow")}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-white text-[12px] font-semibold">
                <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                {t("datenschutz_lastUpdatedJune212026")}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-white text-[12px] font-semibold">
                <span className="material-symbols-outlined text-[14px]">shield</span>
                DSGVO / GDPR
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-white text-[12px] font-semibold">
                <span className="material-symbols-outlined text-[14px]">lock</span>
                {t("datenschutz_serversInGermany")}
              </span>
            </div>
          </div>
        </div>

        {/* Table of Contents */}
        <div className="max-w-[800px] mx-auto px-5 py-10">
          <div className="bg-white border border-outline-variant rounded-2xl p-6 mb-10 shadow-sm">
            <h2 className="text-[13px] font-black text-primary uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">format_list_bulleted</span>
              {t("datenschutz_tableOfContents")}
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
            {sections.map((s) => (
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
                      className="text-[15px] text-on-surface-variant leading-relaxed mb-3 last:mb-0 whitespace-pre-line"
                    >
                      {para}
                    </p>
                  ))}
              </section>
            ))}
          </div>

          {/* Contact note */}
          <div className="mt-10 p-6 bg-primary/5 border border-primary/20 rounded-2xl flex gap-4 items-start">
            <span className="material-symbols-outlined text-primary text-[24px] flex-shrink-0 mt-0.5">
              privacy_tip
            </span>
            <div>
              <p className="text-[14px] font-bold text-primary mb-1">
                {t("datenschutz_questionsAboutDataPrivacy")}
              </p>
              <p className="text-[13px] text-on-surface-variant leading-relaxed">
                {t("datenschutz_ourDataProtectionOfficerIsAvai")}
                <a
                  href="mailto:dpo@heimstadt.de"
                  className="text-primary font-semibold hover:underline"
                >
                  dpo@heimstadt.de
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
