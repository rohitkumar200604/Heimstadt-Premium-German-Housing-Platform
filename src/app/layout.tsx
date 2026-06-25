import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import { LanguageProvider } from "@/context/LanguageContext";
import { AuthProvider } from "@/context/AuthContext";
import { CurrencyProvider } from "@/context/CurrencyContext";
import GlobalAlert from "@/components/common/GlobalAlert";

export const metadata: Metadata = {
  title: "Heimstadt | Exklusive Immobilien in Deutschland",
  description: "Hochwertige Mietwohnungen für internationale Studierende und Expats in Berlin, München und Hamburg. Buchen Sie vor Ihrer Ankunft.",
  icons: {
    icon: "/logo.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background text-on-surface min-h-screen flex flex-col">
        <LanguageProvider>
          <CurrencyProvider>
            <AuthProvider>
              <Navbar />
              <main className="flex-grow flex flex-col">{children}</main>
              <GlobalAlert />
            </AuthProvider>
          </CurrencyProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
