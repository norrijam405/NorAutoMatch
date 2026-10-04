import type { Metadata } from "next";
import "./globals.css";
import { brand } from "@/lib/brand";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  metadataBase: new URL(brand.baseUrl),
  title: {
    default: "NorAuto Match | Car Shopping Without the Pressure",
    template: "%s | NorAuto Match",
  },
  description:
    "Independent vehicle matching for Oklahoma City drivers. Start with your budget, compare what fits, and move toward a verified vehicle match without the pressure.",
  openGraph: {
    title: "NorAuto Match | Car Shopping Without the Pressure",
    description: "Payment-first vehicle matching built to make car shopping clearer, calmer, and easier to narrow down.",
    type: "website",
    locale: "en_US",
    images: [{ url: "/images/hero-okc.jpg", width: 1536, height: 1024, alt: "NorAuto Match in Oklahoma City" }],
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = typeof data?.claims?.sub === "string" && data.claims.sub.length > 0;

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
      "@type": "Organization",
      name: brand.name,
      url: brand.baseUrl,
    },
  };

  return (
    <html lang="en">
      <body>
        <Header isAuthenticated={isAuthenticated} />
        <main>{children}</main>
        <Footer />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      </body>
    </html>
  );
}
