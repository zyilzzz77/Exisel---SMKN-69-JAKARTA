import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
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
  title: "EXISEL — Temukan Ekskulmu",
  description:
    "Cari, bandingkan, dan daftar ekstrakurikuler sekolah dengan mudah melalui EXISEL.",
  keywords: ["ekstrakurikuler", "sekolah", "pendaftaran siswa", "EXISEL"],
  openGraph: {
    title: "EXISEL — Temukan Ekskulmu. Tumbuh Bareng.",
    description:
      "Delapan pilihan ekstrakurikuler, jadwal transparan, dan pendaftaran dalam satu tempat.",
    locale: "id_ID",
    type: "website",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "EXISEL — Temukan Ekskulmu",
    description: "Temukan ekskulmu. Tumbuh bareng.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${displayFont.variable} ${bodyFont.variable}`}>
      <body suppressHydrationWarning>
        {children}
        <EskulChatbot />
      </body>
    </html>
  );
}
