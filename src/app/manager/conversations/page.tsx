import type { Metadata } from "next";
import Link from "next/link";
import { ConversationResponseDesk } from "@/components/manager/conversation-response-desk";

export const metadata: Metadata = {
  title: "Conversation Response Desk",
  description: "Restricted NorAuto Match conversation-response workbench.",
  robots: { index: false, follow: false, nocache: true },
};

export default function ConversationResponsePage() {
  return (
    <section className="min-h-[72vh] border-b border-white/5 bg-slate-950/35 py-16 sm:py-20">
      <div className="shell">
        <div className="max-w-3xl">
          <p className="eyebrow">Restricted operator surface</p>
          <h1 className="mt-4 text-4xl font-black tracking-[-.04em] text-white sm:text-5xl">Conversation response desk</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-400">
            See authorized conversation events in the order that needs attention, preserve what the customer already asked, and work toward the two-to-three minute response target without inventing contact, inventory, payment, appointment, or sale state.
          </p>
          <div className="mt-5 flex flex-wrap gap-4 text-sm font-bold">
            <Link href="/manager" className="text-amber-300 hover:text-amber-200">← Manager review</Link>
            <Link href="/manager/follow-up" className="text-amber-300 hover:text-amber-200">Follow-up desk →</Link>
          </div>
        </div>
        <ConversationResponseDesk />
      </div>
    </section>
  );
}
