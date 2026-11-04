"use client";

import { useEffect, useState } from "react";

type Props = { initialRequest: string; publicShopping?: boolean };
const ACCEPTED = new Set(["image/jpeg","image/png","image/webp","video/mp4","video/webm"]);
const MAX_FILES = 8;
const MAX_BYTES = 25 * 1024 * 1024;

/** Media stays on this device. Never imply previews are searched or recognized. */
export function VehicleMediaSearch({ initialRequest, publicShopping = false }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<Array<{ file: File; url: string }>>([]);
  const [error, setError] = useState("");
  const [request, setRequest] = useState(initialRequest);

  useEffect(() => {
    const items = files.map(file => ({ file, url: URL.createObjectURL(file) }));
    setPreviews(items);
    return () => items.forEach(item => URL.revokeObjectURL(item.url));
  }, [files]);

  function selectFiles(next: FileList | null) {
    if (!next?.length) return;
    const additions = Array.from(next);
    if (additions.some(file => !ACCEPTED.has(file.type))) {
      setError("Only JPG, PNG, WebP, MP4 and WebM files are supported.");
      return;
    }
    if (additions.some(file => file.size > MAX_BYTES)) {
      setError("Each file must be 25 MB or smaller.");
      return;
    }
    if (files.length + additions.length > MAX_FILES) {
      setError("You can preview up to 8 files. Remove some before adding more.");
      return;
    }
    setError("");
    setFiles(current => [...current, ...additions]);
  }

  return (
    <form method="get" className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6">
      <label htmlFor="vehicle-request" className="block text-sm font-bold">What kind of vehicle are you looking for?</label>
      <textarea id="vehicle-request" name="request" required minLength={4} maxLength={1200} rows={3}
        value={request} onChange={event => setRequest(event.target.value)}
        placeholder="Example: white V6 pickup, under 90,000 miles"
        className="mt-3 w-full rounded-xl border border-white/20 bg-[#101922] p-4 text-white placeholder:text-slate-500" />
      <div className="mt-5 rounded-2xl border border-dashed border-white/20 bg-black/20 p-4">
        <label htmlFor="vehicle-media" className="block text-sm font-bold text-amber-200">Vehicle photos or short videos (up to 8)</label>
        <p className="mt-1 text-xs leading-5 text-slate-400">
          Add multiple reference photos or videos to view them together on this device. Media recognition and upload are not enabled. Only the written description is searched.
        </p>
        <input id="vehicle-media" type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
          onChange={event => { selectFiles(event.target.files); event.target.value = ""; }}
          className="mt-3 block w-full text-xs text-slate-200 file:mr-3 file:rounded-full file:border-0 file:bg-amber-300 file:px-4 file:py-2 file:font-bold file:text-black" />
        {error && <p role="alert" className="mt-2 text-xs text-red-300">{error}</p>}
        {files.length > 0 && <div className="mt-3">
          <p className="mb-3 text-xs text-slate-400">{files.length} of {MAX_FILES} local previews. Nothing is uploaded or analyzed.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {previews.map(({file,url}, index) => <div key={url} className="rounded-xl border border-white/10 bg-black/30 p-3">
              {file.type.startsWith("image/") ? <img src={url} alt={`Reference photo ${index + 1}`} className="max-h-52 w-full rounded-lg object-contain" />
                : <video src={url} controls preload="metadata" className="max-h-52 w-full rounded-lg" />}
              <p className="mt-2 truncate text-xs text-slate-400" title={file.name}>{file.name}</p>
              <button type="button" onClick={() => setFiles(current => current.filter((_,i) => i !== index))}
                className="mt-2 text-xs font-bold text-amber-200 underline">Remove</button>
            </div>)}
          </div>
        </div>}
      </div>
      <button type="submit" className="mt-5 rounded-full bg-amber-300 px-6 py-3 text-sm font-black text-black">{publicShopping ? "Search by description" : "Find local sales opportunities"}</button>
    </form>
  );
}
