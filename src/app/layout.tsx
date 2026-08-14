import type { Metadata } from "next";
import "./globals.css";
import { brand } from "@/lib/brand";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";

export const metadata: Metadata = {
  metadataBase: new URL(brand.baseUrl),
  title: {
    default: "NorAuto Match | Payment-First Car Matching in OKC",
    template: "%s | NorAuto Match",
  },
  description:
    "Tell me the monthly payment. NorAuto Match helps Oklahoma City drivers find the right car, source it across the metro, and simplify the buying process.",
  openGraph: {
    title: "NorAuto Match | Tell me the number. I’ll find the car.",
    description: "Payment-first vehicle matching and personal car sourcing across the Oklahoma City metro.",
    type: "website",
    locale: "en_US",
    images: [{ url: "/images/hero-okc.jpg", width: 1536, height: 1024, alt: "NorAuto Match in Oklahoma City" }],
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: brand.name,
    url: brand.baseUrl,
    telephone: brand.phoneRaw,
    description: "Payment-first vehicle matching and personal car sourcing across the Oklahoma City metro.",
    areaServed: brand.cities.map((name) => ({ "@type": "City", name })),
    priceRange: "$$",
  };

  return (
    <html lang="en">
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      </body>
    </html>
  );
}
