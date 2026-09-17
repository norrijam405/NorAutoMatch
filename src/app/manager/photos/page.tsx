import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { deactivateLotPhoto, moveLotPhoto, setCoverPhoto, uploadLotPhoto } from "./actions";

export const metadata: Metadata = {
  title: "Lot Photo Desk",
  description: "Restricted NorAuto Match lot-photo operator workbench.",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/;
const BUCKET = "vehicle-lot-photos";

export default async function LotPhotoDesk({ searchParams }: { searchParams: Promise<{ vin?: string }> }) {
  const params = await searchParams;
  const vin = String(params.vin ?? "").trim().toUpperCase();
  const validVin = VIN_RE.test(vin);
  const supabase = await createClient();

  const { data: photos = [], error } = validVin
    ? await supabase
        .from("vehicle_photo_overrides")
        .select("id,vin,storage_path,sort_order,is_cover,active,created_at")
        .eq("vin", vin)
        .order("active", { ascending: false })
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true })
    : { data: [], error: null };

  if (error) throw error;

  const activePhotos = photos.filter((photo) => photo.active);
  const inactivePhotos = photos.filter((photo) => !photo.active);

  return (
    <main className="min-h-[72vh] border-b border-white/5 bg-slate-950/35 py-12 sm:py-16">
      <div className="shell">
        <Link href="/manager" className="text-sm font-bold text-amber-300 hover:text-amber-200">← Manager workbench</Link>
        <div className="mt-6 max-w-3xl">
          <p className="eyebrow">Restricted operator surface</p>
          <h1 className="mt-4 text-4xl font-black tracking-[-.04em] text-white sm:text-5xl">Lot photo desk</h1>
          <p className="mt-5 text-base leading-7 text-slate-400">
            Attach real lot photos to a specific VIN, control display order, choose one cover image, and deactivate bad or outdated photos without deleting the audit trail.
          </p>
        </div>

        <form method="get" className="mt-8 flex max-w-2xl flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:flex-row">
          <input
            name="vin"
            defaultValue={vin}
            placeholder="Enter 17-character VIN"
            maxLength={17}
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-950 px-4 py-3 font-mono text-sm uppercase text-white outline-none ring-amber-300/30 focus:ring-2"
          />
          <button className="rounded-xl bg-amber-300 px-5 py-3 text-sm font-black text-slate-950 hover:bg-amber-200">Load vehicle</button>
        </form>

        {vin && !validVin ? <p className="mt-3 text-sm font-semibold text-rose-300">That VIN is not valid. Use 17 letters/numbers and omit I, O, and Q.</p> : null}

        {validVin ? (
          <>
            <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[.18em] text-amber-300">Vehicle</p>
                  <h2 className="mt-2 font-mono text-lg font-black text-white">{vin}</h2>
                </div>
                <Link href={`/vehicles/${vin}`} className="text-sm font-bold text-amber-300 hover:text-amber-200">Open customer vehicle page →</Link>
              </div>

              <form action={uploadLotPhoto} className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]">
                <input type="hidden" name="vin" value={vin} />
                <input
                  type="file"
                  name="photo"
                  required
                  accept="image/jpeg,image/png,image/webp"
                  className="rounded-xl border border-dashed border-white/15 bg-slate-950/70 px-4 py-3 text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:font-bold file:text-white"
                />
                <button className="rounded-xl bg-amber-300 px-5 py-3 text-sm font-black text-slate-950 hover:bg-amber-200">Upload photo</button>
              </form>
              <p className="mt-2 text-xs text-slate-500">JPG, PNG, or WebP. Maximum 12 MB. The first active photo becomes the cover automatically.</p>
            </section>

            <section className="mt-8">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-2xl font-black text-white">Active photos</h2>
                <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-slate-400">{activePhotos.length}</span>
              </div>

              {activePhotos.length ? (
                <div className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {activePhotos.map((photo, index) => {
                    const { data } = supabase.storage.from(BUCKET).getPublicUrl(photo.storage_path);
                    return (
                      <article key={photo.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
                        <div className="aspect-[4/3] bg-slate-900">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={data.publicUrl} alt={`Lot photo ${index + 1} for ${vin}`} className="h-full w-full object-cover" />
                        </div>
                        <div className="p-4">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-xs font-bold text-slate-500">Position {index + 1}</span>
                            {photo.is_cover ? <span className="rounded-full bg-amber-300 px-2.5 py-1 text-[11px] font-black text-slate-950">COVER</span> : null}
                          </div>
                          <div className="mt-4 grid grid-cols-2 gap-2">
                            <form action={moveLotPhoto}>
                              <input type="hidden" name="vin" value={vin} />
                              <input type="hidden" name="photoId" value={photo.id} />
                              <input type="hidden" name="direction" value="up" />
                              <button disabled={index === 0} className="w-full rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-30">Move up</button>
                            </form>
                            <form action={moveLotPhoto}>
                              <input type="hidden" name="vin" value={vin} />
                              <input type="hidden" name="photoId" value={photo.id} />
                              <input type="hidden" name="direction" value="down" />
                              <button disabled={index === activePhotos.length - 1} className="w-full rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-30">Move down</button>
                            </form>
                            {!photo.is_cover ? (
                              <form action={setCoverPhoto}>
                                <input type="hidden" name="vin" value={vin} />
                                <input type="hidden" name="photoId" value={photo.id} />
                                <button className="w-full rounded-lg border border-amber-300/30 px-3 py-2 text-xs font-bold text-amber-300">Make cover</button>
                              </form>
                            ) : <div />}
                            <form action={deactivateLotPhoto}>
                              <input type="hidden" name="vin" value={vin} />
                              <input type="hidden" name="photoId" value={photo.id} />
                              <button className="w-full rounded-lg border border-rose-400/20 px-3 py-2 text-xs font-bold text-rose-300">Deactivate</button>
                            </form>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">No active lot photos for this VIN yet.</div>
              )}
            </section>

            {inactivePhotos.length ? (
              <section className="mt-10">
                <h2 className="text-lg font-black text-slate-300">Inactive history</h2>
                <div className="mt-3 space-y-2">
                  {inactivePhotos.map((photo) => <div key={photo.id} className="rounded-xl border border-white/5 px-4 py-3 font-mono text-xs text-slate-600">{photo.storage_path}</div>)}
                </div>
              </section>
            ) : null}
          </>
        ) : null}
      </div>
    </main>
  );
}
