"use client";

import { useState } from "react";

type Props = {
  vehicle: { vin: string; year: number; make: string; model: string; trim: string; price: number; mileage?: number; condition?: string };
};

const money = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function VehiclePriceCheck({ vehicle }: Props) {
  const [otherPrice, setOtherPrice] = useState("");
  const [otherMileage, setOtherMileage] = useState("");
  const [otherTrim, setOtherTrim] = useState("");
  const [otherUrl, setOtherUrl] = useState("");
  const price = Number(otherPrice);
  const validPrice = otherPrice.trim() !== "" && Number.isFinite(price) && price > 0 && price <= 10_000_000;
  const difference = vehicle.price - price;
  const mileage = Number(otherMileage);
  const mileageValid = otherMileage.trim() !== "" && Number.isFinite(mileage) && mileage >= 0 && mileage <= 1_000_000;
  const comparableMileage = vehicle.mileage !== undefined && mileageValid;
  const [notice, setNotice] = useState("");

  function copyReview() {
    const details = [
      "NorAutoMatch PriceCheck — customer-supplied comparison (NOT independently verified)",
      "Our VIN: " + vehicle.vin,
      "Our vehicle: " + [vehicle.year, vehicle.make, vehicle.model, vehicle.trim].join(" "),
      "Our advertised price: " + money(vehicle.price),
      "Other advertised price: " + (validPrice ? money(price) : "Not supplied"),
      "Other trim: " + (otherTrim.trim() || "Not supplied"),
      "Other mileage: " + (mileageValid ? mileage.toLocaleString() + " mi" : "Not supplied"),
      "Other listing: " + (otherUrl.trim() || "Not supplied"),
      "Please verify the competing listing, equipment, history, condition, fees and final out-the-door pricing; this is not a price-match offer."
    ].join("\n");
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(details).then(() => setNotice("Comparison copied. You can share it with a salesperson."), () => setNotice("Copy unavailable. Please select the information manually."));
    } else {
      setNotice("Clipboard unavailable in this browser.");
    }
  }

  return <section id="pricecheck" className="mt-8 rounded-[28px] border border-amber-300/25 bg-[#101820] p-6 text-white sm:p-8">
    <p className="text-[10px] font-black uppercase tracking-[.23em] text-amber-300">No sign-in required · PriceCheck</p>
    <h2 className="mt-2 text-3xl font-black">Found a better advertised price?</h2>
    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Compare another listing with this exact vehicle. We will show the price difference, not promise a price match. Your entries stay in this browser and are not automatically submitted.</p>
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <p className="text-xs font-bold text-slate-400">This vehicle · VIN verified from dealer source</p>
        <p className="mt-2 text-2xl font-black text-amber-300">{money(vehicle.price)}</p>
        <p className="mt-1 text-xs text-slate-400">{vehicle.year} {vehicle.make} {vehicle.model} {vehicle.trim}</p>
        <p className="mt-1 text-xs text-slate-400">{vehicle.mileage === undefined ? "Mileage not supplied" : vehicle.mileage.toLocaleString() + " miles"} · {vehicle.condition ?? "Condition not specified"}</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <label htmlFor="comparison-price" className="block text-xs font-bold text-slate-200">Other advertised price ($)</label>
        <input id="comparison-price" type="number" min="1" max="10000000" step="1" value={otherPrice} onChange={(event) => setOtherPrice(event.target.value)} placeholder="Example: 24500" className="mt-2 w-full rounded-xl border border-white/20 bg-[#0b1219] px-4 py-3 text-white" />
        <label htmlFor="comparison-mileage" className="mt-3 block text-xs font-bold text-slate-200">Other vehicle mileage (optional)</label>
        <input id="comparison-mileage" type="number" min="0" max="1000000" step="1" value={otherMileage} onChange={(event) => setOtherMileage(event.target.value)} placeholder="Example: 32000" className="mt-2 w-full rounded-xl border border-white/20 bg-[#0b1219] px-4 py-3 text-white" />
        <label htmlFor="comparison-trim" className="mt-3 block text-xs font-bold text-slate-200">Other trim (optional)</label>
        <input id="comparison-trim" type="text" maxLength={80} value={otherTrim} onChange={(event) => setOtherTrim(event.target.value)} placeholder="Example: SV AWD" className="mt-2 w-full rounded-xl border border-white/20 bg-[#0b1219] px-4 py-3 text-white" />
        <label htmlFor="comparison-url" className="mt-3 block text-xs font-bold text-slate-200">Competing listing link (optional)</label>
        <input id="comparison-url" type="url" maxLength={1000} value={otherUrl} onChange={(event) => setOtherUrl(event.target.value)} placeholder="https://..." className="mt-2 w-full rounded-xl border border-white/20 bg-[#0b1219] px-4 py-3 text-white" />
      </div>
    </div>
    {validPrice && <div role="status" className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Advertised price difference only</p>
      <p className="mt-2 text-3xl font-black text-white">{money(Math.abs(difference))}</p>
      <p className="mt-2 text-sm text-slate-300">{difference > 0 ? "The other advertised price is lower." : difference < 0 ? "This vehicle's advertised price is lower." : "Both advertised prices are equal."}</p>
      <p className="mt-2 text-xs text-amber-200">{comparableMileage ? "Mileage difference: " + Math.abs(vehicle.mileage! - mileage).toLocaleString() + " miles. " : "Mileage comparison is not available. "}Year, trim, condition, equipment, accident history and fees may change which deal is better.</p>
    </div>}
    <p className="mt-5 text-xs leading-5 text-slate-400">Competing details are customer-entered and unverified. Advertised prices are not out-the-door offers. No price-match guarantee, inventory hold or financing approval is implied.</p>
    <button type="button" onClick={copyReview} disabled={!validPrice} className="mt-4 rounded-full bg-amber-300 px-6 py-3 text-sm font-black text-black disabled:cursor-not-allowed disabled:opacity-40">Copy comparison for salesperson review</button>
    {notice && <p role="status" className="mt-2 text-xs text-slate-300">{notice}</p>}
  </section>;
}
