import type { Metadata } from "next";
import { Bricolage_Grotesque, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "NKEZEFUU API",
  description: "Guide d'intégration de l'API mobile NKEZEFUU : endpoints, parcours et cas de test",
  openGraph: {
    type: "website",
    url: "https://api-docs.nkezefuu.com",
    title: "NKEZEFUU API",
    description: "Guide d'intégration de l'API mobile NKEZEFUU : endpoints, parcours et cas de test",
    images: ["https://api-docs.nkezefuu.com/social-preview.jpeg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "NKEZEFUU API",
    description: "Guide d'intégration de l'API mobile NKEZEFUU : endpoints, parcours et cas de test",
    images: ["https://api-docs.nkezefuu.com/social-preview.jpeg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Sur <html> et pas <body> : les tokens :root de globals.css les referencent.
    <html lang="fr" className={`${bricolage.variable} ${plexSans.variable} ${plexMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
