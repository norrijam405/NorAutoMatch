import type { Metadata } from "next";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Disclosures & Terms",
  description: "Plain-language disclosures for the NorAuto Match vehicle-shopping experience.",
};

export default function TermsPage() {
  return (
    <section className="py-20 sm:py-28">
      <div className="shell">
        <article className="mx-auto max-w-3xl">
          <p className="eyebrow">Plain-English disclosures</p>
          <h1 className="mt-4 text-5xl font-black tracking-[-.04em] text-white">Know what this site is—and what it is not.</h1>
          <div className="mt-10 space-y-8 text-sm leading-7 text-slate-400">
            <Disclosure title="Independent shopping experience">
              NorAuto Match is an independent, salesperson-operated shopping interface. It is not presented as the official website of {brand.dealer.name}. The operator is affiliated with {brand.dealer.name} as a salesperson.
            </Disclosure>
            <Disclosure title="Vehicle availability">
              A vehicle shown as representative inventory is an example for the matching experience and is not a claim that the vehicle is currently available. When a live inventory mode is explicitly enabled, availability still remains subject to verification and change before a transaction.
            </Disclosure>
            <Disclosure title="Payments and financing">
              Payment and buying-power figures are shopping estimates, not credit approvals or offers of credit. Actual terms depend on lender approval, credit profile, vehicle, taxes, title, registration, disclosed dealership charges, optional products, down payment, trade equity, and other transaction details.
            </Disclosure>
            <Disclosure title="Who completes the sale">
              NorAuto Match does not independently sell, finance, title, register, or deliver vehicles. Those activities are completed by {brand.dealer.name} or another approved licensed selling dealership.
            </Disclosure>
            <Disclosure title="Pricing and vehicle details">
              Prices, incentives, equipment, mileage, condition, photos, and other vehicle data can change or contain source errors. Material vehicle and transaction details must be confirmed with the licensed selling dealership before purchase.
            </Disclosure>
            <Disclosure title="Contact requests">
              Submitting a lead authorizes contact only according to the consent shown with the form. Consent is not a condition of purchase. Do not submit Social Security numbers, bank credentials, driver-license images, or credit applications through this website.
            </Disclosure>
            <Disclosure title="Questions">
              For questions about the NorAuto Match experience, call or text {brand.phoneDisplay}. For official dealership information, use the dealership contact information linked in the footer.
            </Disclosure>
          </div>
        </article>
      </div>
    </section>
  );
}

function Disclosure({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-white/10 pt-6">
      <h2 className="text-xl font-black text-white">{title}</h2>
      <p className="mt-2">{children}</p>
    </section>
  );
}
