"use client";

import { useEffect, useState } from "react";

type Props = { initialRequest: string; publicShopping?: boolean };

/**
 * Privacy-preserving media intake: local preview only. No media upload, no
 * misleading automated recognition, no inference from a filename.
 */
export function VehicleMediaSearch({ initialRequest, publicShopping = false }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [request, setRequest] = useState(initialRequest);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  function selectFile(next: File | undefined) {
    setError("");
    setFile(null);
    if (!next) return;
    if (!["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm"].includes(next.type)) {
      setError("Choose a JPG, PNG, WebP, MP4 or WebM file.");
      return;
    }
    if (next.size > 25 * 1024 * 1024) {
      setError("This file is above the 25 MB Preview limit.");
      return;
    }
    setFile(next);
  }

  return (
    <form method="get" className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6">
      <label htmlFor="vehicle-request" className="block text-sm font-bold">What does the customer need?</label>
      <textarea id="vehicle-request" name="request" required minLength={4} maxLength={1200} rows={3}
        value={request} onChange={(event) => setRequest(event.target.value)}
        placeholder="Example: white pre-owned Nissan Rogue under $30,000"
        className="mt-3 w-full rounded-xl border border-white/20 bg-[#101922] p-4 text-white placeholder:text-slate-500" />
      <div className="mt-5 rounded-2xl border border-dashed border-white/20 bg-black/20 p-4">
        <label htmlFor="vehicle-media" className="block text-sm font-bold text-amber-200">Have a vehicle photo or short video?</label>
        <p className="mt-1 text-xs leading-5 text-slate-400">
          Select a picture or video to view it here, then describe the make/model or visible clues in the request above.
          Automated image recognition is not connected yet; Torque will not guess what the file contains.
        </p>
        <input id="vehicle-media" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
          onChange={(event) => selectFile(event.target.files?.[0])}
          className="mt-3 block w-full text-xs text-slate-200 file:mr-3 file:rounded-full file:border-0 file:bg-amber-300 file:px-4 file:py-2 file:font-bold file:text-black" />
        {error && <p role="alert" className="mt-2 text-xs text-red-300">{error}</p>}
        {preview && file && <div className="mt-3 space-y-2">
          {file.type.startsWith("image/") ? <img src={preview} alt="Locally selected vehicle reference" className="max-h-64 max-w-full rounded-xl object-contain" />
            : <video src={preview} controls preload="metadata" className="max-h-64 max-w-full rounded-xl" />}
          <p className="text-xs text-slate-400">Local preview only. The media file is not sent or saved with your text search.</p>
          <button type="button" onClick={() => setFile(null)} className="text-xs font-bold text-amber-200 underline">Remove media preview</button>
        </div>}
      </div>
      <button type="submit" className="mt-5 rounded-full bg-amber-300 px-6 py-3 text-sm font-black text-black">{publicShopping ? "Find matching vehicles" : "Find local sales opportunities"}</button>
    </form>
  );
}
