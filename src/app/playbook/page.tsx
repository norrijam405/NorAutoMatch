import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Internal documentation",
  robots: { index: false, follow: false, nocache: true },
};

export default function PlaybookPage() {
  notFound();
}
