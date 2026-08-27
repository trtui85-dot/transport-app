import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic, El_Messiri, JetBrains_Mono } from "next/font/google";
import { LanguageProvider } from "@/components/language-provider";
import "./globals.css";

const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-ibm-plex-sans-arabic",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const elMessiri = El_Messiri({
  variable: "--font-el-messiri",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Transport App",
  description: "نظام إدارة شركات النقل البري",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0B1220",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${ibmPlexSansArabic.variable} ${elMessiri.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-dvh antialiased">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
