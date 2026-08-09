import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import { AppIntro } from "@/components/app-intro";
import { EskulChatbot } from "@/components/eskul-chatbot";
import "./globals.css";

const displayFont = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const bodyFont = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "EXISEL — Ekstrakurikuler & Presensi SMKN 69 Jakarta (NAMSEL)",
    template: "%s | EXISEL SMKN 69 Jakarta",
  },
  description:
    "Portal resmi pendaftaran ekstrakurikuler, presensi digital, dan monitoring keaktifan siswa SMK Negeri 69 Jakarta (NAMSEL). Temukan eskul pilihanmu dan pantau kehadiran harian secara real-time.",
  keywords: [
    "SMKN 69 Jakarta",
    "SMKN 69",
    "NAMSEL",
    "eskul SMKN 69 Jakarta",
    "ekstrakurikuler SMKN 69 Jakarta",
    "presensi SMKN 69 Jakarta",
    "kehadiran SMKN 69 Jakarta",
    "EXISEL",
    "eskul namsel",
    "pendaftaran eskul SMKN 69",
    "SMK Negeri 69 Jakarta Timur",
  ],
  authors: [{ name: "SMK Negeri 69 Jakarta" }],
  creator: "SMK Negeri 69 Jakarta (NAMSEL)",
  publisher: "SMKN 69 Jakarta",
  openGraph: {
    title: "EXISEL — Ekstrakurikuler & Presensi SMKN 69 Jakarta (NAMSEL)",
    description:
      "Portal resmi pendaftaran ekstrakurikuler, presensi digital, dan monitoring keaktifan siswa SMK Negeri 69 Jakarta (NAMSEL).",
    url: "/",
    siteName: "EXISEL SMKN 69 Jakarta",
    locale: "id_ID",
    type: "website",
    images: [
      {
        url: "/og.webp",
        width: 1200,
        height: 630,
        alt: "EXISEL — Ekstrakurikuler & Presensi SMKN 69 Jakarta (NAMSEL)",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "EXISEL — Ekstrakurikuler SMKN 69 Jakarta (NAMSEL)",
    description:
      "Portal resmi pendaftaran ekskul & presensi siswa SMKN 69 Jakarta (NAMSEL).",
    images: ["/og.webp"],
  },
  other: {
    "geo.region": "ID-JK",
    "geo.placename": "Jakarta Timur, DKI Jakarta",
    "geo.position": "-6.1852;106.9458",
    ICBM: "-6.1852, 106.9458",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "EducationalOrganization",
      "@id": "https://exisel.smkn69jakarta.sch.id/#organization",
      name: "SMK Negeri 69 Jakarta (NAMSEL)",
      alternateName: ["SMKN 69 Jakarta", "NAMSEL", "Enam Sembilan"],
      url: "https://exisel.smkn69jakarta.sch.id",
      logo: "https://exisel.smkn69jakarta.sch.id/logo-smkn69.webp",
      address: {
        "@type": "PostalAddress",
        streetAddress: "Jl. Swadaya No. 69, Jatinegara",
        addressLocality: "Cakung, Jakarta Timur",
        addressRegion: "DKI Jakarta",
        postalCode: "13930",
        addressCountry: "ID",
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: -6.1852,
        longitude: 106.9458,
      },
    },
    {
      "@type": "WebApplication",
      "@id": "https://exisel.smkn69jakarta.sch.id/#webapp",
      name: "EXISEL — Ekstrakurikuler & Presensi SMKN 69 Jakarta",
      applicationCategory: "EducationalApplication",
      operatingSystem: "All",
      browserRequirements: "Requires JavaScript",
      description:
        "Portal resmi pendaftaran ekstrakurikuler dan presensi digital siswa SMKN 69 Jakarta (NAMSEL).",
      author: {
        "@id": "https://exisel.smkn69jakarta.sch.id/#organization",
      },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="id"
      className={`${displayFont.variable} ${bodyFont.variable}`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body suppressHydrationWarning>
        <script
          id="json-ld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <AppIntro />
        {children}
        <EskulChatbot />
      </body>
    </html>
  );
}
