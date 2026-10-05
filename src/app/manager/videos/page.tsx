import type { Metadata } from "next";
import Link from "next/link";
import { requireNorAutoMembership } from "@/lib/supabase/authz";
import { createVideoHubEntry, updateVideoHubVisibility } from "./actions";

export const metadata: Metadata = {
  title: "Video Hub Manager",
  robots: { index: false, follow: false, nocache: true },
};

export default async function ManagerVideosPage() {
  const { supabase } = await requireNorAutoMembership(
    ["operator", "admin", "founder"],
    "/manager/videos",
  );

  const { data: videos } = await supabase
    .from("video_hub_entries")
    .select("id,title,summary,canonical_url,visibility,vehicle_vins,topics,channels,created_at,updated_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <section className="min-h-[72vh] border-b border-white/5 bg-slate-950/35 py-14 sm:py-18">
      <div className="shell max-w-6xl">
        <p className="eyebrow">Restricted operator surface</p>
        <h1 className="mt-4 text-4xl font-black tracking-[-.04em] text-white sm:text-5xl">Video Hub</h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-400">
          Keep one canonical NorAutoMatch record for each customer-facing video, then record where it is published. This does not auto-post to any social network.
        </p>

        <form action={createVideoHubEntry} className="mt-8 grid gap-4 rounded-3xl border border-white/10 bg-slate-900/55 p-5 sm:p-7">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Title"><input name="title" required maxLength={160} className="field" /></Field>
            <Field label="Canonical video URL"><input name="canonicalUrl" type="url" required className="field" placeholder="https://…" /></Field>
          </div>
          <Field label="Summary"><textarea name="summary" maxLength={1000} className="field min-h-24" /></Field>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Visibility">
              <select name="visibility" defaultValue="DRAFT" className="field">
                <option value="DRAFT">Draft</option>
                <option value="PUBLIC">Public</option>
                <option value="UNLISTED">Unlisted</option>
              </select>
            </Field>
            <Field label="Vehicle VINs"><textarea name="vehicleVins" className="field min-h-20" placeholder="One VIN per line or comma-separated" /></Field>
            <Field label="Topics"><textarea name="topics" className="field min-h-20" placeholder="Rogue, trade tips, walkaround" /></Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="YouTube URL"><input name="youtube" type="url" className="field" /></Field>
            <Field label="TikTok URL"><input name="tiktok" type="url" className="field" /></Field>
            <Field label="Instagram URL"><input name="instagram" type="url" className="field" /></Field>
            <Field label="Facebook URL"><input name="facebook" type="url" className="field" /></Field>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs leading-5 text-slate-500">Outbound publishing authority: NOT GRANTED. Add a social URL only after that platform actually has the video.</p>
            <button className="rounded-full bg-amber-300 px-5 py-3 text-sm font-black text-black">Save video record</button>
          </div>
        </form>

        <div className="mt-10 grid gap-4">
          {(videos ?? []).map((video) => (
            <article key={video.id} className="rounded-3xl border border-white/10 bg-white/[.03] p-5 sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[.14em] text-slate-500">
                    <span>{video.visibility}</span>
                    <span>•</span>
                    <span>{new Date(video.created_at).toLocaleString()}</span>
                  </div>
                  <h2 className="mt-2 text-xl font-black text-white">{video.title}</h2>
                  {video.summary ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{video.summary}</p> : null}
                  <a href={video.canonical_url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-black text-amber-300 hover:text-amber-200">Open canonical video ↗</a>
                </div>
                <form action={updateVideoHubVisibility} className="flex gap-2">
                  <input type="hidden" name="videoId" value={video.id} />
                  <select name="visibility" defaultValue={video.visibility} className="field min-w-32">
                    <option value="DRAFT">Draft</option>
                    <option value="PUBLIC">Public</option>
                    <option value="UNLISTED">Unlisted</option>
                  </select>
                  <button className="rounded-full border border-white/10 px-4 text-xs font-black text-white">Save</button>
                </form>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {(video.topics ?? []).map((topic) => <span key={topic} className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[.12em] text-slate-500">{topic}</span>)}
              </div>
              <p className="mt-4 text-[11px] leading-5 text-slate-600">Social links are evidence records only. NorAutoMatch did not publish them.</p>
            </article>
          ))}
          {!videos?.length ? <p className="rounded-2xl border border-white/10 bg-white/[.03] p-5 text-sm text-slate-500">No video records yet.</p> : null}
        </div>

        <div className="mt-8 flex flex-wrap gap-4 text-sm font-black">
          <Link href="/manager" className="text-amber-300 hover:text-amber-200">← Manager workbench</Link>
          <Link href="/videos" className="text-slate-400 hover:text-white">Public video library →</Link>
        </div>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label><span className="mb-2 block text-[10px] font-black uppercase tracking-[.14em] text-slate-500">{label}</span>{children}</label>;
}
