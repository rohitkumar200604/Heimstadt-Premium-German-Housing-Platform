"use client";

import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="w-full bg-surface-container-lowest border-t border-outline-variant">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-[24px] px-5 md:px-[48px] py-12 max-w-[1280px] mx-auto">
        {/* Brand */}
        <div className="flex flex-col gap-4">
          <Link
            href="/"
            className="hover:opacity-90 transition-opacity flex items-center"
          >
            <img
              src="/logo.jpg"
              alt="Heimstadt"
              className="h-10 md:h-12 w-auto object-contain"
            />
          </Link>
          <p className="text-on-surface-variant text-[16px] leading-6">
            {t("footerText")}
          </p>
        </div>

        {/* Unternehmen */}
        <div className="flex flex-col gap-4">
          <h4 className="text-label-md text-primary uppercase tracking-wider font-bold">
            {t("company")}
          </h4>
          <Link
            href="#"
            className="text-on-surface-variant text-[16px] hover:underline decoration-secondary transition-all"
          >
            {t("aboutUs")}
          </Link>
          <Link
            href="#"
            className="text-on-surface-variant text-[16px] hover:underline decoration-secondary transition-all"
          >
            {t("careers")}
          </Link>
          <Link
            href="#"
            className="text-on-surface-variant text-[16px] hover:underline decoration-secondary transition-all"
          >
            {t("contact")}
          </Link>
        </div>

        {/* Städte */}
        <div className="flex flex-col gap-4">
          <h4 className="text-label-md text-primary uppercase tracking-wider font-bold">
            {t("cities")}
          </h4>
          <Link
            href="/suche?stadt=Berlin"
            className="text-on-surface-variant text-[16px] hover:underline decoration-secondary transition-all"
          >
            Berlin
          </Link>
          <Link
            href="/suche?stadt=München"
            className="text-on-surface-variant text-[16px] hover:underline decoration-secondary transition-all"
          >
            München
          </Link>
          <Link
            href="/suche?stadt=Hamburg"
            className="text-on-surface-variant text-[16px] hover:underline decoration-secondary transition-all"
          >
            Hamburg
          </Link>
          <Link
            href="/suche?stadt=Köln"
            className="text-on-surface-variant text-[16px] hover:underline decoration-secondary transition-all"
          >
            Köln
          </Link>
        </div>

        {/* Rechtliches */}
        <div className="flex flex-col gap-4">
          <h4 className="text-label-md text-primary uppercase tracking-wider font-bold">
            {t("legal")}
          </h4>
          <Link
            href="/impressum"
            className="text-on-surface-variant text-[16px] hover:underline decoration-secondary transition-all"
          >
            {t("imprint")}
          </Link>
          <Link
            href="/datenschutz"
            className="text-on-surface-variant text-[16px] hover:underline decoration-secondary transition-all"
          >
            {t("privacy")}
          </Link>
          <Link
            href="/agb"
            className="text-on-surface-variant text-[16px] hover:underline decoration-secondary transition-all"
          >
            {t("terms")}
          </Link>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="max-w-[1280px] mx-auto px-5 md:px-[48px] py-6 border-t border-outline-variant flex flex-col sm:flex-row justify-between items-center gap-4">
        <p className="text-on-surface-variant text-[12px] font-semibold">
          {t("rightsReserved")}
        </p>
      </div>
    </footer>
  );
}
