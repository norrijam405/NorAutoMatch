import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Videos",
  description: "NorAutoMatch vehicle walkarounds, shopping explainers, and customer education videos.",
};

export default async function VideosPage() {
  const supabase = await createClient();
  const { data: videos } = await supabase
    .from("video_hub_entries")
    .select("id,title,summary,canonical_url,vehicle_vins,topics,channels,created_at")
    .eq("visibility", "PUBLIC")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <section className="min-h-[72vh] border-b border-white/5 bg-slate-950/35 py-14 sm:py-18">
      <div className="shell">
        <p className="eyebrow">NorAutoMatch video library</p>
        <h1 className="mt-4 text-4xl font-black tracking-[-.04em] text-white sm:text-5xl">Watch before you shop</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400">
          Vehicle walkarounds, comparisons, trade tips, and other customer education from one canonical library.
        </p>
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {(videos ?? []).map((video) => (
            <article key={video.id} className="rounded-3xl border border-white/10 bg-white/[.03] p-5">
              <p className="text-[10px] font-black uppercase tracking-[.14em] text-amber-300">Video</p>
              <h2 className="mt-2 text-xl font-black text-white">{video.title}</h2>
              {video.summary ? <p className="mt-3 text-sm leading-6 text-slate-400">{video.summary}</p> : null}
              <a href={video.canonical_url} target="_blank" rel="noreferrer" className="mt-5 inline-block text-sm font-black text-amber-300 hover:text-amber-200">Watch video ↗</a>
              <div className="mt-4 flex flex-wrap gap-2">
                {(video.topics ?? []).slice(0, 6).map((topic) => <span key={topic} className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[.12em] text-slate-500">{topic}</span>)}
              </div>
            </article>
          ))}
          {!videos?.length ? <div className="rounded-3xl border border-white/10 bg-white/[.03] p-6 text-sm text-slate-500">No public videos yet.</div> : null}
        </div>
      </div>
    </section>
  );
}
