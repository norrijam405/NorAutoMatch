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
    "Independent, salesperson-operated vehicle matching for Oklahoma City drivers, with final vehicle sales completed through Orr Nissan West or another approved licensed selling dealership.",
  openGraph: {
    title: "NorAuto Match | Tell me the number. I’ll find the car.",
    description: "Payment-first vehicle matching with a direct salesperson in the Oklahoma City metro.",
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
    "@type": "WebSite",
    name: brand.name,
    url: brand.baseUrl,
    description: "Independent payment-first vehicle matching for drivers in the Oklahoma City metro.",
    about: { "@type": "Service", name: "Personal vehicle matching" },
    publisher: {
      "@type": "Organization",
      name: brand.name,
      url: brand.baseUrl,
    },
    provider: {
      "@type": "Person",
      name: "NorAuto Match salesperson",
      affiliation: {
        "@type": "AutoDealer",
        name: brand.dealer.name,
        url: brand.dealer.url,
      },
    },
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
